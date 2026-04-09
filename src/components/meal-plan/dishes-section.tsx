import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRepository } from '../../hooks/use-repository';
import { DishTypeTag } from '../common/dish-type-tag';
import { logger } from '../../utils/logger';
import { getDishDisplay } from '../../types/meal-plan.types';
import type { MealEntryDish, CreateDishInput } from '../../types/meal-plan.types';

interface DishesSectionProps {
  mealEntryId: string;
  dishes: MealEntryDish[];
  onChanged: () => void;
  onOpenAddDish: () => void;
}

export function DishesSection({ mealEntryId, dishes, onChanged, onOpenAddDish }: DishesSectionProps) {
  const mealPlanRepo = useRepository('mealPlan');

  async function handleAddDish(input: CreateDishInput) {
    try {
      await mealPlanRepo.addDishes(mealEntryId, [input]);
      onChanged();
    } catch (err) {
      logger.error('DishesSection', 'add dish failed', err);
      Alert.alert('Erro', 'Não foi possível adicionar o prato');
    }
  }

  async function handleRemove(dishId: string, dishName: string) {
    Alert.alert(
      'Remover prato',
      `Remover "${dishName}" desta refeição?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await mealPlanRepo.removeDish(dishId);
              onChanged();
            } catch (err) {
              logger.error('DishesSection', 'remove dish failed', err);
            }
          },
        },
      ],
    );
  }

  async function handleServingsChange(dishId: string, current: number, delta: number) {
    const newServings = Math.max(1, current + delta);
    if (newServings === current) return;
    try {
      await mealPlanRepo.updateDishServings(dishId, newServings);
      onChanged();
    } catch (err) {
      logger.error('DishesSection', 'servings update failed', err);
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.sectionLabel}>Pratos</Text>

      {dishes.map((dish) => {
        const display = getDishDisplay(dish);
        const showServings = dish.dishType === 'recipe' && dish.servingsOverride !== null;

        return (
          <View key={dish.id} style={s.dishCard}>
            <View style={s.dishInfo}>
              <View style={s.dishNameRow}>
                <DishTypeTag typeKey={display.category} variant="filled" size="sm" />
                <Text style={s.dishName} numberOfLines={1}>{display.name}</Text>
              </View>
              {showServings && (
                <View style={s.servingsRow}>
                  <TouchableOpacity
                    style={s.servingsBtn}
                    onPress={() => handleServingsChange(dish.id, dish.servingsOverride!, -1)}
                  >
                    <Text style={s.servingsBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.servingsValue}>{dish.servingsOverride}</Text>
                  <TouchableOpacity
                    style={s.servingsBtn}
                    onPress={() => handleServingsChange(dish.id, dish.servingsOverride!, 1)}
                  >
                    <Text style={s.servingsBtnText}>+</Text>
                  </TouchableOpacity>
                  <Text style={s.servingsLabel}>porções</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={s.removeBtn}
              onPress={() => handleRemove(dish.id, display.name)}
            >
              <Text style={s.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity style={s.addBtn} onPress={onOpenAddDish}>
        <Text style={s.addBtnText}>+ Adicionar</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  dishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  dishInfo: { flex: 1 },
  dishNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  dishName: { fontSize: 14, color: '#1A1A1A', fontWeight: '500', flex: 1 },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  servingsBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsBtnText: { fontSize: 14, fontWeight: '700', color: '#555' },
  servingsValue: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', minWidth: 20, textAlign: 'center' },
  servingsLabel: { fontSize: 12, color: '#888' },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  removeBtnText: { fontSize: 16, color: '#D32F2F', fontWeight: '700' },
  addBtn: { paddingVertical: 10 },
  addBtnText: { fontSize: 14, color: '#B5451B', fontWeight: '600' },
});
