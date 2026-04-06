import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRepository } from '../../hooks/use-repository';
import { RECIPE_TYPES } from '../../constants/recipe-defaults';
import { RecipeBrowserModal } from './recipe-browser-modal';
import { logger } from '../../utils/logger';
import type { MealEntryLinkedRecipe } from '../../types/meal-plan.types';
import type { Recipe, RecipeType } from '../../types/recipe.types';

interface LinkedRecipesSectionProps {
  mealEntryId: string;
  linkedRecipes: MealEntryLinkedRecipe[];
  onChanged: () => void;
}

export function LinkedRecipesSection({
  mealEntryId,
  linkedRecipes,
  onChanged,
}: LinkedRecipesSectionProps) {
  const mealPlanRepo = useRepository('mealPlan');
  const [browserVisible, setBrowserVisible] = useState(false);

  async function handleSelectRecipe(recipe: Recipe) {
    setBrowserVisible(false);
    try {
      await mealPlanRepo.linkRecipe(mealEntryId, recipe.id, recipe.servings);
      onChanged();
    } catch (err) {
      logger.error('LinkedRecipesSection', 'link failed', err);
      Alert.alert('Erro', 'Não foi possível associar a receita');
    }
  }

  async function handleUnlink(linkId: string, recipeName: string) {
    Alert.alert(
      'Remover associação',
      `Remover "${recipeName}" desta refeição?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await mealPlanRepo.unlinkRecipe(linkId);
              onChanged();
            } catch (err) {
              logger.error('LinkedRecipesSection', 'unlink failed', err);
            }
          },
        },
      ],
    );
  }

  async function handleServingsChange(linkId: string, current: number, delta: number) {
    const newServings = Math.max(1, current + delta);
    if (newServings === current) return;
    try {
      await mealPlanRepo.updateLinkedServings(linkId, newServings);
      onChanged();
    } catch (err) {
      logger.error('LinkedRecipesSection', 'servings update failed', err);
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.sectionLabel}>Receitas Associadas</Text>

      {linkedRecipes.map((link) => (
        <View key={link.id} style={s.recipeCard}>
          <View style={s.recipeInfo}>
            <View style={s.recipeNameRow}>
              <View style={s.typeBadge}>
                <Text style={s.typeBadgeText}>
                  {RECIPE_TYPES[link.recipeType as RecipeType] ?? link.recipeType}
                </Text>
              </View>
              <Text style={s.recipeName} numberOfLines={1}>{link.recipeName}</Text>
            </View>
            <View style={s.servingsRow}>
              <TouchableOpacity
                style={s.servingsBtn}
                onPress={() => handleServingsChange(link.id, link.servingsOverride, -1)}
              >
                <Text style={s.servingsBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.servingsValue}>{link.servingsOverride}</Text>
              <TouchableOpacity
                style={s.servingsBtn}
                onPress={() => handleServingsChange(link.id, link.servingsOverride, 1)}
              >
                <Text style={s.servingsBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={s.servingsLabel}>porções</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.removeBtn}
            onPress={() => handleUnlink(link.id, link.recipeName)}
          >
            <Text style={s.removeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={s.addBtn} onPress={() => setBrowserVisible(true)}>
        <Text style={s.addBtnText}>+ Associar Receita</Text>
      </TouchableOpacity>

      <RecipeBrowserModal
        visible={browserVisible}
        onSelect={handleSelectRecipe}
        onClose={() => setBrowserVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 8,
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  typeBadge: {
    backgroundColor: '#B5451B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  recipeName: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
    flex: 1,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  servingsBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555555',
  },
  servingsValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    minWidth: 20,
    textAlign: 'center',
  },
  servingsLabel: {
    fontSize: 12,
    color: '#888888',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  removeBtnText: {
    fontSize: 16,
    color: '#D32F2F',
    fontWeight: '700',
  },
  addBtn: {
    paddingVertical: 10,
  },
  addBtnText: {
    fontSize: 14,
    color: '#B5451B',
    fontWeight: '600',
  },
});
