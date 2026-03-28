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
import type { TaskTemplate, CreateTaskTemplateInput } from '../../../types/vacation.types';
import type { Tag } from '../../../types/packing.types';
import type { Profile } from '../../../types/profile.types';

export default function TaskTemplatesScreen() {
  const taskTemplateRepo = useRepository('taskTemplate');
  const tagRepo = useRepository('tag');
  const profileRepo = useRepository('profile');
  const { userAccount } = useAuthStore();

  const [items, setItems] = useState<TaskTemplate[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<TaskTemplate | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDeadlineDays, setFormDeadlineDays] = useState('30');
  const [formAllFamily, setFormAllFamily] = useState(false);
  const [formProfileIds, setFormProfileIds] = useState<string[]>([]);
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  const [formActive, setFormActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);

  // Filters
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);
  const [filterProfile, setFilterProfile] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterActiveOnly, setFilterActiveOnly] = useState(true);

  async function loadAll() {
    if (!userAccount?.familyId) return;
    try {
      const [itemList, tagList, profList] = await Promise.all([
        taskTemplateRepo.getTaskTemplates(userAccount.familyId),
        tagRepo.getTags(userAccount.familyId),
        profileRepo.getProfilesByFamily(userAccount.familyId),
      ]);
      setItems(itemList);
      setTags(tagList.filter((t: Tag) => t.active));
      setProfiles(profList.filter((p: Profile) => p.status !== 'inactive'));
    } catch (err) {
      logger.error('TaskTemplatesScreen', 'load failed', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filterCount = (filterProfile ? 1 : 0) + (filterTag ? 1 : 0) + (filterSearch ? 1 : 0) + (filterActiveOnly ? 1 : 0);

  const filteredItems = items.filter((item) => {
    if (filterActiveOnly && !item.active) return false;
    if (filterProfile && !item.profileIds.includes(filterProfile) && !item.isAllFamily) return false;
    if (filterTag && !item.tagIds.includes(filterTag)) return false;
    if (filterSearch && !item.title.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  function openAdd() {
    setEditingItem(null);
    setFormTitle('');
    setFormDeadlineDays('30');
    setFormAllFamily(false);
    setFormProfileIds([]);
    setFormTagIds([]);
    setFormActive(true);
    setTitleError('');
    setSheetVisible(true);
  }

  function openEdit(item: TaskTemplate) {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDeadlineDays(String(item.deadlineDays));
    setFormAllFamily(item.isAllFamily);
    setFormProfileIds([...item.profileIds]);
    setFormTagIds([...item.tagIds]);
    setFormActive(item.active);
    setTitleError('');
    setSheetVisible(true);
  }

  async function handleSave(keepOpen: boolean) {
    const title = formTitle.trim();
    if (!title) { setTitleError('O título é obrigatório.'); return; }
    setTitleError('');
    setIsSaving(true);
    try {
      const deadlineDays = Math.max(1, parseInt(formDeadlineDays, 10) || 30);
      if (editingItem) {
        await taskTemplateRepo.updateTaskTemplate(editingItem.id, {
          title,
          deadlineDays,
          isAllFamily: formAllFamily,
          active: formActive,
          profileIds: formAllFamily ? [] : formProfileIds,
          tagIds: formTagIds,
        });
        setSuccessMsg('Tarefa actualizada');
        if (!keepOpen) setSheetVisible(false);
      } else {
        await taskTemplateRepo.createTaskTemplate(userAccount!.familyId, {
          title,
          deadlineDays,
          isAllFamily: formAllFamily,
          profileIds: formAllFamily ? [] : formProfileIds,
          tagIds: formTagIds,
        });
        setSuccessMsg('Tarefa criada');
        if (!keepOpen) {
          setSheetVisible(false);
        }
      }
      setSuccessVisible(true);
      await loadAll();
    } catch (err) {
      logger.error('TaskTemplatesScreen', 'save failed', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item: TaskTemplate) {
    Alert.alert(`Eliminar "${item.title}"?`, 'Esta tarefa será eliminada permanentemente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await taskTemplateRepo.deleteTaskTemplate(item.id);
            setSuccessMsg('Tarefa eliminada');
            setSuccessVisible(true);
            setSheetVisible(false);
            await loadAll();
          } catch (err) {
            logger.error('TaskTemplatesScreen', 'delete failed', err);
          }
        },
      },
    ]);
  }

  function toggleTag(tagId: string) {
    setFormTagIds((prev) => prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]);
  }

  function toggleFormProfile(profileId: string) {
    setFormProfileIds((prev) => prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]);
  }

  function profileNames(ids: string[]): string {
    if (ids.length === 0) return '1 por participante';
    return ids.map((id) => profiles.find((p) => p.id === id)?.displayName ?? '?').join(', ');
  }

  if (isLoading) return <View style={s.centered}><ActivityIndicator /></View>;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Tarefas</Text>

        <TouchableOpacity style={s.filterBtn} onPress={() => setFilterPanelVisible(true)}>
          <Text style={s.filterBtnText}>{filterCount > 0 ? `+ Filtros (${filterCount})` : '+ Filtros'}</Text>
        </TouchableOpacity>

        {filteredItems.length === 0 && items.length === 0 && (
          <Text style={s.empty}>Crie o seu primeiro modelo de tarefa.</Text>
        )}
        {filteredItems.length === 0 && items.length > 0 && (
          <Text style={s.empty}>Nenhuma tarefa encontrada com os filtros actuais.</Text>
        )}

        {filteredItems.map((item) => (
          <TouchableOpacity key={item.id} style={[s.row, !item.active && s.rowInactive]} onPress={() => openEdit(item)}>
            <View style={s.rowIconWrap}>
              <Icon source="clipboard-check-outline" size={20} color={item.active ? '#B5451B' : '#CCCCCC'} />
            </View>
            <View style={s.rowContent}>
              <Text style={[s.rowTitle, !item.active && s.rowTitleInactive]}>{item.title}</Text>
              <Text style={s.rowMeta}>
                {item.deadlineDays}d · {item.isAllFamily ? 'Toda a família' : profileNames(item.profileIds)}
              </Text>
            </View>
            {!item.active && <Text style={s.inactiveBadge}>Inactiva</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={openAdd} activeOpacity={0.8}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <Snackbar visible={successVisible} onDismiss={() => setSuccessVisible(false)} duration={2000}
        style={s.successSnackbar} theme={{ colors: { inverseSurface: '#388E3C', inverseOnSurface: '#FFFFFF' } }}>
        {successMsg}
      </Snackbar>

      {/* Form sheet */}
      <Modal visible={sheetVisible} animationType="slide" transparent onRequestClose={() => setSheetVisible(false)}>
        <View style={s.modalOverlay}>
          <ScrollView contentContainerStyle={s.sheetScroll} keyboardShouldPersistTaps="handled">
            <View style={s.sheet}>
              <Text style={s.sheetTitle}>{editingItem ? 'Editar tarefa' : 'Nova tarefa'}</Text>

              <Text style={s.label}>Título *</Text>
              <TextInput style={[s.input, titleError ? s.inputError : null]} value={formTitle}
                onChangeText={(t) => { setFormTitle(t); setTitleError(''); }} placeholder="ex: Reservar voos"
                autoCapitalize="sentences" editable={!isSaving} />
              {titleError ? <Text style={s.fieldError}>{titleError}</Text> : null}

              <Text style={s.label}>Dias antes da partida *</Text>
              <TextInput style={[s.input, { width: 100 }]} value={formDeadlineDays}
                onChangeText={setFormDeadlineDays} keyboardType="number-pad" editable={!isSaving} />

              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>Toda a família</Text>
                <Switch value={formAllFamily} onValueChange={(v) => { setFormAllFamily(v); if (v) setFormProfileIds([]); }}
                  trackColor={{ true: '#B5451B' }} disabled={isSaving} />
              </View>

              {!formAllFamily && (
                <>
                  <Text style={s.label}>Perfis</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
                    {profiles.map((p) => (
                      <TouchableOpacity key={p.id} style={[s.chip, formProfileIds.includes(p.id) && s.chipActive]}
                        onPress={() => toggleFormProfile(p.id)} disabled={isSaving}>
                        <Text style={[s.chipText, formProfileIds.includes(p.id) && s.chipTextActive]}>{p.displayName}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {formProfileIds.length === 0 && <Text style={s.hintText}>Sem perfis = 1 por participante</Text>}
                </>
              )}

              {tags.length > 0 && (
                <>
                  <Text style={s.label}>Etiquetas</Text>
                  <View style={s.tagWrap}>
                    {tags.map((t) => (
                      <TouchableOpacity key={t.id} style={[s.chip, formTagIds.includes(t.id) && s.chipActive]}
                        onPress={() => toggleTag(t.id)} disabled={isSaving}>
                        <Icon source={t.icon} size={14} color={formTagIds.includes(t.id) ? '#FFFFFF' : t.color} />
                        <Text style={[s.chipText, formTagIds.includes(t.id) && s.chipTextActive]}>{t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {editingItem && (
                <View style={s.toggleRow}>
                  <Text style={s.toggleLabel}>Activa</Text>
                  <Switch value={formActive} onValueChange={setFormActive} trackColor={{ true: '#B5451B' }} disabled={isSaving} />
                </View>
              )}

              <View style={s.sheetBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setSheetVisible(false)} disabled={isSaving}>
                  <Text style={s.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                {editingItem && (
                  <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(editingItem)} disabled={isSaving}>
                    <Text style={s.deleteText}>Eliminar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[s.saveBtn, isSaving && s.saveBtnDisabled]} onPress={() => handleSave(false)} disabled={isSaving}>
                  {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.saveText}>Guardar</Text>}
                </TouchableOpacity>
                {!editingItem && (
                  <TouchableOpacity style={[s.continuarBtn, isSaving && s.saveBtnDisabled]}
                    onPress={() => handleSave(true)} disabled={isSaving}>
                    <Text style={s.continuarText}>+ Continuar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Filter panel */}
      <Modal visible={filterPanelVisible} animationType="slide" transparent onRequestClose={() => setFilterPanelVisible(false)}>
        <View style={s.filterOverlay}>
          <TouchableOpacity style={s.filterOverlayTouch} onPress={() => setFilterPanelVisible(false)} activeOpacity={1} />
          <View style={s.filterPanel}>
            <View style={s.filterPanelHeader}>
              <Text style={s.filterPanelTitle}>Filtros</Text>
              {filterCount > 0 && (
                <TouchableOpacity onPress={() => { setFilterProfile(null); setFilterTag(null); setFilterSearch(''); setFilterActiveOnly(false); }}>
                  <Text style={s.filterPanelClear}>Limpar</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={s.label}>Nome</Text>
            <TextInput style={s.input} value={filterSearch} onChangeText={setFilterSearch} placeholder="Pesquisar..." autoCapitalize="none" />

            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Apenas activas</Text>
              <Switch value={filterActiveOnly} onValueChange={setFilterActiveOnly} trackColor={{ true: '#B5451B' }} />
            </View>

            <Text style={s.label}>Perfil</Text>
            <View style={s.filterChipRow}>
              <TouchableOpacity style={[s.chip, filterProfile === null && s.chipActive]} onPress={() => setFilterProfile(null)}>
                <Text style={[s.chipText, filterProfile === null && s.chipTextActive]}>Todos</Text>
              </TouchableOpacity>
              {profiles.map((p) => (
                <TouchableOpacity key={p.id} style={[s.chip, filterProfile === p.id && s.chipActive]}
                  onPress={() => setFilterProfile(filterProfile === p.id ? null : p.id)}>
                  <Text style={[s.chipText, filterProfile === p.id && s.chipTextActive]}>{p.displayName}</Text>
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
              <Text style={s.filterApplyBtnText}>Ver {filteredItems.length} tarefas</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: '#FFFFFF' },
  rowInactive: { opacity: 0.5 },
  rowIconWrap: { width: 28, alignItems: 'center', marginRight: 12 },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 16, color: '#1A1A1A', fontWeight: '500' },
  rowTitleInactive: { color: '#AAAAAA' },
  rowMeta: { fontSize: 12, color: '#888888', marginTop: 2 },
  inactiveBadge: { fontSize: 10, color: '#AAAAAA', backgroundColor: '#F0F0F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  fab: { position: 'absolute', bottom: 16, right: 16, width: 56, height: 56, borderRadius: 16, backgroundColor: '#B5451B', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText: { color: '#FFFFFF', fontSize: 28, fontWeight: '400', marginTop: -2 },
  successSnackbar: { position: 'absolute', top: 48, backgroundColor: '#388E3C' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#555555', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#CCCCCC', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, marginBottom: 4 },
  inputError: { borderColor: '#D32F2F' },
  fieldError: { color: '#D32F2F', fontSize: 12, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 4, paddingVertical: 4 },
  toggleLabel: { fontSize: 15, color: '#1A1A1A' },
  chipScroll: { marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#CCCCCC', backgroundColor: '#FFFFFF', marginRight: 8 },
  chipActive: { backgroundColor: '#B5451B', borderColor: '#B5451B' },
  chipText: { fontSize: 13, color: '#555555' },
  chipTextActive: { color: '#FFFFFF' },
  hintText: { fontSize: 11, color: '#AAAAAA', marginBottom: 8, fontStyle: 'italic' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  sheetBtns: { flexDirection: 'row', gap: 8, marginTop: 20 },
  deleteBtn: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D32F2F', alignItems: 'center' },
  deleteText: { color: '#D32F2F', fontSize: 14, fontWeight: '600' },
  cancelBtn: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CCCCCC', alignItems: 'center' },
  cancelText: { color: '#1A1A1A', fontSize: 14 },
  saveBtn: { flex: 1, backgroundColor: '#B5451B', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  continuarBtn: { flex: 1, backgroundColor: '#6D6D6D', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  continuarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  filterOverlay: { flex: 1, flexDirection: 'row' },
  filterOverlayTouch: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  filterPanel: { width: 300, backgroundColor: '#FFFFFF', paddingTop: 48, paddingHorizontal: 20 },
  filterPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', marginBottom: 16 },
  filterPanelTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  filterPanelClear: { fontSize: 14, color: '#B5451B', fontWeight: '500' },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  filterApplyBtn: { backgroundColor: '#B5451B', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  filterApplyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
