import { useCallback, useState, useEffect } from 'react';
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
  Alert,
  type ListRenderItemInfo,
} from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import {
  NestedReorderableList,
  ScrollViewContainer,
  reorderItems,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { useRepository } from '../../../../hooks/use-repository';
import { useAuthStore } from '../../../../stores/auth.store';
import { RECIPE_TYPE_LIST, DEFAULT_SERVINGS } from '../../../../constants/recipe-defaults';
import { logger } from '../../../../utils/logger';
import { PageHeader } from '../../../../components/page-header';
import { IngredientRowCell, StepRowCell } from '../../../../components/recipes/recipe-row-cells';
import { DishTypeTag } from '../../../../components/common/dish-type-tag';
import { useModalKeyboardScroll } from '../../../../hooks/use-modal-keyboard-scroll';
import type { RecipeType, RecipeCategory, RecipeTag, RecipeWithDetails } from '../../../../types/recipe.types';

interface IngredientRow {
  key: string;
  name: string;
  quantity: string;
}

interface StepRow {
  key: string;
  text: string;
}

let _keyCounter = 0;
function nextKey() {
  return `ek${++_keyCounter}`;
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
  const [source, setSource] = useState('');
  const [link, setLink] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { key: nextKey(), name: '', quantity: '' },
  ]);
  const [steps, setSteps] = useState<StepRow[]>([{ key: nextKey(), text: '' }]);
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

  const { keyboardHeight, scrollViewRef, getInputProps } = useModalKeyboardScroll({
    inputKeys: ['inlineName'],
  });

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
    setSource(recipe.source ?? '');
    setLink(recipe.sourceUrl ?? '');
    setImageUri(recipe.imageUrl);
    setIngredients(
      recipe.ingredients.map((i) => ({ key: nextKey(), name: i.ingredientName, quantity: i.quantity ?? '' })),
    );
    setSteps(recipe.steps.map((s) => ({ key: nextKey(), text: s.stepText })));
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
  const addIngredient = useCallback(() => {
    setIngredients((prev) => [...prev, { key: nextKey(), name: '', quantity: '' }]);
  }, []);

  const removeIngredient = useCallback((index: number) => {
    setIngredients((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const updateIngredientName = useCallback((index: number, value: string) => {
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: value };
      return updated;
    });
  }, []);

  const updateIngredientQuantity = useCallback((index: number, value: string) => {
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: value };
      return updated;
    });
  }, []);

  const handleIngredientReorder = useCallback(({ from, to }: ReorderableListReorderEvent) => {
    setIngredients((prev) => reorderItems(prev, from, to));
  }, []);

  const renderIngredient = useCallback(
    ({ item, index }: ListRenderItemInfo<IngredientRow>) => (
      <IngredientRowCell
        index={index}
        name={item.name}
        quantity={item.quantity}
        showRemove={ingredients.length > 1}
        onChangeName={updateIngredientName}
        onChangeQuantity={updateIngredientQuantity}
        onRemove={removeIngredient}
      />
    ),
    [ingredients.length, updateIngredientName, updateIngredientQuantity, removeIngredient],
  );

  // Steps helpers
  const addStep = useCallback(() => {
    setSteps((prev) => [...prev, { key: nextKey(), text: '' }]);
  }, []);

  const removeStep = useCallback((index: number) => {
    setSteps((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const updateStepText = useCallback((index: number, value: string) => {
    setSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text: value };
      return updated;
    });
  }, []);

  const handleStepReorder = useCallback(({ from, to }: ReorderableListReorderEvent) => {
    setSteps((prev) => reorderItems(prev, from, to));
  }, []);

  const renderStep = useCallback(
    ({ item, index }: ListRenderItemInfo<StepRow>) => (
      <StepRowCell
        index={index}
        text={item.text}
        showRemove={steps.length > 1}
        onChangeText={updateStepText}
        onRemove={removeStep}
      />
    ),
    [steps.length, updateStepText, removeStep],
  );

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

  function handleDelete() {
    if (!recipe || !recipeId) return;
    Alert.alert(
      'Eliminar receita',
      `Tem a certeza que quer eliminar "${recipe.name}"? Esta acção não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await recipeRepo.delete(recipeId);
              router.dismiss(2);
            } catch (err) {
              const msg = err instanceof Error ? err.message : '';
              if (msg.includes('RESTRICT') || msg.includes('violates foreign key')) {
                showError('Esta receita está associada a uma ementa semanal. Remova a associação primeiro.');
              } else {
                showError('Não foi possível eliminar a receita');
              }
              logger.error('EditRecipeScreen', 'delete failed', err);
            }
          },
        },
      ],
    );
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
        sourceUrl: link.trim() ? link.trim() : null,
        source: source.trim() ? source.trim() : null,
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
    <GestureHandlerRootView style={s.flex}>
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <PageHeader title="Editar Receita" showBack imageUri={imageUri} fallbackColor="#F5F5F5" />

      <ScrollViewContainer style={s.flex} contentContainerStyle={s.form}>
        {/* Name */}
        <Text style={s.label}>Nome *</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Nome da receita"
          placeholderTextColor="#CCCCCC"
        />

        {/* Source + Link */}
        <Text style={s.label}>Fonte</Text>
        <TextInput
          style={s.input}
          value={source}
          onChangeText={setSource}
          placeholder="Ex: Panelinha"
          placeholderTextColor="#CCCCCC"
        />

        <Text style={s.label}>Link</Text>
        <TextInput
          style={s.input}
          value={link}
          onChangeText={setLink}
          placeholder="https://..."
          placeholderTextColor="#CCCCCC"
          autoCapitalize="none"
          keyboardType="url"
        />

        {/* Type */}
        <Text style={s.label}>Tipo *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.typeScroll}
          contentContainerStyle={s.typeScrollContent}
        >
          {RECIPE_TYPE_LIST.map((t) => (
            <DishTypeTag
              key={t.key}
              typeKey={t.key}
              variant={type === t.key ? 'filled' : 'outlined'}
              size="md"
              onPress={() => setType(t.key)}
            />
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
        <NestedReorderableList
          data={ingredients}
          keyExtractor={(item) => item.key}
          onReorder={handleIngredientReorder}
          renderItem={renderIngredient}
          shouldUpdateActiveItem
        />
        <TouchableOpacity style={s.addRowBtn} onPress={addIngredient}>
          <Text style={s.addRowBtnText}>+ Adicionar ingrediente</Text>
        </TouchableOpacity>

        {/* Steps */}
        <Text style={s.sectionTitle}>Passos *</Text>
        <NestedReorderableList
          data={steps}
          keyExtractor={(item) => item.key}
          onReorder={handleStepReorder}
          renderItem={renderStep}
          shouldUpdateActiveItem
        />
        <TouchableOpacity style={s.addRowBtn} onPress={addStep}>
          <Text style={s.addRowBtnText}>+ Adicionar passo</Text>
        </TouchableOpacity>

        {/* Actions */}
        <View style={s.buttonRow}>
          <TouchableOpacity
            style={s.deleteButton}
            onPress={handleDelete}
            disabled={isSaving}
          >
            <Text style={s.deleteText}>Eliminar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.cancelButton}
            onPress={() => router.back()}
            disabled={isSaving}
          >
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveButton, isSaving && s.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={s.saveButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollViewContainer>

      {/* Inline Category Modal */}
      <Modal
        visible={inlineCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setInlineCategoryModal(false)}
      >
        <View style={s.inlineModalOverlay}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ paddingBottom: keyboardHeight }}
            keyboardShouldPersistTaps="handled"
          >
          <View style={s.inlineSheet}>
            <Text style={s.inlineSheetTitle}>Nova Categoria</Text>
            <TextInput
              {...getInputProps('inlineName')}
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
          </ScrollView>
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
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ paddingBottom: keyboardHeight }}
            keyboardShouldPersistTaps="handled"
          >
          <View style={s.inlineSheet}>
            <Text style={s.inlineSheetTitle}>Nova Etiqueta</Text>
            <TextInput
              {...getInputProps('inlineName')}
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
          </ScrollView>
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
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  loadErrorText: { fontSize: 16, color: '#888888', marginBottom: 16 },
  backLink: { paddingHorizontal: 16, paddingVertical: 8 },
  backLinkText: { fontSize: 14, color: '#B5451B', fontWeight: '600' },
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
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
  typeScrollContent: { gap: 8, paddingRight: 16, alignItems: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  rowItem: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginTop: 20, marginBottom: 8 },
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
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  deleteButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D32F2F',
    alignItems: 'center',
  },
  deleteText: { color: '#D32F2F', fontSize: 14, fontWeight: '600' },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
  },
  cancelText: { color: '#1A1A1A', fontSize: 16 },
  saveButton: {
    flex: 1,
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
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
