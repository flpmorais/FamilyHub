import { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Icon, Snackbar } from 'react-native-paper';
import { router } from 'expo-router';
import { useRepository } from '../../../hooks/use-repository';
import { useAuthStore } from '../../../stores/auth.store';
import { logger } from '../../../utils/logger';
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

const ICON_OPTIONS = [
  // Luggage & bags
  'bag-suitcase',
  'bag-personal',
  'bag-carry-on',
  'briefcase',
  'shopping',
  // Clothing & accessories
  'tshirt-crew',
  'shoe-sneaker',
  'shoe-formal',
  'hat-fedora',
  'sunglasses',
  'watch',
  'hanger',
  // Beach & outdoors
  'umbrella-beach',
  'swim',
  'water',
  'surfing',
  'sail-boat',
  'palm-tree',
  'weather-sunny',
  'snowflake',
  'mountain-sun',
  'tent',
  'campfire',
  'hiking',
  'fish',
  'binoculars',
  'compass',
  // Hygiene & health
  'lotion',
  'toothbrush',
  'spray',
  'medical-bag',
  'pill',
  'hospital-box',
  'bandage',
  'thermometer',
  // Kids & family
  'baby-bottle',
  'baby-carriage',
  'teddy-bear',
  'human-child',
  'toy-brick',
  // Electronics & tech
  'camera',
  'laptop',
  'cellphone',
  'tablet',
  'headphones',
  'power-plug',
  'battery-charging',
  'usb',
  'flashlight',
  'lightbulb',
  // Entertainment
  'gamepad-variant',
  'book-open-variant',
  'music',
  'cards-playing',
  'puzzle',
  // Food & drink
  'food-apple',
  'bottle-wine',
  'cup',
  'coffee',
  'silverware-fork-knife',
  'food',
  // Travel & transport
  'passport',
  'airplane',
  'car',
  'train',
  'bus',
  'ferry',
  'map-marker',
  'earth',
  'flag',
  'star-circle-outline',
  // Documents & money
  'file-document',
  'credit-card',
  'cash',
  'currency-usd',
  'currency-eur',
  'key',
  'lock',
  'shield-check',
  'calendar',
  // Sports & fitness
  'basketball',
  'soccer',
  'tennis',
  'dumbbell',
  'yoga',
  'run',
  'bike',
  // Tools & misc
  'tools',
  'wrench',
  'content-cut',
  'gift',
  'star',
  'heart',
  'palette',
  'home',
  'bed',
  'shower',
  'washing-machine',
  'iron',
  // Tags
  'tag',
  'tag-outline',
  'label',
  'label-outline',
];

export default function TagsScreen() {
  const tagRepo = useRepository('tag');
  const { userAccount } = useAuthStore();

  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('tag');
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
      setTags(list);
    } catch (err) {
      logger.error('TagsScreen', 'load failed', err);
    } finally {
      setIsLoading(false);
    }
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
    setFormIcon('tag');
    setFormColor(TAG_COLORS[0]);
    setFormActive(true);
    setNameError('');
    setSheetVisible(true);
  }

  function openEdit(tag: Tag) {
    setEditingTag(tag);
    setFormName(tag.name);
    setFormIcon(tag.icon);
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
      if (editingTag) {
        await tagRepo.updateTag(editingTag.id, name, formIcon, formColor);
        if (editingTag.active !== formActive) await tagRepo.setActive(editingTag.id, formActive);
        setSuccessMsg('Etiqueta actualizada');
        setSheetVisible(false);
      } else {
        await tagRepo.createTag(userAccount!.familyId, name, formIcon, formColor);
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

  const handleDragEnd = useCallback(
    async ({ data: reorderedData }: { data: Tag[] }) => {
      // Update local state immediately for responsiveness
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
    [tagRepo]
  );

  const renderDraggableItem = useCallback(
    ({ item: tag, drag, isActive }: RenderItemParams<Tag>) => (
      <ScaleDecorator>
        <TouchableOpacity
          style={[s.row, !tag.active && s.rowInactive, isActive && s.rowDragging]}
          onPress={() => openEdit(tag)}
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
      </ScaleDecorator>
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
      <View style={s.content}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>{'\u2190'} Voltar</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Etiquetas</Text>

        <TouchableOpacity style={s.filterBtn} onPress={() => setFilterPanelVisible(true)}>
          <Text style={s.filterBtnText}>
            {filterCount > 0 ? `+ Filtros (${filterCount})` : '+ Filtros'}
          </Text>
        </TouchableOpacity>

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
        {isDragEnabled ? (
          <DraggableFlatList
            data={filteredTags}
            keyExtractor={(item) => item.id}
            renderItem={renderDraggableItem}
            onDragEnd={handleDragEnd}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={s.listContent}
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
                <Icon source={formIcon} size={24} color={formColor} />
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

        {/* Icon picker */}
        <Modal
          visible={iconPickerVisible}
          animationType="slide"
          onRequestClose={() => setIconPickerVisible(false)}
        >
          <View style={s.iconPickerContainer}>
            <View style={s.iconPickerHeader}>
              <Text style={s.iconPickerTitle}>Selecionar icone</Text>
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
                <Text style={s.filterApplyBtnText}>Ver {filteredTags.length} etiquetas</Text>
              </TouchableOpacity>
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
  content: { padding: 24, paddingBottom: 0 },
  listContent: { paddingBottom: 80 },
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
    paddingHorizontal: 24,
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
