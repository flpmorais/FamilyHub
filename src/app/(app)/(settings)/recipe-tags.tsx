import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Snackbar } from 'react-native-paper';
import { PageHeader } from '../../../components/page-header';
import { useFamily } from '../../../hooks/use-family';
import { useRepository } from '../../../hooks/use-repository';
import { useAuthStore } from '../../../stores/auth.store';
import { logger } from '../../../utils/logger';
import { useModalKeyboardScroll } from '../../../hooks/use-modal-keyboard-scroll';
import type { RecipeTag } from '../../../types/recipe.types';

export default function RecipeTagsScreen() {
  const family = useFamily();
  const tagRepo = useRepository('recipeTag');
  const { userAccount } = useAuthStore();

  const [tags, setTags] = useState<RecipeTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<RecipeTag | null>(null);
  const [formName, setFormName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);

  const { keyboardHeight, scrollViewRef, getInputProps } = useModalKeyboardScroll({
    inputKeys: ['formName'],
  });

  async function loadTags() {
    if (!userAccount?.familyId) return;
    try {
      const list = await tagRepo.getAll(userAccount.familyId);
      setTags(list);
    } catch (err) {
      logger.error('RecipeTagsScreen', 'load failed', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAdd() {
    setEditingTag(null);
    setFormName('');
    setNameError('');
    setSheetVisible(true);
  }

  function openEdit(tag: RecipeTag) {
    setEditingTag(tag);
    setFormName(tag.name);
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
        await tagRepo.edit(editingTag.id, { name });
        setSuccessMsg('Etiqueta actualizada');
        setSheetVisible(false);
      } else {
        await tagRepo.create({ familyId: userAccount!.familyId, name });
        setSuccessMsg('Etiqueta criada');
        if (!keepOpen) setSheetVisible(false);
        setFormName('');
      }
      setSuccessVisible(true);
      await loadTags();
    } catch (err) {
      logger.error('RecipeTagsScreen', 'save failed', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(tag: RecipeTag) {
    const count = await tagRepo.countRecipesUsingTag(tag.id);
    if (count > 0) {
      Alert.alert(
        'Não é possível eliminar',
        `Esta etiqueta está a ser utilizada por ${count} receita${count === 1 ? '' : 's'}. Elimine as associações primeiro.`,
      );
      return;
    }
    Alert.alert(`Eliminar "${tag.name}"?`, 'Esta acção não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await tagRepo.delete(tag.id);
          setSuccessMsg('Etiqueta eliminada');
          setSuccessVisible(true);
          await loadTags();
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
      <PageHeader title="Etiquetas de Receitas" showBack familyBannerUri={family?.bannerUrl} />

      <FlatList
        data={tags}
        keyExtractor={(item) => item.id}
        renderItem={({ item: tag }) => (
          <TouchableOpacity style={s.row} onPress={() => openEdit(tag)}>
            <Text style={s.rowName}>{tag.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.empty}>Nenhuma etiqueta criada.</Text>}
        contentContainerStyle={s.listContent}
      />

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
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[s.sheetScroll, { paddingBottom: keyboardHeight }]}
            keyboardShouldPersistTaps="handled"
          >
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{editingTag ? 'Editar etiqueta' : 'Nova etiqueta'}</Text>
            <Text style={s.label}>Nome *</Text>
            <TextInput
              {...getInputProps('formName')}
              style={[s.input, nameError ? s.inputError : null]}
              value={formName}
              onChangeText={(t) => {
                setFormName(t);
                setNameError('');
              }}
              placeholder="ex: Rápida"
              autoCapitalize="sentences"
              editable={!isSaving}
            />
            {nameError ? <Text style={s.fieldError}>{nameError}</Text> : null}
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
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  listContent: { paddingHorizontal: 16, paddingBottom: 80, paddingTop: 12 },
  empty: { color: '#888888', textAlign: 'center', marginVertical: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rowName: { fontSize: 16, color: '#1A1A1A', flex: 1 },
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
});
