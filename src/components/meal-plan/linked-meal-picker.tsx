import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Icon } from 'react-native-paper';
import type { MealEntry, MealSlot } from '../../types/meal-plan.types';

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const SLOT_LABELS: Record<MealSlot, string> = { lunch: 'Almoço', dinner: 'Jantar' };

interface LinkedMealPickerProps {
  visible: boolean;
  meals: MealEntry[];
  onSelect: (meal: MealEntry) => void;
  onClose: () => void;
}

export function LinkedMealPicker({ visible, meals, onSelect, onClose }: LinkedMealPickerProps) {
  function formatMealLabel(meal: MealEntry): string {
    const dayLabel = DAY_LABELS[meal.dayOfWeek - 1] ?? '?';
    const slotLabel = SLOT_LABELS[meal.mealSlot] ?? '';
    return `${dayLabel} ${slotLabel}`;
  }

  function formatWeekLabel(weekStart: string): string {
    const [y, m, d] = weekStart.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
  }

  // Group meals by week
  const byWeek = meals.reduce<Record<string, MealEntry[]>>((acc, meal) => {
    if (!acc[meal.weekStart]) acc[meal.weekStart] = [];
    acc[meal.weekStart].push(meal);
    return acc;
  }, {});

  const weeks = Object.keys(byWeek).sort().reverse();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Selecionar refeição caseira</Text>

          {meals.length === 0 ? (
            <Text style={styles.emptyText}>Sem refeições caseiras recentes</Text>
          ) : (
            <ScrollView style={styles.list}>
              {weeks.map((week) => (
                <View key={week}>
                  <Text style={styles.weekHeader}>Semana de {formatWeekLabel(week)}</Text>
                  {byWeek[week].map((meal) => (
                    <TouchableOpacity
                      key={meal.id}
                      style={styles.mealRow}
                      onPress={() => onSelect(meal)}
                    >
                      <Icon source="pot-steam" size={20} color="#B5451B" />
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealName}>{meal.name}</Text>
                        <Text style={styles.mealMeta}>{formatMealLabel(meal)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 32,
  },
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    maxHeight: '70%',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 24,
  },
  list: {
    maxHeight: 300,
  },
  weekHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  mealMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  cancelButton: {
    alignSelf: 'flex-end',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  cancelText: {
    fontSize: 15,
    color: '#888',
  },
});
