import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { DEFAULT_EXPIRY_DAYS, DEFAULT_TOTAL_DOSES } from '../../constants/leftover-defaults';
import { DISH_CATEGORY_STYLES } from '../../constants/dish-category-styles';
import { getDishDisplay } from '../../types/meal-plan.types';
import type { MealEntryDish } from '../../types/meal-plan.types';
import type { RecipeType } from '../../types/recipe.types';
import type { LeftoverType } from '../../types/leftover.types';

interface DishLeftoverEntry {
  dishId: string;
  name: string;
  category: RecipeType;
  selected: boolean;
  doses: string;
  expiryDays: string;
}

interface LeftoverFromDishesFormProps {
  visible: boolean;
  dishes: MealEntryDish[];
  onClose: () => void;
  onSave: (items: { name: string; type: LeftoverType; totalDoses: number; expiryDays: number }[]) => Promise<void>;
}

export function LeftoverFromDishesForm({ visible, dishes, onClose, onSave }: LeftoverFromDishesFormProps) {
  const [entries, setEntries] = useState<DishLeftoverEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && dishes.length > 0) {
      // Only show recipe and manual dishes
      const eligible = dishes.filter((d) => d.dishType === 'recipe' || d.dishType === 'manual');
      setEntries(
        eligible.map((d) => {
          const display = getDishDisplay(d);
          return {
            dishId: d.id,
            name: display.name,
            category: display.category,
            selected: false,
            doses: String(DEFAULT_TOTAL_DOSES),
            expiryDays: String(DEFAULT_EXPIRY_DAYS),
          };
        }),
      );
      setError('');
    }
  }, [visible, dishes]);

  function toggleDish(dishId: string) {
    setEntries((prev) =>
      prev.map((e) => (e.dishId === dishId ? { ...e, selected: !e.selected } : e)),
    );
    setError('');
  }

  function updateField(dishId: string, field: 'doses' | 'expiryDays', value: string) {
    setEntries((prev) =>
      prev.map((e) => (e.dishId === dishId ? { ...e, [field]: value } : e)),
    );
  }

  async function handleSave() {
    const selected = entries.filter((e) => e.selected);
    if (selected.length === 0) {
      setError('Selecione pelo menos um prato');
      return;
    }

    // Validate each selected entry
    for (const entry of selected) {
      const d = parseInt(entry.doses, 10);
      const ex = parseInt(entry.expiryDays, 10);
      if (isNaN(d) || d < 1) {
        setError(`Doses inválidas para "${entry.name}"`);
        return;
      }
      if (isNaN(ex) || ex < 1) {
        setError(`Dias de validade inválidos para "${entry.name}"`);
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave(
        selected.map((e) => ({
          name: e.name,
          type: e.category as LeftoverType,
          totalDoses: parseInt(e.doses, 10),
          expiryDays: parseInt(e.expiryDays, 10),
        })),
      );
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.sheet}>
          <Text style={s.title}>Guardar como restos</Text>
          <Text style={s.subtitle}>Selecione os pratos que sobraram</Text>

          <ScrollView style={s.scroll}>
            {entries.length === 0 ? (
              <Text style={s.emptyText}>Sem pratos elegíveis.</Text>
            ) : (
              entries.map((entry) => {
                const catStyle = DISH_CATEGORY_STYLES[entry.category] ?? DISH_CATEGORY_STYLES.other;
                return (
                  <View key={entry.dishId} style={s.entryCard}>
                    <TouchableOpacity style={s.checkRow} onPress={() => toggleDish(entry.dishId)}>
                      <Icon
                        source={entry.selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={22}
                        color={entry.selected ? '#B5451B' : '#CCC'}
                      />
                      <Icon source={catStyle.icon} size={16} color={catStyle.color} />
                      <Text style={s.entryName} numberOfLines={1}>{entry.name}</Text>
                    </TouchableOpacity>

                    {entry.selected && (
                      <View style={s.fieldsRow}>
                        <View style={s.fieldGroup}>
                          <Text style={s.fieldLabel}>Doses</Text>
                          <TextInput
                            style={s.fieldInput}
                            value={entry.doses}
                            onChangeText={(t) => updateField(entry.dishId, 'doses', t)}
                            keyboardType="number-pad"
                            editable={!isSaving}
                          />
                        </View>
                        <View style={s.fieldGroup}>
                          <Text style={s.fieldLabel}>Dias validade</Text>
                          <TextInput
                            style={s.fieldInput}
                            value={entry.expiryDays}
                            onChangeText={(t) => updateField(entry.dishId, 'expiryDays', t)}
                            keyboardType="number-pad"
                            editable={!isSaving}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <View style={s.buttons}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={isSaving}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, isSaving && s.btnDisabled]} onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.saveText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 16 },
  scroll: { maxHeight: 350 },
  emptyText: { color: '#888', fontSize: 14, padding: 16, textAlign: 'center' },
  entryCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryName: { flex: 1, fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  fieldsRow: { flexDirection: 'row', gap: 12, marginTop: 10, paddingLeft: 30 },
  fieldGroup: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 4 },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#333',
  },
  errorText: { color: '#D32F2F', fontSize: 12, marginTop: 8 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCC',
    alignItems: 'center',
  },
  cancelText: { color: '#1A1A1A', fontSize: 16 },
  saveBtn: {
    flex: 1,
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  saveText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
