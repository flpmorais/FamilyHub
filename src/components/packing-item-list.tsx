import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { Icon, Snackbar } from 'react-native-paper';
import { logger } from '../utils/logger';
import { useStatusColours } from '../constants/status-colours';
import { usePackingStore } from '../stores/packing.store';
import {
  StatusCountPill,
  FilterPanel,
  PackingItemCard,
  PackingCompletionState,
} from './packing';
import { IconPicker } from './icon-picker';
import { useIconStore } from '../stores/icon.store';
import type { PackingItem, PackingStatus, Category, Tag } from '../types/packing.types';
import type { Profile } from '../types/profile.types';

const STATUS_LABELS: Record<PackingStatus, string> = {
  new: 'Novo',
  buy: 'Comprar',
  ready: 'Pronto',
  issue: 'Problema',
  last_minute: 'Última hora',
  packed: 'Embalado',
};
const ALL_STATUSES: PackingStatus[] = ['new', 'buy', 'issue', 'ready', 'last_minute', 'packed'];

interface PackingItemListProps {
  items: PackingItem[];
  profiles: Profile[];
  categories: Category[];
  tags: Tag[];
  vacationTitle: string;
  onCreateItem: (
    name: string,
    profileId: string | null,
    quantity: number,
    categoryId: string | null,
    iconId: string,
    isAllFamily: boolean
  ) => Promise<void>;
  onUpdateItem: (
    id: string,
    data: {
      name: string;
      assignedProfileId: string | null;
      quantity: number;
      status: PackingStatus;
      notes: string | null;
      categoryId: string | null;
      iconId: string;
      isAllFamily: boolean;
    }
  ) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: PackingStatus) => Promise<void>;
}

