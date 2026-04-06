import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useRepository } from '../../../../hooks/use-repository';
import { useAuthStore } from '../../../../stores/auth.store';
import { RECIPE_TYPE_LIST, DEFAULT_SERVINGS } from '../../../../constants/recipe-defaults';
import { logger } from '../../../../utils/logger';
import type { RecipeType, RecipeCategory, RecipeTag, RecipeWithDetails } from '../../../../types/recipe.types';

interface IngredientRow {
  name: string;
  quantity: string;
}

interface StepRow {
  text: string;
}

export default function EditRecipeScreen() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const recipeRepo = useRepository('recipe');
  const recipeCategoryRepo = useRepository('recipeCategory');
  const recipeTagRepo = useRepository('recipeTag');
  const { userAccount } = useAuthStore();
  const familyId = userAccount?.familyId;

  const [recipe, setRecipe] = useState<RecipeWithDetails | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<RecipeType>('main');
  const [servings, setServings] = useState(String(DEFAULT_SERVINGS));
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [cost, setCost] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { name: '', quantity: '' },
  ]);
  const [steps, setSteps] = useState<StepRow[]>([{ text: '' }]);
  const [allCategories, setAllCategories] = useState<RecipeCategory[]>([]);
  const [allTags, setAllTags] = useState<RecipeTag[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [inlineCategoryModal, setInlineCategoryModal] = useState(false);
  const [inlineTagModal, setInlineTagModal] = useState(false);
  const [inlineName, setInlineName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  // Load recipe and populate form
  useEffect(() => {
    if (!recipeId) return;
    (async () => {
      try {
        const data = await recipeRepo.getById(recipeId);
        if (!data) {
          setLoadError('Receita não encontrada');
        } else {
          setRecipe(data);
        }
      } catch (err) {
        logger.error('EditRecipeScreen', 'load failed', err);
        setLoadError('Não foi possível carregar a receita');
      } finally {
        setIsLoadingRecipe(false);
      }
    })();
  }, [recipeId, recipeRepo]);

  // Pre-populate form when recipe loads
  useEffect(() => {
    if (!recipe) return;
    setName(recipe.name);
    setType(recipe.type);
    setServings(String(recipe.servings));
    setPrepTime(recipe.prepTimeMinutes != null ? String(recipe.prepTimeMinutes) : '');
    setCookTime(recipe.cookTimeMinutes != null ? String(recipe.cookTimeMinutes) : '');
    setCost(recipe.cost ?? '');
    setImageUri(recipe.imageUrl);
    setIngredients(
      recipe.ingredients.map((i) => ({ name: i.ingredientName, quantity: i.quantity ?? '' })),
    );
    setSteps(recipe.steps.map((s) => ({ text: s.stepText })));
    setSelectedCategoryIds(recipe.categories.map((c) => c.id));
    setSelectedTagIds(recipe.tags.map((t) => t.id));
  }, [recipe]);

  // Load categories and tags for pickers
  useEffect(() => {
    if (!familyId) return;
    recipeCategoryRepo.getAll(familyId).then(setAllCategories).catch(() => {});
    recipeTagRepo.getAll(familyId).then(setAllTags).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  function showError(msg: string) {
    setErrorMsg(msg);
    setErrorVisible(true);
  }

  // Ingredients helpers
  function addIngredient() {
    setIngredients([...ingredients, { name: '', quantity: '' }]);
  }

  function removeIngredient(index: number) {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function updateIngredient(
    index: number,
    field: 'name' | 'quantity',
    value: string,
  ) {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  }

  // Steps helpers
  function addStep() {
    setSteps([...steps, { text: '' }]);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(index: number, value: string) {
    const updated = [...steps];
    updated[index] = { text: value };
    setSteps(updated);
  }

  function moveIngredient(index: number, direction: 'up' | 'down') {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= ingredients.length) return;
    const updated = [...ingredients];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setIngredients(updated);
  }

  function moveStep(index: number, direction: 'up' | 'down') {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= steps.length) return;
    const updated = [...steps];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setSteps(updated);
  }

  // Image picker
  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showError('Permissão da câmara necessária para tirar fotos');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  }

  // Category/Tag helpers
  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function handleInlineCreateCategory() {
    if (!familyId || !inlineName.trim()) return;
    try {
      const newCat = await recipeCategoryRepo.create({
        familyId,
        name: inlineName.trim(),
      });
      setAllCategories([...allCategories, newCat]);
      setSelectedCategoryIds([...selectedCategoryIds, newCat.id]);
      setInlineName('');
      setInlineCategoryModal(false);
    } catch (err) {
      logger.error('EditRecipeScreen', 'inline category create failed', err);
      showError('Não foi possível criar a categoria');
    }
  }

  async function handleInlineCreateTag() {
    if (!familyId || !inlineName.trim()) return;
    try {
      const newTag = await recipeTagRepo.create({
        familyId,
        name: inlineName.trim(),
      });
      setAllTags([...allTags, newTag]);
      setSelectedTagIds([...selectedTagIds, newTag.id]);
      setInlineName('');
      setInlineTagModal(false);
    } catch (err) {
      logger.error('EditRecipeScreen', 'inline tag create failed', err);
      showError('Não foi possível criar a etiqueta');
    }
  }

  // Validation and save
  async function handleSave() {
    if (!recipeId) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      showError('O nome é obrigatório');
      return;
    }

    const validIngredients = ingredients.filter((i) => i.name.trim());
    if (validIngredients.length === 0) {
      showError('Adicione pelo menos um ingrediente');
      return;
    }

    const validSteps = steps.filter((s) => s.text.trim());
    if (validSteps.length === 0) {
      showError('Adicione pelo menos um passo');
      return;
    }

    setIsSaving(true);
    try {
      await recipeRepo.update(recipeId, {
        name: trimmedName,
        type,
        servings: parseInt(servings, 10) || DEFAULT_SERVINGS,
        prepTimeMinutes: prepTime ? parseInt(prepTime, 10) : undefined,
        cookTimeMinutes: cookTime ? parseInt(cookTime, 10) : undefined,
        cost: cost.trim() || undefined,
        imageUrl: imageUri ?? undefined,
        ingredients: validIngredients.map((ing, i) => ({
          ingredientName: ing.name.trim(),
          quantity: ing.quantity.trim() || undefined,
          sortOrder: i,
        })),
        steps: validSteps.map((step, i) => ({
          stepNumber: i + 1,
          stepText: step.text.trim(),
        })),
        categoryIds: selectedCategoryIds,
        tagIds: selectedTagIds,
      });
      router.back();
    } catch (err) {
      logger.error('EditRecipeScreen', 'save failed', err);
      showError('Não foi possível atualizar a receita');
    } finally {
      setIsSaving(false);
    }
  }

  // Loading / error states
  if (isLoadingRecipe) {
    return (
      <View style={s.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (loadError || !recipe) {
    return (
      <View style={s.centered}>
        <Text style={s.loadErrorText}>{loadError ?? 'Receita não encontrada'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backLink}>
          <Text style={s.backLinkText}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.headerBack}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Editar Receita</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={s.flex} contentContainerStyle={s.form}>
        {/* Name */}
        <Text style={s.label}>Nome *</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Nome da receita"
          placeholderTextColor="#CCCCCC"
        />

        {/* Type */}
        <Text style={s.label}>Tipo *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.typeScroll}
        >
          {RECIPE_TYPE_LIST.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[s.typeChip, type === t.key && s.typeChipActive]}
              onPress={() => setType(t.key)}
            >
              <Text
                style={[
                  s.typeChipText,
                  type === t.key && s.typeChipTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Servings, Prep Time, Cook Time */}
        <View style={s.row}>
          <View style={s.rowItem}>
            <Text style={s.label}>Porções</Text>
            <TextInput
              style={s.input}
              value={servings}
              onChangeText={setServings}
              keyboardType="numeric"
              placeholder="4"
              placeholderTextColor="#CCCCCC"
            />
          </View>
          <View style={s.rowItem}>
            <Text style={s.label}>Prep (min)</Text>
            <TextInput
              style={s.input}
              value={prepTime}
              onChangeText={setPrepTime}
              keyboardType="numeric"
              placeholder="15"
              placeholderTextColor="#CCCCCC"
            />
          </View>
          <View style={s.rowItem}>
            <Text style={s.label}>Cozinhar (min)</Text>
            <TextInput
              style={s.input}
              value={cookTime}
              onChangeText={setCookTime}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor="#CCCCCC"
            />
          </View>
        </View>

        {/* Cost */}
        <Text style={s.label}>Custo</Text>
        <TextInput
          style={s.input}
          value={cost}
          onChangeText={setCost}
          placeholder="Ex: €5"
          placeholderTextColor="#CCCCCC"
        />

        {/* Image */}
        <Text style={s.label}>Imagem</Text>
        {imageUri ? (
          <View style={s.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={s.imagePreview} />
            <TouchableOpacity
              style={s.imageRemove}
              onPress={() => setImageUri(null)}
            >
              <Text style={s.imageRemoveText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.imageButtons}>
            <TouchableOpacity style={s.imageBtn} onPress={pickImage}>
              <Text style={s.imageBtnText}>📷 Galeria</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.imageBtn} onPress={takePhoto}>
              <Text style={s.imageBtnText}>📸 Câmara</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Categories */}
        <Text style={s.label}>Categorias</Text>
        <View style={s.chipContainer}>
          {allCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[s.chip, selectedCategoryIds.includes(cat.id) && s.chipSelected]}
              onPress={() => toggleCategory(cat.id)}
            >
              <Text style={[s.chipText, selectedCategoryIds.includes(cat.id) && s.chipTextSelected]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={s.chipAdd}
            onPress={() => { setInlineName(''); setInlineCategoryModal(true); }}
          >
            <Text style={s.chipAddText}>+ Nova</Text>
          </TouchableOpacity>
        </View>

        {/* Tags */}
        <Text style={s.label}>Etiquetas</Text>
        <View style={s.chipContainer}>
          {allTags.map((tag) => (
            <TouchableOpacity
              key={tag.id}
              style={[s.chip, selectedTagIds.includes(tag.id) && s.chipSelected]}
              onPress={() => toggleTag(tag.id)}
            >
              <Text style={[s.chipText, selectedTagIds.includes(tag.id) && s.chipTextSelected]}>
                {tag.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={s.chipAdd}
            onPress={() => { setInlineName(''); setInlineTagModal(true); }}
          >
            <Text style={s.chipAddText}>+ Nova</Text>
          </TouchableOpacity>
        </View>

        {/* Ingredients */}
        <Text style={s.sectionTitle}>Ingredientes *</Text>
        {ingredients.map((ing, i) => (
          <View key={i} style={s.dynamicRow}>
            <View style={s.dynamicRowInputs}>
              <TextInput
                style={[s.input, s.ingredientName]}
                value={ing.name}
                onChangeText={(v) => updateIngredient(i, 'name', v)}
                placeholder="Ingrediente"
                placeholderTextColor="#CCCCCC"
              />
              <TextInput
                style={[s.input, s.ingredientQty]}
                value={ing.quantity}
                onChangeText={(v) => updateIngredient(i, 'quantity', v)}
                placeholder="Qtd"
                placeholderTextColor="#CCCCCC"
              />
            </View>
            <View style={s.dynamicRowActions}>
              {i > 0 && (
                <TouchableOpacity onPress={() => moveIngredient(i, 'up')}>
                  <Text style={s.actionBtn}>↑</Text>
                </TouchableOpacity>
              )}
              {i < ingredients.length - 1 && (
                <TouchableOpacity onPress={() => moveIngredient(i, 'down')}>
                  <Text style={s.actionBtn}>↓</Text>
                </TouchableOpacity>
              )}
              {ingredients.length > 1 && (
                <TouchableOpacity onPress={() => removeIngredient(i)}>
                  <Text style={s.removeBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
        <TouchableOpacity style={s.addRowBtn} onPress={addIngredient}>
          <Text style={s.addRowBtnText}>+ Adicionar ingrediente</Text>
        </TouchableOpacity>

        {/* Steps */}
        <Text style={s.sectionTitle}>Passos *</Text>
        {steps.map((step, i) => (
          <View key={i} style={s.dynamicRow}>
            <View style={s.stepNumberContainer}>
              <Text style={s.stepNumber}>{i + 1}.</Text>
            </View>
            <TextInput
              style={[s.input, s.stepInput]}
              value={step.text}
              onChangeText={(v) => updateStep(i, v)}
              placeholder={`Passo ${i + 1}`}
              placeholderTextColor="#CCCCCC"
              multiline
            />
            <View style={s.dynamicRowActions}>
              {i > 0 && (
                <TouchableOpacity onPress={() => moveStep(i, 'up')}>
                  <Text style={s.actionBtn}>↑</Text>
                </TouchableOpacity>
              )}
              {i < steps.length - 1 && (
                <TouchableOpacity onPress={() => moveStep(i, 'down')}>
                  <Text style={s.actionBtn}>↓</Text>
                </TouchableOpacity>
              )}
              {steps.length > 1 && (
                <TouchableOpacity onPress={() => removeStep(i)}>
                  <Text style={s.removeBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
        <TouchableOpacity style={s.addRowBtn} onPress={addStep}>
          <Text style={s.addRowBtnText}>+ Adicionar passo</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity
          style={[s.saveBtn, isSaving && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.saveBtnText}>Guardar Alterações</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Inline Category Modal */}
      <Modal
        visible={inlineCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setInlineCategoryModal(false)}
      >
        <View style={s.inlineModalOverlay}>
          <View style={s.inlineSheet}>
            <Text style={s.inlineSheetTitle}>Nova Categoria</Text>
            <TextInput
              style={s.input}
              value={inlineName}
              onChangeText={setInlineName}
              placeholder="Nome da categoria"
              placeholderTextColor="#CCCCCC"
              autoCapitalize="sentences"
              autoFocus
            />
            <View style={s.inlineSheetBtns}>
              <TouchableOpacity style={s.inlineCancelBtn} onPress={() => setInlineCategoryModal(false)}>
                <Text style={s.inlineCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.inlineSaveBtn} onPress={handleInlineCreateCategory}>
                <Text style={s.inlineSaveText}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Inline Tag Modal */}
      <Modal
        visible={inlineTagModal}
        animationType="slide"
        transparent
        onRequestClose={() => setInlineTagModal(false)}
      >
        <View style={s.inlineModalOverlay}>
          <View style={s.inlineSheet}>
            <Text style={s.inlineSheetTitle}>Nova Etiqueta</Text>
            <TextInput
              style={s.input}
              value={inlineName}
              onChangeText={setInlineName}
              placeholder="Nome da etiqueta"
              placeholderTextColor="#CCCCCC"
              autoCapitalize="sentences"
              autoFocus
            />
            <View style={s.inlineSheetBtns}>
              <TouchableOpacity style={s.inlineCancelBtn} onPress={() => setInlineTagModal(false)}>
                <Text style={s.inlineCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.inlineSaveBtn} onPress={handleInlineCreateTag}>
                <Text style={s.inlineSaveText}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={errorVisible}
        onDismiss={() => setErrorVisible(false)}
        duration={3000}
        style={s.snackbar}
        theme={{
          colors: {
            inverseSurface: '#D32F2F',
            inverseOnSurface: '#FFFFFF',
          },
        }}
      >
        {errorMsg}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  loadErrorText: { fontSize: 16, color: '#888888', marginBottom: 16 },
  backLink: { paddingHorizontal: 16, paddingVertical: 8 },
  backLinkText: { fontSize: 14, color: '#B5451B', fontWeight: '600' },
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerBack: { fontSize: 14, color: '#B5451B', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  form: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#666666', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1A1A1A',
  },
  typeScroll: { marginTop: 4, marginBottom: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F5F5F5', marginRight: 8 },
  typeChipActive: { backgroundColor: '#B5451B' },
  typeChipText: { fontSize: 13, color: '#666666', fontWeight: '600' },
  typeChipTextActive: { color: '#FFFFFF' },
  row: { flexDirection: 'row', gap: 8 },
  rowItem: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginTop: 20, marginBottom: 8 },
  dynamicRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  dynamicRowInputs: { flex: 1, flexDirection: 'row', gap: 8 },
  dynamicRowActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4 },
  ingredientName: { flex: 2 },
  ingredientQty: { flex: 1 },
  stepNumberContainer: { width: 24, alignItems: 'center' },
  stepNumber: { fontSize: 14, fontWeight: '600', color: '#888888' },
  stepInput: { flex: 1 },
  actionBtn: { fontSize: 16, color: '#888888', paddingHorizontal: 4 },
  removeBtn: { fontSize: 16, color: '#D32F2F', paddingHorizontal: 4 },
  addRowBtn: { paddingVertical: 10 },
  addRowBtnText: { fontSize: 14, color: '#B5451B', fontWeight: '600' },
  imageButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  imageBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F5F5F5' },
  imageBtnText: { fontSize: 14, color: '#1A1A1A' },
  imagePreviewContainer: { marginTop: 4, position: 'relative' },
  imagePreview: { width: '100%', height: 180, borderRadius: 8 },
  imageRemove: {
    position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  imageRemoveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  saveBtn: { backgroundColor: '#B5451B', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' },
  chipSelected: { backgroundColor: '#B5451B', borderColor: '#B5451B' },
  chipText: { fontSize: 13, color: '#666666' },
  chipTextSelected: { color: '#FFFFFF' },
  chipAdd: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#B5451B', borderStyle: 'dashed' },
  chipAddText: { fontSize: 13, color: '#B5451B', fontWeight: '600' },
  inlineModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  inlineSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 40 },
  inlineSheetTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  inlineSheetBtns: { flexDirection: 'row', gap: 12, marginTop: 12 },
  inlineCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CCCCCC', alignItems: 'center' },
  inlineCancelText: { color: '#1A1A1A', fontSize: 15 },
  inlineSaveBtn: { flex: 1, backgroundColor: '#B5451B', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  inlineSaveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  snackbar: { position: 'absolute', top: 48 },
});
