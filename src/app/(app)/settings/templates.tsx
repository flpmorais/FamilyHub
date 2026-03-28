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
import type { TemplateItem, CreateTemplateItemInput, Category, Tag } from '../../../types/packing.types';
import type { Profile } from '../../../types/profile.types';

export default function TemplatesScreen() {
  const templateRepo = useRepository('template');
  const categoryRepo = useRepository('category');
  const tagRepo = useRepository('tag');
  const profileRepo = useRepository('profile');
  const { userAccount } = useAuthStore();

  const [items, setItems] = useState<TemplateItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Item form state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formProfileIds, setFormProfileIds] = useState<string[]>([]);
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  const [formAllFamily, setFormAllFamily] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // Success toast
  const [successMsg, setSuccessMsg] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);

  // Filters
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);
  const [filterProfile, setFilterProfile] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState('');

  async function loadAll() {
    if (!userAccount?.familyId) return;
    try {
      const [itemList, catList, tagList, profList] = await Promise.all([
        templateRepo.getTemplateItems(userAccount.familyId),
        categoryRepo.getCategories(userAccount.familyId),
        tagRepo.getTags(userAccount.familyId),
        profileRepo.getProfilesByFamily(userAccount.familyId),
      ]);
      setItems(itemList);
      setCategories(catList.filter((c: Category) => c.active));
      setTags(tagList.filter((t: Tag) => t.active));
      setProfiles(profList.filter((p: Profile) => p.status !== 'inactive'));
    } catch (err) {
      logger.error('TemplatesScreen', 'load failed', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Filters ---
  const filterCount = (filterProfile ? 1 : 0) + (filterCategory ? 1 : 0) + (filterTag ? 1 : 0) + (filterSearch ? 1 : 0);

  const filteredItems = items.filter((item) => {
    if (filterProfile && !item.profileIds.includes(filterProfile) && !item.isAllFamily) return false;
    if (filterCategory && item.categoryId !== filterCategory) return false;
    if (filterTag && !item.tagIds.includes(filterTag)) return false;
    if (filterSearch && !item.title.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  // --- CRUD ---
  function openAdd() {
    setEditingItem(null);
    setFormTitle('');
    setFormProfileIds([]);
    setFormCategoryId(categories.length > 0 ? categories[0].id : '');
    setFormQuantity('1');
    setFormTagIds([]);
    setFormAllFamily(false);
    setTitleError('');
    setCategoryError('');
    setSheetVisible(true);
  }

  function openEdit(item: TemplateItem) {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormProfileIds([...item.profileIds]);
    setFormCategoryId(item.categoryId);
    setFormQuantity(String(item.quantity));
    setFormTagIds([...item.tagIds]);
    setFormAllFamily(item.isAllFamily);
    setTitleError('');
    setCategoryError('');
    setSheetVisible(true);
  }

  async function handleSave(keepOpen: boolean) {
    const title = formTitle.trim();
    if (!title) { setTitleError('O título é obrigatório.'); return; }
    if (!formCategoryId) { setCategoryError('A categoria é obrigatória.'); return; }
    setTitleError('');
    setCategoryError('');
    setIsSaving(true);
    try {
      const qty = Math.max(1, parseInt(formQuantity, 10) || 1);
      if (editingItem) {
        await templateRepo.updateTemplateItem(editingItem.id, {
          title,
          profileIds: formAllFamily ? [] : formProfileIds,
          categoryId: formCategoryId,
          quantity: qty,
          isAllFamily: formAllFamily,
          tagIds: formTagIds,
        });
        setSuccessMsg('Modelo actualizado');
        if (!keepOpen) setSheetVisible(false);
      } else {
        await templateRepo.createTemplateItem(userAccount!.familyId, {
          title,
          profileIds: formAllFamily ? [] : formProfileIds,
          categoryId: formCategoryId,
          quantity: qty,
          isAllFamily: formAllFamily,
          tagIds: formTagIds,
        });
        setSuccessMsg('Modelo criado');
        if (!keepOpen) {
          setSheetVisible(false);
        }
      }
      setSuccessVisible(true);
      await loadAll();
    } catch (err) {
      logger.error('TemplatesScreen', 'save failed', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item: TemplateItem) {
    Alert.alert(
      `Eliminar "${item.title}"?`,
      'Este modelo será eliminado permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await templateRepo.deleteTemplateItem(item.id);
              setSuccessMsg('Modelo eliminado');
              setSuccessVisible(true);
              setSheetVisible(false);
              await loadAll();
            } catch (err) {
              logger.error('TemplatesScreen', 'delete failed', err);
            }
          },
        },
      ]
    );
  }

  function toggleTag(tagId: string) {
    setFormTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  function profileNames(ids: string[]): string {
    if (ids.length === 0) return '1 por participante';
    return ids.map((id) => profiles.find((p) => p.id === id)?.displayName ?? '?').join(', ');
  }

  function toggleFormProfile(profileId: string) {
    setFormProfileIds((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    );
  }

  function categoryInfo(id: string): { name: string; icon: string } {
    const c = categories.find((cat) => cat.id === id);
    return { name: c?.name ?? '?', icon: c?.icon ?? 'help' };
  }

  if (isLoading) {
    return <View style={s.centered}><ActivityIndicator /></View>;
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Modelos</Text>

        <TouchableOpacity style={s.filterBtn} onPress={() => setFilterPanelVisible(true)}>
          <Text style={s.filterBtnText}>
            {filterCount > 0 ? `+ Filtros (${filterCount})` : '+ Filtros'}
          </Text>
        </TouchableOpacity>

        {filteredItems.length === 0 && items.length === 0 && (
          <Text style={s.empty}>Crie o seu primeiro modelo de bagagem.</Text>
        )}
        {filteredItems.length === 0 && items.length > 0 && (
          <Text style={s.empty}>Nenhum modelo encontrado com os filtros actuais.</Text>
        )}

        {filteredItems.map((item) => {
          const cat = categoryInfo(item.categoryId);
          return (
            <TouchableOpacity key={item.id} style={s.row} onPress={() => openEdit(item)}>
              <View style={s.rowIconWrap}>
                <Icon source={cat.icon} size={20} color="#B5451B" />
              </View>
              <View style={s.rowContent}>
                <Text style={s.rowTitle}>{item.title}</Text>
                <Text style={s.rowMeta}>
                  {cat.name}
                  {' · '}
                  {item.isAllFamily ? 'Toda a família' : profileNames(item.profileIds)}
                  {item.quantity > 1 ? ` · ×${item.quantity}` : ''}
                </Text>
              </View>
              {item.tagIds.length > 0 && (
                <View style={s.tagPills}>
                  {item.tagIds.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <View key={tagId} style={[s.tagPill, { borderColor: tag.color }]}>
                        <Icon source={tag.icon} size={10} color={tag.color} />
                        <Text style={[s.tagPillText, { color: tag.color }]}>{tag.name}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
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

        {/* Item form sheet */}
        <Modal
          visible={sheetVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setSheetVisible(false)}
        >
          <View style={s.modalOverlay}>
            <ScrollView contentContainerStyle={s.sheetScroll} keyboardShouldPersistTaps="handled">
              <View style={s.sheet}>
                <Text style={s.sheetTitle}>
                  {editingItem ? 'Editar modelo' : 'Novo modelo'}
                </Text>

                <Text style={s.label}>Título *</Text>
                <TextInput
                  style={[s.input, titleError ? s.inputError : null]}
                  value={formTitle}
                  onChangeText={(t) => { setFormTitle(t); setTitleError(''); }}
                  placeholder="ex: Protetor solar"
                  autoCapitalize="sentences"
                  editable={!isSaving}
                />
                {titleError ? <Text style={s.fieldError}>{titleError}</Text> : null}

                <Text style={s.label}>Categoria *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
                  {categories.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[s.chip, formCategoryId === c.id && s.chipActive]}
                      onPress={() => { setFormCategoryId(c.id); setCategoryError(''); }}
                      disabled={isSaving}
                    >
                      <Icon source={c.icon} size={14} color={formCategoryId === c.id ? '#FFFFFF' : '#555555'} />
                      <Text style={[s.chipText, formCategoryId === c.id && s.chipTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {categoryError ? <Text style={s.fieldError}>{categoryError}</Text> : null}

                <View style={s.toggleRow}>
                  <Text style={s.toggleLabel}>Toda a família</Text>
                  <Switch
                    value={formAllFamily}
                    onValueChange={(v) => { setFormAllFamily(v); if (v) setFormProfileIds([]); }}
                    trackColor={{ true: '#B5451B' }}
                    disabled={isSaving}
                  />
                </View>

                {!formAllFamily && (
                  <>
                    <Text style={s.label}>Perfis</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
                      {profiles.map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          style={[s.chip, formProfileIds.includes(p.id) && s.chipActive]}
                          onPress={() => toggleFormProfile(p.id)}
                          disabled={isSaving}
                        >
                          <Text style={[s.chipText, formProfileIds.includes(p.id) && s.chipTextActive]}>
                            {p.displayName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {formProfileIds.length === 0 && (
                      <Text style={s.hintText}>Sem perfis = 1 por participante</Text>
                    )}
                  </>
                )}

                <Text style={s.label}>Quantidade</Text>
                <TextInput
                  style={[s.input, { width: 80 }]}
                  value={formQuantity}
                  onChangeText={setFormQuantity}
                  keyboardType="number-pad"
                  editable={!isSaving}
                />

                {tags.length > 0 && (
                  <>
                    <Text style={s.label}>Etiquetas</Text>
                    <View style={s.tagWrap}>
                      {tags.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={[s.chip, formTagIds.includes(t.id) && s.chipActive]}
                          onPress={() => toggleTag(t.id)}
                          disabled={isSaving}
                        >
                          <Icon source={t.icon} size={14} color={formTagIds.includes(t.id) ? '#FFFFFF' : t.color} />
                          <Text style={[s.chipText, formTagIds.includes(t.id) && s.chipTextActive]}>
                            {t.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <View style={s.sheetBtns}>
                  <TouchableOpacity
                    style={s.cancelBtn}
                    onPress={() => setSheetVisible(false)}
                    disabled={isSaving}
                  >
                    <Text style={s.cancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  {editingItem && (
                    <TouchableOpacity
                      style={s.deleteBtn}
                      onPress={() => handleDelete(editingItem)}
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
                  {!editingItem && (
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
                  <TouchableOpacity onPress={() => { setFilterProfile(null); setFilterCategory(null); setFilterTag(null); setFilterSearch(''); }}>
                    <Text style={s.filterPanelClear}>Limpar</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={s.label}>Nome</Text>
              <TextInput
                style={s.input}
                value={filterSearch}
                onChangeText={setFilterSearch}
                placeholder="Pesquisar..."
                autoCapitalize="none"
              />

              <Text style={s.label}>Perfil</Text>
              <View style={s.filterChipRow}>
                <TouchableOpacity
                  style={[s.chip, filterProfile === null && s.chipActive]}
                  onPress={() => setFilterProfile(null)}
                >
                  <Text style={[s.chipText, filterProfile === null && s.chipTextActive]}>Todos</Text>
                </TouchableOpacity>
                {profiles.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[s.chip, filterProfile === p.id && s.chipActive]}
                    onPress={() => setFilterProfile(filterProfile === p.id ? null : p.id)}
                  >
                    <Text style={[s.chipText, filterProfile === p.id && s.chipTextActive]}>{p.displayName}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Categoria</Text>
              <View style={s.filterChipRow}>
                <TouchableOpacity
                  style={[s.chip, filterCategory === null && s.chipActive]}
                  onPress={() => setFilterCategory(null)}
                >
                  <Text style={[s.chipText, filterCategory === null && s.chipTextActive]}>Todas</Text>
                </TouchableOpacity>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.chip, filterCategory === c.id && s.chipActive]}
                    onPress={() => setFilterCategory(filterCategory === c.id ? null : c.id)}
                  >
                    <Icon source={c.icon} size={14} color={filterCategory === c.id ? '#FFFFFF' : '#555555'} />
                    <Text style={[s.chipText, filterCategory === c.id && s.chipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {tags.length > 0 && (
                <>
                  <Text style={s.label}>Etiqueta</Text>
                  <View style={s.filterChipRow}>
                    <TouchableOpacity
                      style={[s.chip, filterTag === null && s.chipActive]}
                      onPress={() => setFilterTag(null)}
                    >
                      <Text style={[s.chipText, filterTag === null && s.chipTextActive]}>Todas</Text>
                    </TouchableOpacity>
                    {tags.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[s.chip, filterTag === t.id && s.chipActive]}
                        onPress={() => setFilterTag(filterTag === t.id ? null : t.id)}
                      >
                        <Icon source={t.icon} size={14} color={filterTag === t.id ? '#FFFFFF' : t.color} />
                        <Text style={[s.chipText, filterTag === t.id && s.chipTextActive]}>{t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <TouchableOpacity style={s.filterApplyBtn} onPress={() => setFilterPanelVisible(false)}>
                <Text style={s.filterApplyBtnText}>Ver {filteredItems.length} modelos</Text>
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
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  rowIconWrap: { width: 28, alignItems: 'center', marginRight: 12 },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 16, color: '#1A1A1A', fontWeight: '500' },
  rowMeta: { fontSize: 12, color: '#888888', marginTop: 2 },
  tagPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginLeft: 8, maxWidth: 120 },
  tagPill: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  tagPillText: { fontSize: 10, fontWeight: '500' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#555555', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 4,
  },
  inputError: { borderColor: '#D32F2F' },
  fieldError: { color: '#D32F2F', fontSize: 12, marginBottom: 8 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 4,
  },
  toggleLabel: { fontSize: 15, color: '#1A1A1A' },
  chipScroll: { marginBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#B5451B', borderColor: '#B5451B' },
  chipText: { fontSize: 13, color: '#555555' },
  chipTextActive: { color: '#FFFFFF' },
  hintText: { fontSize: 11, color: '#AAAAAA', marginBottom: 8, fontStyle: 'italic' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  sheetBtns: { flexDirection: 'row', gap: 8, marginTop: 20 },
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
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
  },
  cancelText: { color: '#1A1A1A', fontSize: 14 },
  saveBtn: {
    flex: 1,
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
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
  filterApplyBtn: {
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  filterApplyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
