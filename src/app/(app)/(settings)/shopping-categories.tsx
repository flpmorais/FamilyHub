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
import { PageHeader } from '../../../components/page-header';
import { useFamily } from '../../../hooks/use-family';
import { useRepository } from '../../../hooks/use-repository';
import { useAuthStore } from '../../../stores/auth.store';
import { supabaseClient } from '../../../repositories/supabase/supabase.client';
import { logger } from '../../../utils/logger';
import { useModalKeyboardScroll } from '../../../hooks/use-modal-keyboard-scroll';
import type { ShoppingCategory } from '../../../types/shopping.types';

function mirrorCategory(payload: Record<string, unknown>) {
  supabaseClient.functions.invoke('sync-categories', {
    body: { ...payload, mirror: true },
  }).catch(() => {});
}

interface ShoppingCategoryDraggableRowProps {
  category: ShoppingCategory;
  onOpenEdit: (cat: ShoppingCategory) => void;
}

const ShoppingCategoryDraggableRow = memo(function ShoppingCategoryDraggableRow({
  category,
  onOpenEdit,
}: ShoppingCategoryDraggableRowProps) {
  const drag = useReorderableDrag();
  const isActive = useIsActive();

  return (
    <TouchableOpacity
      style={[s.row, !category.active && s.rowInactive, isActive && s.rowDragging]}
      onPress={() => onOpenEdit(category)}
      onLongPress={drag}
    >
      <Text style={[s.rowName, !category.active && s.rowNameInactive]}>{category.name}</Text>
      {!category.active && <Text style={s.inactiveBadge}>Inactiva</Text>}
      <TouchableOpacity onPressIn={drag} disabled={isActive}>
        <Text style={[s.dragHandle, isActive && s.dragHandleActive]}>{'\u2261'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

export default function ShoppingCategoriesScreen() {
  const family = useFamily();
  const catRepo = useRepository('shoppingCategory');
  const { userAccount } = useAuthStore();

  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingCat, setEditingCat] = useState<ShoppingCategory | null>(null);
  const [formName, setFormName] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);

  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);

  const { keyboardHeight, scrollViewRef, getInputProps } = useModalKeyboardScroll({
    inputKeys: ['formName', 'searchText'],
  });

  async function loadCategories() {
    if (!userAccount?.familyId) return;
    try {
      const list = await catRepo.getAll(userAccount.familyId);
      setCategories(list);
    } catch (err) {
      logger.error('ShoppingCategoriesScreen', 'load failed', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCategories = categories.filter((c) => {
    if (showActiveOnly && !c.active) return false;
    if (searchText && !c.name.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });
  const filterCount = (showActiveOnly ? 1 : 0) + (searchText ? 1 : 0);

  function openAdd() {
    setEditingCat(null);
    setFormName('');
    setFormActive(true);
    setNameError('');
    setSheetVisible(true);
  }

  function openEdit(cat: ShoppingCategory) {
    setEditingCat(cat);
    setFormName(cat.name);
    setFormActive(cat.active);
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
      if (editingCat) {
        const oldName = editingCat.name;
        await catRepo.edit(editingCat.id, { name });
        if (editingCat.active !== formActive) await catRepo.setActive(editingCat.id, formActive);
        mirrorCategory({ action: 'edit', oldName, name, active: formActive });
        setSuccessMsg('Categoria actualizada');
        setSheetVisible(false);
      } else {
        const maxOrder = categories.length > 0
          ? Math.max(...categories.map((c) => c.sortOrder))
          : 0;
        await catRepo.create({ familyId: userAccount!.familyId, name, sortOrder: maxOrder + 1 });
        mirrorCategory({ action: 'create', name, sortOrder: maxOrder + 1, active: true });
        setSuccessMsg('Categoria criada');
        if (!keepOpen) setSheetVisible(false);
      }
      setSuccessVisible(true);
      await loadCategories();
    } catch (err) {
      logger.error('ShoppingCategoriesScreen', 'save failed', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(cat: ShoppingCategory) {
    const count = await catRepo.countItemsUsingCategory(cat.id);
    if (count > 0) {
      Alert.alert(
        'Não é possível eliminar',
        `Esta categoria está a ser utilizada por ${count} ${count === 1 ? 'item' : 'itens'}. Desactive-a em vez de eliminar.`
      );
      return;
    }
    Alert.alert(`Eliminar "${cat.name}"?`, 'Esta acção não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await catRepo.delete(cat.id);
          mirrorCategory({ action: 'delete', name: cat.name });
          setSuccessMsg('Categoria eliminada');
          setSuccessVisible(true);
          await loadCategories();
        },
      },
    ]);
  }

  const handleReorder = useCallback(
    async ({ from, to }: ReorderableListReorderEvent) => {
      const reorderedData = reorderItems(filteredCategories, from, to);
      setCategories(reorderedData);
      try {
        await catRepo.batchReorder(
          reorderedData.map((c, i) => ({ id: c.id, sortOrder: i + 1 }))
        );
        mirrorCategory({
          action: 'reorder',
          items: reorderedData.map((c, i) => ({ name: c.name, sortOrder: i + 1 })),
        });
        await loadCategories();
      } catch (err) {
        logger.error('ShoppingCategoriesScreen', 'reorder failed', err);
        await loadCategories();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catRepo, filteredCategories]
  );

  const renderDraggableItem = useCallback(
    ({ item: cat }: ListRenderItemInfo<ShoppingCategory>) => (
      <ShoppingCategoryDraggableRow category={cat} onOpenEdit={openEdit} />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const renderStaticItem = useCallback(
    ({ item: cat }: { item: ShoppingCategory }) => (
      <TouchableOpacity
        style={[s.row, !cat.active && s.rowInactive]}
        onPress={() => openEdit(cat)}
      >
        <Text style={[s.rowName, !cat.active && s.rowNameInactive]}>{cat.name}</Text>
        {!cat.active && <Text style={s.inactiveBadge}>Inactiva</Text>}
      </TouchableOpacity>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const ListHeader = useCallback(
    () => (
      <View style={s.listHeader}>
        {filteredCategories.length === 0 && (
          <Text style={s.empty}>Nenhuma categoria encontrada.</Text>
        )}
      </View>
    ),
    [filterCount, filteredCategories.length]
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
        <PageHeader title="Categorias de Compras" showBack familyBannerUri={family?.bannerUrl} />
        {isDragEnabled ? (
          <ReorderableList
            data={filteredCategories}
            keyExtractor={(item) => item.id}
            renderItem={renderDraggableItem}
            onReorder={handleReorder}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={s.listContent}
            shouldUpdateActiveItem
          />
        ) : (
          <FlatList
            data={filteredCategories}
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
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={[s.sheetScroll, { paddingBottom: keyboardHeight }]}
              keyboardShouldPersistTaps="handled"
            >
            <View style={s.sheet}>
              <Text style={s.sheetTitle}>{editingCat ? 'Editar categoria' : 'Nova categoria'}</Text>
              <Text style={s.label}>Nome *</Text>
              <TextInput
                {...getInputProps('formName')}
                style={[s.input, nameError ? s.inputError : null]}
                value={formName}
                onChangeText={(t) => {
                  setFormName(t);
                  setNameError('');
                }}
                placeholder="ex: Lacticínios"
                autoCapitalize="sentences"
                editable={!isSaving}
              />
              {nameError ? <Text style={s.fieldError}>{nameError}</Text> : null}
              {editingCat && (
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
                {editingCat && (
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => {
                      setSheetVisible(false);
                      setTimeout(() => handleDelete(editingCat), 300);
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
                {!editingCat && (
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
            </ScrollView>
          </View>
        </Modal>

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
              <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={{ paddingBottom: keyboardHeight }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
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
                {...getInputProps('searchText')}
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
                <Text style={s.filterApplyBtnText}>Ver {filteredCategories.length} categorias</Text>
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
  listHeader: { paddingHorizontal: 16, paddingTop: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 80 },
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
  sheetScroll: { flexGrow: 1, justifyContent: 'flex-end' },
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
