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
  Alert,
  ScrollView,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { LinkedMealPicker } from './linked-meal-picker';
import { ParticipantToggle } from './participant-toggle';
import type { MealEntry, MealSlot, MealType } from '../../types/meal-plan.types';
import type { Profile } from '../../types/profile.types';

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const SLOT_LABELS: Record<MealSlot, string> = { lunch: 'Almoço', dinner: 'Jantar' };

const MEAL_TYPE_OPTIONS: { value: MealType; label: string; disabled?: boolean }[] = [
  { value: 'home_cooked', label: 'Caseira' },
  { value: 'eating_out', label: 'Fora' },
  { value: 'takeaway', label: 'Takeaway' },
  { value: 'leftovers', label: 'Restos' },
];

interface MealEditFormProps {
  visible: boolean;
  meal: MealEntry | null;
  profiles: Profile[];
  linkableMeals: MealEntry[];
  onClose: () => void;
  onSave: (id: string, name: string, mealType: MealType, participants: string[], isSlotOverridden: boolean, linkedMealId: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSkip: (id: string) => Promise<void>;
}

export function MealEditForm({ visible, meal, profiles, linkableMeals, onClose, onSave, onDelete, onSkip }: MealEditFormProps) {
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>('home_cooked');
  const [linkedMealId, setLinkedMealId] = useState<string | null>(null);
  const [linkedMealName, setLinkedMealName] = useState('');
  const [linkedMealMeta, setLinkedMealMeta] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [nameError, setNameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showMealPicker, setShowMealPicker] = useState(false);

  const isLeftovers = mealType === 'leftovers';

  useEffect(() => {
    if (meal) {
      setName(meal.name);
      setMealType(meal.mealType);
      setLinkedMealId(meal.linkedMealId);
      // Resolve linked meal name and date from linkable meals list
      if (meal.linkedMealId) {
        const linked = linkableMeals.find((m) => m.id === meal.linkedMealId);
        setLinkedMealName(linked?.name ?? meal.name);
        if (linked) {
          const dayLabel = DAY_LABELS[linked.dayOfWeek - 1] ?? '';
          const slotLabel = SLOT_LABELS[linked.mealSlot] ?? '';
          setLinkedMealMeta(`${dayLabel} ${slotLabel}`);
        } else {
          setLinkedMealMeta('(refeição antiga)');
        }
      } else {
        setLinkedMealName('');
        setLinkedMealMeta('');
      }
      setParticipants(meal.participants);
      setNameError('');
    }
  }, [meal, linkableMeals]);

  function handleTypeChange(type: MealType) {
    setMealType(type);
    if (type !== 'leftovers') {
      setLinkedMealId(null);
      setLinkedMealName('');
    }
  }

  function handleLinkedMealSelect(selectedMeal: MealEntry) {
    setLinkedMealId(selectedMeal.id);
    setLinkedMealName(selectedMeal.name);
    const dayLabel = DAY_LABELS[selectedMeal.dayOfWeek - 1] ?? '';
    const slotLabel = SLOT_LABELS[selectedMeal.mealSlot] ?? '';
    setLinkedMealMeta(`${dayLabel} ${slotLabel}`);
    setShowMealPicker(false);
  }

  function handleUnlinkPress() {
    Alert.alert(
      'Desassociar restos',
      'A refeição ficará sem ligação aos restos. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desassociar',
          style: 'destructive',
          onPress: () => {
            setLinkedMealId(null);
            setLinkedMealName('');
            setLinkedMealMeta('');
            setMealType('home_cooked');
          },
        },
      ]
    );
  }

  function toggleParticipant(profileId: string) {
    setParticipants((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    );
  }

  async function handleSave() {
    if (!meal) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('O nome da refeição é obrigatório');
      return;
    }
    if (isLeftovers && !linkedMealId) {
      setNameError('Selecione a refeição de origem');
      return;
    }
    setIsSaving(true);
    try {
      if (participants.length === 0) {
        await onSkip(meal.id);
        onClose();
        return;
      }
      const sorted1 = [...participants].sort();
      const sorted2 = [...meal.participants].sort();
      const participantsChanged = sorted1.length !== sorted2.length || sorted1.some((id, i) => id !== sorted2[i]);
      const isOverridden = meal.isSlotOverridden || participantsChanged;

      await onSave(
        meal.id,
        trimmed,
        mealType,
        participants,
        isOverridden,
        isLeftovers ? linkedMealId : null
      );
      onClose();
    } catch {
      setNameError('Erro ao guardar refeição');
    } finally {
      setIsSaving(false);
    }
  }

  function handleDeletePress() {
    if (!meal) return;
    Alert.alert(
      'Apagar refeição',
      'Tem a certeza que quer apagar esta refeição?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              await onDelete(meal.id);
              onClose();
            } catch {
              setNameError('Erro ao apagar refeição');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  }

  function handleSkipPress() {
    if (!meal) return;
    Alert.alert(
      'Saltar horário',
      'Quer saltar este horário esta semana? A refeição será removida.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Saltar',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              await onSkip(meal.id);
              onClose();
            } catch {
              setNameError('Erro ao saltar horário');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <Text style={styles.title}>Editar refeição</Text>

          <Text style={styles.label}>Tipo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
            {MEAL_TYPE_OPTIONS.map((opt) => {
              const isDisabled = opt.disabled || (opt.value === 'leftovers' && linkableMeals.length === 0 && mealType !== 'leftovers');
              return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.typeChip,
                  mealType === opt.value && styles.typeChipSelected,
                  isDisabled && styles.typeChipDisabled,
                ]}
                onPress={() => !isDisabled && handleTypeChange(opt.value)}
                disabled={isDisabled}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    mealType === opt.value && styles.typeChipTextSelected,
                    isDisabled && styles.typeChipTextDisabled,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={[styles.input, nameError ? styles.inputError : null]}
            value={name}
            onChangeText={(t) => { setName(t); setNameError(''); }}
          />
          {nameError ? <Text style={styles.error}>{nameError}</Text> : null}

          {isLeftovers && (
            <>
              <Text style={[styles.label, { marginTop: 16 }]}>Refeição de origem</Text>
              <TouchableOpacity style={styles.linkedMealButton} onPress={() => setShowMealPicker(true)}>
                {linkedMealId ? (
                  <View style={styles.linkedMealSelected}>
                    <Icon source="pot-steam" size={18} color="#B5451B" />
                    <View>
                      <Text style={styles.linkedMealText}>{linkedMealName}</Text>
                      {linkedMealMeta ? <Text style={styles.linkedMealMeta}>{linkedMealMeta}</Text> : null}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.linkedMealPlaceholder}>Selecionar refeição caseira...</Text>
                )}
              </TouchableOpacity>
              {linkedMealId && (
                <TouchableOpacity style={styles.unlinkButton} onPress={handleUnlinkPress}>
                  <Icon source="link-off" size={16} color="#D32F2F" />
                  <Text style={styles.unlinkText}>Desassociar restos</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>Participantes</Text>
          <ParticipantToggle
            profiles={profiles}
            selectedIds={participants}
            onToggle={toggleParticipant}
            disabled={isSaving}
          />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSaving}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeletePress} disabled={isSaving}>
              <Text style={styles.deleteText}>Apagar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkipPress} disabled={isSaving}>
              <Text style={styles.skipText}>Saltar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]} onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.saveText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <LinkedMealPicker
        visible={showMealPicker}
        meals={linkableMeals}
        onSelect={handleLinkedMealSelect}
        onClose={() => setShowMealPicker(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    marginRight: 8,
    backgroundColor: '#FFF',
  },
  typeChipSelected: {
    backgroundColor: '#B5451B',
    borderColor: '#B5451B',
  },
  typeChipDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E8E8E8',
  },
  typeChipText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  typeChipTextSelected: {
    color: '#FFF',
  },
  typeChipTextDisabled: {
    color: '#BBB',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#D32F2F',
  },
  error: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
  },
  cancelText: {
    color: '#1A1A1A',
    fontSize: 16,
  },
  deleteBtn: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D32F2F',
    alignItems: 'center',
  },
  deleteText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '600',
  },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#888',
    alignItems: 'center',
  },
  skipText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkedMealButton: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
  },
  linkedMealSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkedMealText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  linkedMealMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  linkedMealPlaceholder: {
    fontSize: 15,
    color: '#AAA',
  },
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  unlinkText: {
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: '500',
  },
});
