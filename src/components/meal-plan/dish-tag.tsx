import { View, Text, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { DISH_CATEGORY_STYLES } from '../../constants/dish-category-styles';
import type { RecipeType } from '../../types/recipe.types';

interface DishTagProps {
  name: string;
  category: RecipeType;
}

export function DishTag({ name, category }: DishTagProps) {
  const style = DISH_CATEGORY_STYLES[category] ?? DISH_CATEGORY_STYLES.other;

  return (
    <View style={[s.tag, { backgroundColor: style.color }]}>
      <Icon source={style.icon} size={10} color="#FFF" />
      <Text style={s.text} numberOfLines={1}>{name}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  text: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
    maxWidth: 120,
  },
});
