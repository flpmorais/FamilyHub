import { useEffect, useState } from 'react';
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
} from 'react-native';
import { Icon, Snackbar } from 'react-native-paper';
import { router } from 'expo-router';
import { useRepository } from '../../../hooks/use-repository';
import { useAuthStore } from '../../../stores/auth.store';
import { logger } from '../../../utils/logger';
import type { Category } from '../../../types/packing.types';

const ICON_OPTIONS = [
  'bag-suitcase',
  'tshirt-crew',
  'shoe-sneaker',
  'sunglasses',
  'umbrella-beach',
  'water',
  'swim',
  'lotion',
  'toothbrush',
  'medical-bag',
  'pill',
  'baby-bottle',
  'teddy-bear',
  'gamepad-variant',
  'book-open-variant',
  'headphones',
  'camera',
  'laptop',
  'cellphone',
  'power-plug',
  'flashlight',
  'tools',
  'food-apple',
  'bottle-wine',
  'cup',
  'silverware-fork-knife',
  'passport',
  'file-document',
  'credit-card',
  'key',
  'car',
  'airplane',
  'map-marker',
  'compass',
  'binoculars',
  'tent',
  'campfire',
  'hiking',
  'basketball',
  'soccer',
  'dumbbell',
  'yoga',
  'music',
  'palette',
  'gift',
  'star',
  'heart',
  'shield-check',
];

export default function CategoriesScreen() {
  const categoryRepo = useRepository('category');
  const { userAccount } = useAuthStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState(ICON_OPTIONS[0]);
  const [formActive, setFormActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  // Success toast
  const [successMsg, setSuccessMsg] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);

  // Filters
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);

  async function loadCategories() {
    if (!userAccount?.familyId) return;
    try {
      const list = await categoryRepo.getCategories(userAccount.familyId);
      setCategories(list);
    } catch (err) {
      logger.error('CategoriesScreen', 'load failed', err);
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
    setEditingCategory(null);
    setFormName('');
    setFormIcon(ICON_OPTIONS[0]);
    setFormActive(true);
    setNameError('');
    setSheetVisible(true);
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormIcon(cat.icon);
    setFormActive(cat.active);
    setNameError('');
    setSheetVisible(true);
  }

  async function handleSave() {
    const name = formName.trim();
    if (!name) {
      setNameError('O nome é obrigatório.');
      return;
    }
    setNameError('');
    setIsSaving(true);
    try {
      if (editingCategory) {
        await categoryRepo.updateCategory(editingCategory.id, { name, icon: formIcon });
        if (editingCategory.active !== formActive) {
          await categoryRepo.setActive(editingCategory.id, formActive);
        }
        setSuccessMsg('Categoria actualizada');
      } else {
        await categoryRepo.createCategory({
          name,
          icon: formIcon,
          familyId: userAccount!.familyId,
        });
        setSuccessMsg('Categoria criada');
      }
      setSheetVisible(false);
      setSuccessVisible(true);
      await loadCategories();
    } catch (err) {
      logger.error('CategoriesScreen', 'save failed', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(cat: Category) {
    const count = await categoryRepo.countItemsUsingCategory(cat.id);
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
          await categoryRepo.deleteCategory(cat.id);
          setSuccessMsg('Categoria eliminada');
          setSuccessVisible(true);
          await loadCategories();
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Categorias</Text>

        <TouchableOpacity style={s.filterBtn} onPress={() => setFilterPanelVisible(true)}>
          <Text style={s.filterBtnText}>
            {filterCount > 0 ? `+ Filtros (${filterCount})` : '+ Filtros'}
          </Text>
        </TouchableOpacity>

        {filteredCategories.length === 0 && (
          <Text style={s.empty}>Nenhuma categoria encontrada.</Text>
        )}

        {filteredCategories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[s.row, !cat.active && s.rowInactive]}
            onPress={() => openEdit(cat)}
            onLongPress={() => handleDelete(cat)}
          >
            <View style={s.rowIconWrap}>
              <Icon source={cat.icon} size={20} color={cat.active ? '#B5451B' : '#CCCCCC'} />
            </View>
            <Text style={[s.rowName, !cat.active && s.rowNameInactive]}>{cat.name}</Text>
            {!cat.active && <Text style={s.inactiveBadge}>Inactiva</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={openAdd} activeOpacity={0.8}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={2000}
        style={s.successSnackbar}
        theme={{ colors: { inverseSurface: '#388E3C', inverseOnSurface: '#FFFFFF' } }}
      >
        {successMsg}
      </Snackbar>

      {/* Create/Edit sheet */}
      <Modal
        visible={sheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSheetVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>
              {editingCategory ? 'Editar categoria' : 'Nova categoria'}
            </Text>
            <Text style={s.label}>Nome *</Text>
            <TextInput
              style={[s.input, nameError ? s.inputError : null]}
              value={formName}
              onChangeText={(t) => {
                setFormName(t);
                setNameError('');
              }}
              placeholder="ex: Roupa"
              autoCapitalize="sentences"
              autoFocus
              editable={!isSaving}
            />
            {nameError ? <Text style={s.fieldError}>{nameError}</Text> : null}
            <Text style={s.label}>Ícone *</Text>
            <TouchableOpacity
              style={s.iconPickerBtn}
              onPress={() => setIconPickerVisible(true)}
              disabled={isSaving}
            >
              <Icon source={formIcon} size={24} color="#B5451B" />
              <Text style={s.iconPickerBtnText}>Selecionar ícone</Text>
            </TouchableOpacity>
            {editingCategory && (
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
              {editingCategory && (
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => {
                    setSheetVisible(false);
                    setTimeout(() => handleDelete(editingCategory), 300);
                  }}
                  disabled={isSaving}
                >
                  <Text style={s.deleteText}>Eliminar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setSheetVisible(false)}
                disabled={isSaving}
              >
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, isSaving && s.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={s.saveText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Icon picker */}
      <Modal
        visible={iconPickerVisible}
        animationType="slide"
        onRequestClose={() => setIconPickerVisible(false)}
      >
        <View style={s.iconPickerContainer}>
          <View style={s.iconPickerHeader}>
            <Text style={s.iconPickerTitle}>Selecionar ícone</Text>
            <TouchableOpacity onPress={() => setIconPickerVisible(false)}>
              <Text style={s.iconPickerClose}>Fechar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.iconGrid}>
            {ICON_OPTIONS.map((icon) => (
              <TouchableOpacity
                key={icon}
                style={[s.iconCell, formIcon === icon && s.iconCellSelected]}
                onPress={() => {
                  setFormIcon(icon);
                  setIconPickerVisible(false);
                }}
              >
                <Icon source={icon} size={28} color={formIcon === icon ? '#B5451B' : '#555555'} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Filter panel */}
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
              <Text style={s.filterApplyBtnText}>Ver {filteredCategories.length} categorias</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24, paddingBottom: 80 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#B5451B', fontSize: 16 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#1A1A1A' },
  filterBtn: { alignSelf: 'flex-end', marginBottom: 12 },
  filterBtnText: { fontSize: 12, color: '#B5451B', fontWeight: '500' },
  empty: { color: '#888888', textAlign: 'center', marginVertical: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rowInactive: { opacity: 0.5 },
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
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
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
  // Icon picker
  iconPickerContainer: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: 48 },
  iconPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  iconPickerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  iconPickerClose: { fontSize: 16, color: '#B5451B', fontWeight: '600' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 8 },
  iconCell: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCellSelected: { backgroundColor: '#FFF0EB', borderWidth: 2, borderColor: '#B5451B' },
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
