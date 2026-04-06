import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useRepository } from '../../../../hooks/use-repository';
import { supabaseClient } from '../../../../repositories/supabase/supabase.client';
import { RECIPE_TYPES } from '../../../../constants/recipe-defaults';
import * as Sharing from 'expo-sharing';
import { scaleQuantity } from '../../../../services/recipe-scaling.service';
import { generateRecipePdf } from '../../../../services/recipe-pdf.service';
import { ServingsScaler } from '../../../../components/recipes/servings-scaler';
import { logger } from '../../../../utils/logger';
import type { RecipeWithDetails } from '../../../../types/recipe.types';

export default function RecipeDetailScreen() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const recipeRepo = useRepository('recipe');

  const [recipe, setRecipe] = useState<RecipeWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetServings, setTargetServings] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!recipeId) return;
      setIsLoading(true);
      recipeRepo
        .getById(recipeId)
        .then((data) => {
          if (!data) setError('Receita não encontrada');
          else { setRecipe(data); setError(null); setTargetServings(data.servings); }
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
      const fileUri = await generateRecipePdf(recipe);
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: recipe.name,
      });
    } catch (err) {
      logger.error('RecipeDetailScreen', 'share failed', err);
      setErrorMsg('Não foi possível partilhar a receita');
      setErrorVisible(true);
    } finally {
      setIsSharing(false);
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
              router.back();
            } catch (err) {
              const msg = err instanceof Error ? err.message : '';
              if (msg.includes('RESTRICT') || msg.includes('violates foreign key')) {
                setErrorMsg('Esta receita está associada a uma ementa semanal. Remova a associação primeiro.');
              } else {
                setErrorMsg('Não foi possível eliminar a receita');
              }
              setErrorVisible(true);
              logger.error('RecipeDetailScreen', 'delete failed', err);
            }
          },
        },
      ],
    );
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
        <Text style={s.name}>{recipe.name}</Text>
        <View style={s.chipRow}>
          <View style={s.typeChip}>
            <Text style={s.typeChipText}>{RECIPE_TYPES[recipe.type]}</Text>
          </View>
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

        {/* Delete */}
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
          <Text style={s.deleteBtnText}>Eliminar Receita</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>

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
    height: 220,
  },
  heroPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderIcon: {
    fontSize: 48,
  },
  floatingBack: {
    position: 'absolute',
    top: 44,
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
    top: 44,
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
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  typeChip: {
    backgroundColor: '#B5451B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
  deleteBtn: {
    marginTop: 32,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderRadius: 8,
  },
  deleteBtnText: {
    color: '#D32F2F',
    fontSize: 15,
    fontWeight: '600',
  },
  snackbar: {
    position: 'absolute',
    top: 48,
  },
});
