import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Snackbar, Icon } from 'react-native-paper';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useRepository } from '../../../../hooks/use-repository';
import { supabaseClient } from '../../../../repositories/supabase/supabase.client';
import { DishTypeTag } from '../../../../components/common/dish-type-tag';
import { RecipeSource } from '../../../../components/recipes/recipe-source';
import { scaleQuantity } from '../../../../services/recipe-scaling.service';
import { generateShoppingList } from '../../../../services/shopping-list-generator.service';
import { generateRecipePdf } from '../../../../services/recipe-pdf.service';
import { ServingsScaler } from '../../../../components/recipes/servings-scaler';
import { StarRating } from '../../../../components/recipes/star-rating';
import { RecipeRatingModal } from '../../../../components/recipes/recipe-rating-modal';
import { RecipeComments } from '../../../../components/recipes/recipe-comments';
import { useAuthStore } from '../../../../stores/auth.store';
import { logger } from '../../../../utils/logger';
import type { RecipeWithDetails, RecipeRatingSummary } from '../../../../types/recipe.types';

export default function RecipeDetailScreen() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const recipeRepo = useRepository('recipe');
  const recipeRatingRepo = useRepository('recipeRating');
  const { userAccount } = useAuthStore();

  const [recipe, setRecipe] = useState<RecipeWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetServings, setTargetServings] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [ratingSummary, setRatingSummary] = useState<RecipeRatingSummary>({ average: null, count: 0 });
  const [ratingModalVisible, setRatingModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!recipeId) return;
      setIsLoading(true);
      recipeRepo
        .getById(recipeId)
        .then((data) => {
          if (!data) setError('Receita não encontrada');
          else {
            setRecipe(data);
            setError(null);
            setTargetServings(data.servings);
            recipeRatingRepo.getSummary(data.id).then(setRatingSummary).catch(() => {});
          }
        })
        .catch((err) => {
          logger.error('RecipeDetailScreen', 'load failed', err);
          setError('Não foi possível carregar a receita');
        })
        .finally(() => setIsLoading(false));
    }, [recipeId, recipeRepo]),
  );

  // Real-time subscription for this specific recipe
  useEffect(() => {
    if (!recipeId) return;

    const channel = supabaseClient
      .channel(`recipe-detail-${recipeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recipes',
          filter: `id=eq.${recipeId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            logger.info('RecipeDetailScreen', 'recipe deleted by another admin');
            setRecipe(null);
            setError('Esta receita foi eliminada');
            setTimeout(() => router.back(), 1500);
          } else if (payload.eventType === 'UPDATE') {
            logger.info('RecipeDetailScreen', 'recipe updated by another admin');
            recipeRepo.getById(recipeId).then((data) => {
              if (data) { setRecipe(data); setTargetServings(data.servings); }
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [recipeId, recipeRepo]);

  async function handleShare() {
    if (!recipe) return;
    setIsSharing(true);
    try {
      const Sharing = await import('expo-sharing');
      if (!(await Sharing.isAvailableAsync())) {
        setErrorMsg('Partilha não disponível neste dispositivo');
        setErrorVisible(true);
        return;
      }
      const fileUri = await generateRecipePdf(recipe);
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: recipe.name,
      });
    } catch (err) {
      logger.error('RecipeDetailScreen', 'share failed', err);
      setErrorMsg('Não foi possível partilhar a receita. Requer um development build.');
      setErrorVisible(true);
    } finally {
      setIsSharing(false);
    }
  }

  async function handleAddToShoppingList() {
    if (!recipe) return;

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      setErrorMsg('Esta receita não tem ingredientes');
      setErrorVisible(true);
      return;
    }

    setIsGenerating(true);
    try {
      const items = generateShoppingList(
        [{ recipeId: recipe.id, servingsOverride: targetServings || recipe.servings }],
        new Map([[recipe.id, recipe]]),
      );

      if (items.length === 0) {
        setErrorMsg('Nenhum ingrediente encontrado');
        setErrorVisible(true);
        return;
      }

      router.push({
        pathname: "/(app)/(recipes)/shopping-list-review",
        params: { itemsJson: JSON.stringify(items) },
      } as any);
    } catch (err) {
      logger.error('RecipeDetailScreen', 'generate shopping list failed', err);
      setErrorMsg('Erro ao gerar a lista de compras');
      setErrorVisible(true);
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>{error ?? 'Receita não encontrada'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalTime =
    (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);

  return (
    <ScrollView style={s.container}>
      {/* Image */}
      {recipe.imageUrl ? (
        <Image source={{ uri: recipe.imageUrl }} style={s.heroImage} />
      ) : (
        <View style={s.heroPlaceholder}>
          <Text style={s.heroPlaceholderIcon}>🍽</Text>
        </View>
      )}

      {/* Floating buttons */}
      <TouchableOpacity style={s.floatingBack} onPress={() => router.back()}>
        <Text style={s.floatingBackText}>← Voltar</Text>
      </TouchableOpacity>
      <View style={s.floatingRight}>
        <TouchableOpacity
          style={s.floatingPill}
          onPress={handleShare}
          disabled={isSharing}
        >
          <Text style={s.floatingPillText}>{isSharing ? 'A gerar...' : 'Partilhar 📤'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.floatingPill}
          onPress={() => router.push(`/(app)/(recipes)/${recipeId}/edit` as any)}
        >
          <Text style={s.floatingPillText}>Editar ✎</Text>
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        {/* Name and type */}
        <View style={s.titleRow}>
          <Text style={[s.name, { marginBottom: 0, flex: 1 }]}>{recipe.name}</Text>
          <TouchableOpacity
            style={[s.cartBtn, isGenerating && s.cartBtnDisabled]}
            onPress={handleAddToShoppingList}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Icon source="cart-plus" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
        <View style={s.typeRatingRow}>
          <DishTypeTag typeKey={recipe.type} variant="filled" size="md" />
          <TouchableOpacity
            style={s.ratingTouchable}
            onPress={() => setRatingModalVisible(true)}
            activeOpacity={0.7}
          >
            <StarRating
              rating={ratingSummary.average}
              count={ratingSummary.count}
              size={16}
            />
          </TouchableOpacity>
        </View>
        {(recipe.categories.length > 0 || recipe.tags.length > 0) && (
          <View style={s.chipRow}>
            {recipe.categories.map((cat) => (
              <View key={cat.id} style={s.catChip}>
                <Text style={s.catChipText}>{cat.name}</Text>
              </View>
            ))}
            {recipe.tags.map((tag) => (
              <View key={tag.id} style={s.tagChip}>
                <Text style={s.tagChipText}>{tag.name}</Text>
              </View>
            ))}
          </View>
        )}

        <RecipeSource source={recipe.source} sourceUrl={recipe.sourceUrl} />

        {/* Meta */}
        <View style={s.metaRow}>
          <ServingsScaler
            originalServings={recipe.servings}
            targetServings={targetServings || recipe.servings}
            onChangeServings={setTargetServings}
          />
          {recipe.prepTimeMinutes != null && (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>Preparação</Text>
              <Text style={s.metaValue}>{recipe.prepTimeMinutes} min</Text>
            </View>
          )}
          {recipe.cookTimeMinutes != null && (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>Cozinhar</Text>
              <Text style={s.metaValue}>{recipe.cookTimeMinutes} min</Text>
            </View>
          )}
          {totalTime > 0 && (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>Total</Text>
              <Text style={s.metaValue}>{totalTime} min</Text>
            </View>
          )}
        </View>

        {recipe.cost && (
          <Text style={s.cost}>Custo: {recipe.cost}</Text>
        )}

        {/* Ingredients */}
        <Text style={s.sectionTitle}>Ingredientes</Text>
        {recipe.ingredients.map((ing) => (
          <View key={ing.id} style={s.ingredientRow}>
            <Text style={s.ingredientName}>{ing.ingredientName}</Text>
            {ing.quantity && (
              <Text style={s.ingredientQty}>
                {scaleQuantity(ing.quantity, recipe.servings, targetServings || recipe.servings)}
              </Text>
            )}
          </View>
        ))}

        {/* Steps */}
        <Text style={s.sectionTitle}>Preparação</Text>
        {recipe.steps.map((step) => (
          <View key={step.id} style={s.stepRow}>
            <View style={s.stepNumberBadge}>
              <Text style={s.stepNumberText}>{step.stepNumber}</Text>
            </View>
            <Text style={s.stepText}>{step.stepText}</Text>
          </View>
        ))}

        {recipeId && userAccount?.profileId && (
          <RecipeComments
            recipeId={recipeId}
            currentProfileId={userAccount.profileId}
          />
        )}

        <View style={{ height: 40 }} />
      </View>

      {recipeId && userAccount?.profileId && (
        <RecipeRatingModal
          visible={ratingModalVisible}
          onClose={() => setRatingModalVisible(false)}
          recipeId={recipeId}
          profileId={userAccount.profileId}
          onRatingChanged={() => {
            if (recipeId) recipeRatingRepo.getSummary(recipeId).then(setRatingSummary).catch(() => {});
          }}
        />
      )}

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
    </ScrollView>
  );
}

const s = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  heroImage: {
    width: '100%',
    height: 150,
  },
  heroPlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderIcon: {
    fontSize: 48,
  },
  floatingBack: {
    position: 'absolute',
    top: 56,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  floatingBackText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  floatingRight: {
    position: 'absolute',
    top: 56,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  floatingPill: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  floatingPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  cartBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#B5451B',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cartBtnDisabled: {
    opacity: 0.5,
  },
  typeRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  ratingTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  catChip: {
    backgroundColor: '#E8E0D8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  catChipText: {
    color: '#5D4037',
    fontSize: 12,
    fontWeight: '600',
  },
  tagChip: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagChipText: {
    color: '#1565C0',
    fontSize: 12,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: '#888888',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 2,
  },
  cost: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 20,
    marginBottom: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  ingredientName: {
    fontSize: 15,
    color: '#1A1A1A',
    flex: 1,
  },
  ingredientQty: {
    fontSize: 15,
    color: '#888888',
    marginLeft: 12,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#B5451B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 15,
    color: '#1A1A1A',
    flex: 1,
    lineHeight: 22,
  },
  errorText: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 14,
    color: '#B5451B',
    fontWeight: '600',
  },
  snackbar: {
    position: 'absolute',
    top: 48,
  },
});
