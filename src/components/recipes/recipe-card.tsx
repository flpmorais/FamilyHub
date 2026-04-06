import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import { RECIPE_TYPES } from '../../constants/recipe-defaults';
import type { Recipe } from '../../types/recipe.types';

interface RecipeCardProps {
  recipe: Recipe;
  onPress: (recipe: Recipe) => void;
}

export function RecipeCard({ recipe, onPress }: RecipeCardProps) {
  const totalTime =
    (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => onPress(recipe)}
      activeOpacity={0.7}
    >
      {recipe.imageUrl ? (
        <Image source={{ uri: recipe.imageUrl }} style={s.thumbnail} />
      ) : (
        <View style={s.thumbnailPlaceholder}>
          <Text style={s.thumbnailIcon}>🍽</Text>
        </View>
      )}
      <View style={s.content}>
        <Text style={s.name} numberOfLines={1}>
          {recipe.name}
        </Text>
        <View style={s.meta}>
          <View style={s.typeChip}>
            <Text style={s.typeText}>{RECIPE_TYPES[recipe.type]}</Text>
          </View>
          {totalTime > 0 && (
            <Text style={s.metaText}>{totalTime} min</Text>
          )}
          <Text style={s.metaText}>{recipe.servings} porções</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  thumbnailIcon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeChip: {
    backgroundColor: '#B5451B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 12,
    color: '#888888',
  },
});
