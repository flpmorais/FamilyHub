import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { RECIPE_TYPE_LIST } from '../../constants/recipe-defaults';
import type { RecipeType, RecipeForList } from '../../types/recipe.types';

interface RecipeTypeFilterProps {
  recipes: RecipeForList[];
  activeType: RecipeType | null;
  onSelect: (type: RecipeType | null) => void;
}

export function RecipeTypeFilter({ recipes, activeType, onSelect }: RecipeTypeFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.container}
      contentContainerStyle={s.content}
    >
      <TouchableOpacity
        style={[s.chip, !activeType && s.chipActive]}
        onPress={() => onSelect(null)}
      >
        <Text style={[s.chipText, !activeType && s.chipTextActive]}>
          Todos ({recipes.length})
        </Text>
      </TouchableOpacity>
      {RECIPE_TYPE_LIST.map((t) => {
        const count = recipes.filter((r) => r.type === t.key).length;
        if (count === 0) return null;
        return (
          <TouchableOpacity
            key={t.key}
            style={[s.chip, activeType === t.key && s.chipActive]}
            onPress={() => onSelect(t.key)}
          >
            <Text style={[s.chipText, activeType === t.key && s.chipTextActive]}>
              {t.label} ({count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    maxHeight: 48,
  },
  content: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  chipActive: {
    backgroundColor: '#B5451B',
  },
  chipText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
