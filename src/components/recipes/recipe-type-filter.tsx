import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { RECIPE_TYPE_LIST } from '../../constants/recipe-defaults';
import { DishTypeTag } from '../common/dish-type-tag';
import type { RecipeType } from '../../types/recipe.types';

interface RecipeTypeFilterProps {
  counts: Record<string, number>;
  activeType: RecipeType | null;
  onSelect: (type: RecipeType | null) => void;
}

export function RecipeTypeFilter({ counts, activeType, onSelect }: RecipeTypeFilterProps) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.container}
      contentContainerStyle={s.content}
    >
      <TouchableOpacity
        style={[s.allChip, !activeType && s.allChipActive]}
        onPress={() => onSelect(null)}
      >
        <Text style={[s.allChipText, !activeType && s.allChipTextActive]}>Todos ({total})</Text>
      </TouchableOpacity>
      {RECIPE_TYPE_LIST.map((t) => {
        const count = counts[t.key] ?? 0;
        if (count === 0) return null;
        return (
          <View key={t.key}>
            <DishTypeTag
              typeKey={t.key}
              variant={activeType === t.key ? 'filled' : 'outlined'}
              size="md"
              count={count}
              onPress={() => onSelect(t.key)}
            />
          </View>
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
  allChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  allChipActive: {
    backgroundColor: '#B5451B',
  },
  allChipText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
  },
  allChipTextActive: {
    color: '#FFFFFF',
  },
});
