import { memo, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Switch,
  FlatList,
  type ListRenderItemInfo,
} from 'react-native';
import ReorderableList, {
  reorderItems,
  useIsActive,
  useReorderableDrag,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Icon, Snackbar } from 'react-native-paper';
import { router } from 'expo-router';
import { PageHeader } from '../../../components/page-header';
import { useFamily } from '../../../hooks/use-family';
import { useRepository } from '../../../hooks/use-repository';
import { useAuthStore } from '../../../stores/auth.store';
import { logger } from '../../../utils/logger';
import { IconPicker } from '../../../components/icon-picker';
import { useIconStore } from '../../../stores/icon.store';
import type { Tag } from '../../../types/packing.types';

const TAG_COLORS = [
  '#D32F2F',
  '#C2185B',
  '#9C27B0',
  '#6A1B9A',
  '#3F51B5',
  '#1976D2',
  '#03A9F4',
  '#00897B',
  '#009688',
  '#388E3C',
  '#4CAF50',
  '#CDDC39',
  '#F59300',
  '#E67E22',
  '#FF7043',
  '#F44336',
  '#795548',
  '#607D8B',
  '#888888',
];

interface TagDraggableRowProps {
  tag: Tag;
  onOpenEdit: (tag: Tag) => void;
}

const TagDraggableRow = memo(function TagDraggableRow({ tag, onOpenEdit }: TagDraggableRowProps) {
  const drag = useReorderableDrag();
  const isActive = useIsActive();

  return (
    <TouchableOpacity
      style={[s.row, !tag.active && s.rowInactive, isActive && s.rowDragging]}
      onPress={() => onOpenEdit(tag)}
      onLongPress={drag}
    >
      <View style={s.rowIconWrap}>
        <Icon source={tag.icon} size={20} color={tag.color} />
      </View>
      <Text style={[s.rowName, !tag.active && s.rowNameInactive]}>{tag.name}</Text>
      {!tag.active && <Text style={s.inactiveBadge}>Inactiva</Text>}
      <TouchableOpacity onPressIn={drag} disabled={isActive}>
        <Text style={[s.dragHandle, isActive && s.dragHandleActive]}>{'\u2261'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

export default function TagsScreen() {
  const family = useFamily();
  const tagRepo = useRepository('tag');
  const iconRepo = useRepository('icon');
  const { userAccount } = useAuthStore();
  const { icons, loadIcons } = useIconStore();

  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formName, setFormName] = useState('');
  const [formIconId, setFormIconId] = useState('');
  const [formColor, setFormColor] = useState(TAG_COLORS[0]);
  const [formActive, setFormActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);

  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);

  async function loadTags() {
    if (!userAccount?.familyId) return;
    try {
      const list = await tagRepo.getTags(userAccount.familyId);
      await loadIcons(iconRepo);
      setTags(list);
    } catch (err) {
      logger.error('TagsScreen', 'load failed', err);
    } finally {
      setIsLoading(false);
    }
  }

  const iconsByName = new Map(icons.map((i) => [i.name, i]));

  function resolveIconName(iconId: string): string {
    return useIconStore.getState().resolveIconName(iconId);
  }

  function iconIdFromName(name: string): string {
    return iconsByName.get(name)?.id ?? '';
  }

  useEffect(() => {
    void loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTags = tags.filter((t) => {
    if (showActiveOnly && !t.active) return false;
    if (searchText && !t.name.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });
  const filterCount = (showActiveOnly ? 1 : 0) + (searchText ? 1 : 0);

  function openAdd() {
    setEditingTag(null);
    setFormName('');
    setFormIconId(iconIdFromName('tag'));
    setFormColor(TAG_COLORS[0]);
    setFormActive(true);
    setNameError('');
    setSheetVisible(true);
  }

  function openEdit(tag: Tag) {
    setEditingTag(tag);
    setFormName(tag.name);
    setFormIconId(iconIdFromName(tag.icon));
    setFormColor(tag.color);
    setFormActive(tag.active);
    setNameError('');
    setSheetVisible(true);
  }

  async function handleSave(keepOpen: boolean = false) {
    const name = formName.trim();
    if (!name) {
      setNameError('O nome é obrigatório.');
      return;
    }
    setNameError('');
    setIsSaving(true);
    try {
      const iconNameValue = resolveIconName(formIconId);
      if (editingTag) {
        await tagRepo.updateTag(editingTag.id, name, iconNameValue, formColor);
        if (editingTag.active !== formActive) await tagRepo.setActive(editingTag.id, formActive);
        setSuccessMsg('Etiqueta actualizada');
        setSheetVisible(false);
      } else {
        await tagRepo.createTag(userAccount!.familyId, name, iconNameValue, formColor);
        setSuccessMsg('Etiqueta criada');
        if (!keepOpen) setSheetVisible(false);
      }
      setSuccessVisible(true);
      await loadTags();
    } catch (err) {
      logger.error('TagsScreen', 'save failed', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(tag: Tag) {
    const count = await tagRepo.countItemsUsingTag(tag.id);
    if (count > 0) {
      Alert.alert(
        'Não é possível eliminar',
        `Esta etiqueta está a ser utilizada por ${count} ${count === 1 ? 'item' : 'itens'}. Desactive-a em vez de eliminar.`
      );
      return;
    }
    Alert.alert(`Eliminar "${tag.name}"?`, 'Esta acção não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await tagRepo.deleteTag(tag.id);
          setSuccessMsg('Etiqueta eliminada');
          setSuccessVisible(true);
          await loadTags();
        },
      },
    ]);
  }

  const handleReorder = useCallback(
    async ({ from, to }: ReorderableListReorderEvent) => {
      const reorderedData = reorderItems(filteredTags, from, to);
      setTags(reorderedData);

      // Persist new sort orders for items that changed position
      try {
        for (let i = 0; i < reorderedData.length; i++) {
          const item = reorderedData[i];
          const newSortOrder = i + 1;
          if (item.sortOrder !== newSortOrder) {
            await tagRepo.reorderTag(item.id, newSortOrder);
          }
        }
        // Reload to sync with DB
        await loadTags();
      } catch (err) {
        logger.error('TagsScreen', 'reorder failed', err);
        // Reload to revert to DB state on error
        await loadTags();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tagRepo, filteredTags]
  );

  const renderDraggableItem = useCallback(
    ({ item: tag }: ListRenderItemInfo<Tag>) => (
      <TagDraggableRow tag={tag} onOpenEdit={openEdit} />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const renderStaticItem = useCallback(
    ({ item: tag }: { item: Tag }) => (
      <TouchableOpacity
        style={[s.row, !tag.active && s.rowInactive]}
        onPress={() => openEdit(tag)}
        onLongPress={() => handleDelete(tag)}
      >
        <View style={s.rowIconWrap}>
          <Icon source={tag.icon} size={20} color={tag.color} />
        </View>
        <Text style={[s.rowName, !tag.active && s.rowNameInactive]}>{tag.name}</Text>
        {!tag.active && <Text style={s.inactiveBadge}>Inactiva</Text>}
      </TouchableOpacity>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const ListHeader = useCallback(
    () => (
      <View style={s.listHeader}>
        {filteredTags.length === 0 && (
          <Text style={s.empty}>Nenhuma etiqueta encontrada.</Text>
        )}
      </View>
    ),
    [filterCount, filteredTags.length]
  );

  if (isLoading)
    return (
      <View style={s.centered}>
        <ActivityIndicator />
      </View>
    );

  const isDragEnabled = !searchText;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={s.container}>
        <PageHeader title="Etiquetas" showBack familyBannerUri={family?.bannerUrl} />
        {isDragEnabled ? (
          <ReorderableList
            data={filteredTags}
            keyExtractor={(item) => item.id}
            renderItem={renderDraggableItem}
            onReorder={handleReorder}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={s.listContent}
            shouldUpdateActiveItem
          />
        ) : (
          <FlatList
            data={filteredTags}
            keyExtractor={(item) => item.id}
            renderItem={renderStaticItem}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={s.listContent}
          />
        )}

        <View style={s.fabRow}>
          <TouchableOpacity style={[s.fab, s.filterFab]} onPress={() => setFilterPanelVisible(!filterPanelVisible)} activeOpacity={0.8}>
            <Icon source="filter-variant" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={s.fab} onPress={openAdd} activeOpacity={0.8}>
            <Text style={s.fabText}>+</Text>
          </TouchableOpacity>
        </View>

        <Snackbar
          visible={successVisible}
          onDismiss={() => setSuccessVisible(false)}
          duration={2000}
          style={s.successSnackbar}
          theme={{ colors: { inverseSurface: '#388E3C', inverseOnSurface: '#FFFFFF' } }}
        >
          {successMsg}
        </Snackbar>

        <Modal
          visible={sheetVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setSheetVisible(false)}
        >
          <View style={s.modalOverlay}>
            <View style={s.sheet}>
              <Text style={s.sheetTitle}>{editingTag ? 'Editar etiqueta' : 'Nova etiqueta'}</Text>
              <Text style={s.label}>Nome *</Text>
              <TextInput
                style={[s.input, nameError ? s.inputError : null]}
                value={formName}
                onChangeText={(t) => {
                  setFormName(t);
                  setNameError('');
                }}
                placeholder="ex: Praia"
                autoCapitalize="sentences"
                editable={!isSaving}
              />
              {nameError ? <Text style={s.fieldError}>{nameError}</Text> : null}
              <Text style={s.label}>Icone</Text>
              <TouchableOpacity
                style={s.iconPickerBtn}
                onPress={() => setIconPickerVisible(true)}
                disabled={isSaving}
              >
                <Icon source={resolveIconName(formIconId)} size={24} color={formColor} />
                <Text style={s.iconPickerBtnText}>Selecionar icone</Text>
              </TouchableOpacity>
              <Text style={s.label}>Cor</Text>
              <View style={s.colorRow}>
                {TAG_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      s.colorCircle,
                      { backgroundColor: c },
                      formColor === c && s.colorCircleSelected,
                    ]}
                    onPress={() => setFormColor(c)}
                    disabled={isSaving}
                  />
                ))}
              </View>
              {editingTag && (
                <View style={s.activeRow}>
                  <Text style={s.activeLabel}>Activa</Text>
                  <Switch
                    value={formActive}
                    onValueChange={setFormActive}
                    trackColor={{ true: '#B5451B' }}
                    disabled={isSaving}
                  />
                </View>
              )}
              <View style={s.sheetBtns}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => setSheetVisible(false)}
                  disabled={isSaving}
                >
                  <Text style={s.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                {editingTag && (
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => {
                      setSheetVisible(false);
                      setTimeout(() => handleDelete(editingTag), 300);
                    }}
                    disabled={isSaving}
                  >
                    <Text style={s.deleteText}>Eliminar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[s.saveBtn, isSaving && s.saveBtnDisabled]}
                  onPress={() => handleSave(false)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={s.saveText}>Guardar</Text>
                  )}
                </TouchableOpacity>
                {!editingTag && (
                  <TouchableOpacity
                    style={[s.continuarBtn, isSaving && s.saveBtnDisabled]}
                    onPress={() => handleSave(true)}
                    disabled={isSaving}
                  >
                    <Text style={s.continuarText}>+ Continuar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>

        <IconPicker
          visible={iconPickerVisible}
          icons={icons}
          selectedIconId={formIconId}
          onSelect={setFormIconId}
          onClose={() => setIconPickerVisible(false)}
        />

        <Modal
          visible={filterPanelVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setFilterPanelVisible(false)}
        >
          <View style={s.filterOverlay}>
            <TouchableOpacity
              style={s.filterOverlayTouch}
              onPress={() => setFilterPanelVisible(false)}
              activeOpacity={1}
            />
            <View style={s.filterPanel}>
              <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.filterPanelHeader}>
                <Text style={s.filterPanelTitle}>Filtros</Text>
                {filterCount > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setShowActiveOnly(false);
                      setSearchText('');
                    }}
                  >
                    <Text style={s.filterPanelClear}>Limpar</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={s.label}>Nome</Text>
              <TextInput
                style={s.input}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Pesquisar..."
                autoCapitalize="none"
              />
              <Text style={s.label}>Estado</Text>
              <View style={s.filterChipRow}>
                <TouchableOpacity
                  style={[s.filterChip, showActiveOnly && s.filterChipActive]}
                  onPress={() => setShowActiveOnly(!showActiveOnly)}
                >
                  <Text style={[s.filterChipText, showActiveOnly && s.filterChipTextActive]}>
                    Apenas activas
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={s.filterApplyBtn} onPress={() => setFilterPanelVisible(false)}>
                <Text style={s.filterApplyBtnText}>Ver {filteredTags.length} etiquetas</Text>
              </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24, paddingBottom: 80 },
  listHeader: { paddingHorizontal: 16, paddingTop: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 80 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#B5451B', fontSize: 16 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#1A1A1A' },
  fabRow: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  filterFab: { backgroundColor: '#6D6D6D', width: 48, height: 48, borderRadius: 14 },
  empty: { color: '#888888', textAlign: 'center', marginVertical: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  rowInactive: { opacity: 0.5 },
  rowDragging: { elevation: 4, shadowColor: '#000000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  rowIconWrap: { width: 28, alignItems: 'center', marginRight: 12 },
  rowName: { fontSize: 16, color: '#1A1A1A', flex: 1 },
  rowNameInactive: { color: '#AAAAAA' },
  inactiveBadge: {
    fontSize: 10,
    color: '#AAAAAA',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dragHandle: { fontSize: 20, color: '#CCCCCC', paddingHorizontal: 8 },
  dragHandleActive: { color: '#B5451B' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#B5451B',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: { color: '#FFFFFF', fontSize: 28, fontWeight: '400', marginTop: -2 },
  successSnackbar: { position: 'absolute', top: 48, backgroundColor: '#388E3C' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
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
  inputError: { borderColor: '#D32F2F' },
  fieldError: { color: '#D32F2F', fontSize: 12, marginTop: -12, marginBottom: 12 },
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
  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  colorCircle: { width: 36, height: 36, borderRadius: 18 },
  colorCircleSelected: { borderWidth: 3, borderColor: '#1A1A1A' },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 4,
  },
  activeLabel: { fontSize: 15, color: '#1A1A1A' },
  sheetBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  deleteBtn: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D32F2F',
    alignItems: 'center',
  },
  deleteText: { color: '#D32F2F', fontSize: 14, fontWeight: '600' },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
  },
  cancelText: { color: '#1A1A1A', fontSize: 16 },
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
  continuarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  // Filter panel
  filterOverlay: { flex: 1, flexDirection: 'row' },
  filterOverlayTouch: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  filterPanel: { width: 300, backgroundColor: '#FFFFFF', paddingTop: 48, paddingHorizontal: 20 },
  filterPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 16,
  },
  filterPanelTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  filterPanelClear: { fontSize: 14, color: '#B5451B', fontWeight: '500' },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: { backgroundColor: '#B5451B', borderColor: '#B5451B' },
  filterChipText: { fontSize: 13, color: '#555555' },
  filterChipTextActive: { color: '#FFFFFF' },
  filterApplyBtn: {
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  filterApplyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