export function PackingItemList({
  items,
  profiles,
  categories,
  tags,
  vacationTitle,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onStatusChange,
}: PackingItemListProps) {
  const colours = useStatusColours();
  const {
    activeStatusFilters,
    activeProfileFilters,
    activeCategoryFilters,
    activeTagFilters,
    toggleStatusFilter,
    exclusiveStatusFilter,
    toggleProfileFilter,
    toggleCategoryFilter,
    toggleTagFilter,
    clearAllFilters,
  } = usePackingStore();
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);

  const { icons, resolveIconName } = useIconStore();

  // Status counts (all items, unfiltered)
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<PackingStatus, number>> = {};
    for (const item of items) {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  // Filtered items — show all when no filters active
  const filteredItems = useMemo(() => {
    const hasStatusFilter = activeStatusFilters.length > 0;
    const hasProfileFilter = activeProfileFilters.length > 0;
    const hasCategoryFilter = activeCategoryFilters.length > 0;
    const hasTagFilter = activeTagFilters.length > 0;
    if (!hasStatusFilter && !hasProfileFilter && !hasCategoryFilter && !hasTagFilter) return items;
    return items.filter((item) => {
      if (hasStatusFilter && !activeStatusFilters.includes(item.status)) return false;
      if (
        hasProfileFilter &&
        (!item.assignedProfileId || !activeProfileFilters.includes(item.assignedProfileId))
      )
        return false;
      if (
        hasCategoryFilter &&
        (!item.categoryId || !activeCategoryFilters.includes(item.categoryId))
      )
        return false;
      if (hasTagFilter && !(item.tagIds ?? []).some((tid) => activeTagFilters.includes(tid))) return false;
      return true;
    });
  }, [items, activeStatusFilters, activeProfileFilters, activeCategoryFilters, activeTagFilters]);

  // Count for filter panel "Ver N itens"
  const filteredCount = filteredItems.length;

  // Completion state
  const hasActiveFilters =
    activeStatusFilters.length > 0 ||
    activeProfileFilters.length > 0 ||
    activeCategoryFilters.length > 0 ||
    activeTagFilters.length > 0;
  const allPacked = items.length > 0 && items.every((i) => i.status === 'packed');
  const [showAllOverride, setShowAllOverride] = useState(false);
  const showCompletionState = allPacked && !hasActiveFilters && !showAllOverride;

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formProfileId, setFormProfileId] = useState<string | null>(null);
  const [formQty, setFormQty] = useState('1');
  const [formStatus, setFormStatus] = useState<PackingStatus>('new');
  const [formNotes, setFormNotes] = useState('');
  const [formCategoryId, setFormCategoryId] = useState<string | null>(null);
  const [formAllFamily, setFormAllFamily] = useState(false);
  const [formIconId, setFormIconId] = useState('');
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsedProfileId, setLastUsedProfileId] = useState<string | null>(null);

  // Success toast
  const [successMsg, setSuccessMsg] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);

  // Snackbar undo state
  const [snackVisible, setSnackVisible] = useState(false);
  const [undoInfo, setUndoInfo] = useState<{
    itemId: string;
    previousStatus: PackingStatus;
  } | null>(null);
  const [snackMessage, setSnackMessage] = useState('');

  // Status picker modal state
  const [statusPickerItem, setStatusPickerItem] = useState<PackingItem | null>(null);

  function openAdd() {
    setEditingItem(null);
    setFormName('');
    setFormProfileId(lastUsedProfileId);
    setFormQty('1');
    setFormStatus('new');
    setFormNotes('');
    const defaultCat = categories.length > 0 ? categories[0] : null;
    setFormCategoryId(defaultCat?.id ?? null);
    setFormIconId(defaultCat?.iconId ?? '');
    setFormAllFamily(false);
    setFormTagIds([]);
    setError(null);
    setSheetVisible(true);
  }

  function openEdit(item: PackingItem) {
    setEditingItem(item);
    setFormName(item.name);
    setFormProfileId(item.assignedProfileId);
    setFormQty(String(item.quantity));
    setFormStatus(item.status);
    setFormNotes(item.notes ?? '');
    setFormCategoryId(item.categoryId);
    setFormIconId(item.iconId);
    setFormAllFamily(item.isAllFamily);
    setFormTagIds([]); // TODO: load from packing_item_tags when needed
    setError(null);
    setSheetVisible(true);
  }

  function handleCategoryChange(newCategoryId: string) {
    const oldCat = categories.find((c) => c.id === formCategoryId);
    setFormCategoryId(newCategoryId);
    const newCat = categories.find((c) => c.id === newCategoryId);
    if (newCat && (!formIconId || (oldCat && formIconId === oldCat.iconId))) {
      setFormIconId(newCat.iconId);
    }
  }

  async function doSave(keepOpen: boolean) {
    const name = formName.trim();
    if (!name) {
      setError('O nome é obrigatório.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const qty = Math.max(1, parseInt(formQty, 10) || 1);
      if (editingItem) {
        await onUpdateItem(editingItem.id, {
          name,
          assignedProfileId: formAllFamily ? null : formProfileId,
          quantity: qty,
          status: formStatus,
          notes: formNotes || null,
          categoryId: formCategoryId,
          iconId: formIconId,
          isAllFamily: formAllFamily,
        });
        setSheetVisible(false);
        setSuccessMsg('Item actualizado');
        setSuccessVisible(true);
      } else {
        await onCreateItem(name, formAllFamily ? null : formProfileId, qty, formCategoryId, formIconId, formAllFamily);
        setLastUsedProfileId(formProfileId);
        setSuccessMsg('Item adicionado');
        setSuccessVisible(true);
        if (!keepOpen) {
          setSheetVisible(false);
        }
      }
    } catch (err) {
      logger.error('PackingItemList', 'handleSave failed', err);
      setError(err instanceof Error ? err.message : 'Erro ao guardar item.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleDeleteInEdit() {
    if (!editingItem) return;
    Alert.alert(`Eliminar "${editingItem.name}"?`, 'Esta acção não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await onDeleteItem(editingItem.id);
          setSheetVisible(false);
        },
      },
    ]);
  }

  async function handleStatusChange(item: PackingItem, newStatus: PackingStatus) {
    const previousStatus = item.status;
    setUndoInfo({ itemId: item.id, previousStatus });
    setSnackMessage(`Estado alterado para ${STATUS_LABELS[newStatus]}`);
    setSnackVisible(true);
    try {
      await onStatusChange(item.id, newStatus);
    } catch (err) {
      logger.error('PackingItemList', 'handleStatusChange failed', err);
    }
  }

  async function handleUndo() {
    if (!undoInfo) return;
    setSnackVisible(false);
    try {
      await onStatusChange(undoInfo.itemId, undoInfo.previousStatus);
    } catch (err) {
      logger.error('PackingItemList', 'handleUndo failed', err);
    }
    setUndoInfo(null);
  }

  function profileName(id: string | null): string {
    if (!id) return '';
    return profiles.find((p) => p.id === id)?.displayName ?? '';
  }

  function categoryName(id: string | null): string {
    if (!id) return '';
    return categories.find((c) => c.id === id)?.name ?? '';
  }

  function itemIcon(item: PackingItem): string {
    return resolveIconName(item.iconId);
  }

  const keyExtractor = useCallback((item: PackingItem) => item.id, []);

  const renderPackingItem = useCallback(
    ({ item }: { item: PackingItem }) => (
      <PackingItemCard
        item={item}
        profileName={profileName(item.assignedProfileId)}
        categoryName={categoryName(item.categoryId)}
        categoryIcon={itemIcon(item)}
        onPress={() => openEdit(item)}
        onStatusPress={() => setStatusPickerItem(item)}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profiles, categories, icons]
  );

  return (
    <View style={st.container}>
      {/* Status count pills */}
      {items.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.pillRow}
          style={st.pillScroll}
        >
          {ALL_STATUSES.filter((s) => (statusCounts[s] ?? 0) > 0).map((s) => (
            <StatusCountPill
              key={s}
              status={s}
              count={statusCounts[s] ?? 0}
              isActive={activeStatusFilters.includes(s)}
              onPress={() => exclusiveStatusFilter(s)}
            />
          ))}
        </ScrollView>
      )}

      {showCompletionState ? (
        <PackingCompletionState
          vacationTitle={vacationTitle}
          totalItems={items.length}
          onShowAll={() => setShowAllOverride(true)}
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={keyExtractor}
          renderItem={renderPackingItem}
          contentContainerStyle={st.scroll}
          ListEmptyComponent={
            items.length === 0 ? (
              <Text style={st.empty}>Lista vazia — adiciona o primeiro item</Text>
            ) : (
              <View style={st.emptyFilter}>
                <Text style={st.emptyFilterText}>Nenhum item corresponde aos filtros activos</Text>
                <TouchableOpacity onPress={clearAllFilters}>
                  <Text style={st.clearLink}>Limpar filtros</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}

      {/* FAB row */}
      <View style={st.fabRow}>
        <TouchableOpacity
          style={[st.fab, st.filterFab]}
          onPress={() => setFilterPanelVisible(!filterPanelVisible)}
          activeOpacity={0.8}
          accessibilityLabel="Filtros"
          accessibilityRole="button"
        >
          <Icon source="filter-variant" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={st.fab}
          onPress={openAdd}
          activeOpacity={0.8}
          accessibilityLabel="Adicionar item"
          accessibilityRole="button"
        >
          <Text style={st.fabText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Snackbar undo */}
      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={4000}
        action={{ label: 'Desfazer', onPress: handleUndo, textColor: '#FFFFFF' }}
        style={st.snackbar}
        theme={{ colors: { inverseSurface: '#333333', inverseOnSurface: '#FFFFFF' } }}
      >
        {snackMessage}
      </Snackbar>

      {/* Success toast */}
      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={2000}
        style={st.successSnackbar}
        theme={{ colors: { inverseSurface: '#388E3C', inverseOnSurface: '#FFFFFF' } }}
      >
        {successMsg}
      </Snackbar>

      {/* Status picker modal */}
      {statusPickerItem && (
        <Modal
          visible
          animationType="fade"
          transparent
          onRequestClose={() => setStatusPickerItem(null)}
        >
          <TouchableOpacity
            style={st.pickerOverlay}
            activeOpacity={1}
            onPress={() => setStatusPickerItem(null)}
          >
            <View style={st.pickerCard}>
              <Text style={st.pickerHeading}>Alterar estado</Text>
              <Text style={st.pickerItemName}>{statusPickerItem.name}</Text>
              <View style={st.pickerOptions}>
                {ALL_STATUSES.map((s) => {
                  const isCurrent = s === statusPickerItem.status;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[
                        st.pickerOption,
                        {
                          borderColor: colours[s].bg,
                          backgroundColor: isCurrent ? colours[s].bg : colours[s].bg + '10',
                        },
                      ]}
                      onPress={() => {
                        if (!isCurrent) {
                          handleStatusChange(statusPickerItem, s);
                        }
                        setStatusPickerItem(null);
                      }}
                    >
                      <View
                        style={[
                          st.pickerDot,
                          { backgroundColor: isCurrent ? '#FFFFFF' : colours[s].bg },
                        ]}
                      />
                      <Text
                        style={[
                          st.pickerOptionText,
                          { color: isCurrent ? '#FFFFFF' : colours[s].bg },
                        ]}
                      >
                        {STATUS_LABELS[s]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Filter panel */}
      <FilterPanel
        visible={filterPanelVisible}
        onClose={() => setFilterPanelVisible(false)}
        activeStatuses={activeStatusFilters}
        activeProfiles={activeProfileFilters}
        activeCategories={activeCategoryFilters}
        activeTags={activeTagFilters}
        profiles={profiles}
        categories={categories}
        tags={tags}
        onToggleStatus={toggleStatusFilter}
        onToggleProfile={toggleProfileFilter}
        onToggleCategory={toggleCategoryFilter}
        onToggleTag={toggleTagFilter}
        onClearAll={clearAllFilters}
        filteredCount={filteredCount}
      />

      <IconPicker
        visible={iconPickerVisible}
        icons={icons}
        selectedIconId={formIconId}
        onSelect={setFormIconId}
        onClose={() => setIconPickerVisible(false)}
      />

      {/* Add/edit modal */}
      <Modal
        visible={sheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSheetVisible(false)}
      >
        <View style={st.modalOverlay}>
          <View style={st.sheet}>
            <Text style={st.sheetTitle}>{editingItem ? 'Editar item' : 'Adicionar item'}</Text>
            <Text style={st.label}>Nome *</Text>
            <TextInput
              style={st.input}
              value={formName}
              onChangeText={setFormName}
              placeholder="ex: T-shirts"
              autoCapitalize="sentences"
              editable={!isSaving}
            />
            <View style={st.toggleRow}>
              <Text style={st.toggleLabel}>Toda a família</Text>
              <Switch
                value={formAllFamily}
                onValueChange={(v) => { setFormAllFamily(v); if (v) setFormProfileId(null); }}
                trackColor={{ true: '#B5451B' }}
                disabled={isSaving}
              />
            </View>
            {!formAllFamily && (
              <>
                <Text style={st.label}>Pessoa *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chipRow}>
                  {profiles
                    .filter((p) => p.status !== 'inactive')
                    .map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[st.chip, formProfileId === p.id && st.chipActive]}
                        onPress={() => setFormProfileId(p.id)}
                        disabled={isSaving}
                      >
                        <Text style={[st.chipText, formProfileId === p.id && st.chipTextActive]}>
                          {p.displayName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </>
            )}
            <Text style={st.label}>Quantidade</Text>
            <TextInput
              style={st.input}
              value={formQty}
              onChangeText={setFormQty}
              keyboardType="number-pad"
              editable={!isSaving}
            />
            <Text style={st.label}>Notas</Text>
            <TextInput
              style={[st.input, st.notesInput]}
              value={formNotes}
              onChangeText={setFormNotes}
              placeholder="Notas adicionais"
              multiline
              editable={!isSaving}
            />
            <Text style={st.label}>Categoria</Text>
            {categories.length === 0 ? (
              <Text style={st.noCategoriesHint}>Crie categorias nas definições</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chipRow}>
                {categories
                  .filter((c) => c.active)
                  .map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[st.chip, formCategoryId === cat.id && st.chipActive]}
                      onPress={() => handleCategoryChange(cat.id)}
                      disabled={isSaving}
                    >
                      <Text style={[st.chipText, formCategoryId === cat.id && st.chipTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            )}
            <Text style={st.label}>Ícone</Text>
            <TouchableOpacity
              style={st.iconPickerBtn}
              onPress={() => setIconPickerVisible(true)}
              disabled={isSaving}
            >
              <Icon source={resolveIconName(formIconId)} size={24} color="#B5451B" />
              <Text style={st.iconPickerBtnText}>Selecionar ícone</Text>
            </TouchableOpacity>
            {tags.length > 0 && (
              <>
                <Text style={st.label}>Etiquetas</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chipRow}>
                  {tags
                    .filter((t) => t.active)
                    .map((tag) => {
                      const selected = formTagIds.includes(tag.id);
                      return (
                        <TouchableOpacity
                          key={tag.id}
                          style={[
                            st.chip,
                            selected && { backgroundColor: tag.color, borderColor: tag.color },
                          ]}
                          onPress={() =>
                            setFormTagIds((prev) =>
                              selected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                            )
                          }
                          disabled={isSaving}
                        >
                          <Icon source={tag.icon} size={14} color={selected ? '#FFFFFF' : tag.color} />
                          <Text style={[st.chipText, selected && { color: '#FFFFFF' }]}>
                            {tag.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </>
            )}
            {error ? <Text style={st.formError}>{error}</Text> : null}
            <View style={st.sheetBtns}>
              <TouchableOpacity
                style={st.cancelBtn}
                onPress={() => setSheetVisible(false)}
                disabled={isSaving}
              >
                <Text style={st.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              {editingItem && (
                <TouchableOpacity
                  style={st.deleteBtn}
                  onPress={handleDeleteInEdit}
                  disabled={isSaving}
                >
                  <Text style={st.deleteText}>Eliminar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[st.saveBtn, isSaving && st.saveBtnDisabled]}
                onPress={() => doSave(false)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={st.saveText}>Guardar</Text>
                )}
              </TouchableOpacity>
              {!editingItem && (
                <TouchableOpacity
                  style={[st.continuarBtn, isSaving && st.saveBtnDisabled]}
                  onPress={() => doSave(true)}
                  disabled={isSaving}
                >
                  <Text style={st.continuarText}>+ Continuar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  pillScroll: { flexGrow: 0 },
  pillRow: { paddingHorizontal: 16, paddingVertical: 8 },
  fabRow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterFab: {
    backgroundColor: '#6D6D6D',
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  scroll: { padding: 16, paddingBottom: 80 },
  empty: { color: '#888888', textAlign: 'center', marginVertical: 32 },
  emptyFilter: { alignItems: 'center', marginVertical: 32 },
  emptyFilterText: { color: '#888888', textAlign: 'center', marginBottom: 8 },
  clearLink: { color: '#B5451B', fontWeight: '500' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#B5451B',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { color: '#FFFFFF', fontSize: 28, fontWeight: '400', marginTop: -2 },
  snackbar: { position: 'absolute', top: 48 },
  successSnackbar: { position: 'absolute', top: 48, backgroundColor: '#388E3C' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#555555', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  chipRow: { marginBottom: 16, flexGrow: 0 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#B5451B', borderColor: '#B5451B' },
  chipText: { fontSize: 13, color: '#555555' },
  chipTextActive: { color: '#FFFFFF' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  toggleLabel: { fontSize: 15, color: '#1A1A1A' },
  formError: { color: '#D32F2F', marginBottom: 12, fontSize: 14 },
  sheetBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
  },
  cancelText: { color: '#1A1A1A', fontSize: 16 },
  deleteBtn: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D32F2F',
    alignItems: 'center',
  },
  deleteText: { color: '#D32F2F', fontSize: 14, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  continuarBtn: {
    flex: 1,
    backgroundColor: '#6D6D6D',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  continuarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  noCategoriesHint: { fontSize: 13, color: '#AAAAAA', fontStyle: 'italic', marginBottom: 16 },
  iconPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  iconPickerBtnText: { fontSize: 14, color: '#B5451B', fontWeight: '500' },
  // Status picker modal
  pickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    elevation: 8,
  },
  pickerHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  pickerItemName: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerOptions: { gap: 10 },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  pickerDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  pickerOptionText: { fontSize: 15, fontWeight: '600' },
});
