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
import { LinkedMealPicker } from './linked-meal-picker';
import { ParticipantToggle } from './participant-toggle';
import type { MealEntry, MealType } from '../../types/meal-plan.types';
import type { Profile } from '../../types/profile.types';

const MEAL_TYPE_OPTIONS: { value: MealType; label: string; disabled?: boolean }[] = [
  { value: 'home_cooked', label: 'Caseira' },
  { value: 'eating_out', label: 'Fora' },
  { value: 'takeaway', label: 'Takeaway' },
  { value: 'leftovers', label: 'Restos' },
];

interface MealAddFormProps {
  visible: boolean;
  dayLabel: string;
  slotLabel: string;
  linkableMeals: MealEntry[];
  profiles: Profile[];
  defaultParticipants: string[];
  onClose: () => void;
  onSave: (name: string, mealType: MealType, linkedMealId: string | null, participants: string[]) => Promise<void>;
}

export function MealAddForm({ visible, dayLabel, slotLabel, linkableMeals, profiles, defaultParticipants, onClose, onSave }: MealAddFormProps) {
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>('home_cooked');
  const [linkedMealId, setLinkedMealId] = useState<string | null>(null);
  const [linkedMealName, setLinkedMealName] = useState('');
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [nameError, setNameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setParticipants(defaultParticipants);
    }
  }, [visible, defaultParticipants]);

  const isLeftovers = mealType === 'leftovers';

  function resetForm() {
    setName('');
    setMealType('home_cooked');
    setLinkedMealId(null);
    setLinkedMealName('');
    setParticipants([]);
    setNameError('');
  }

  function handleTypeChange(type: MealType) {
    setMealType(type);
    if (type !== 'leftovers') {
      setLinkedMealId(null);
      setLinkedMealName('');
    }
  }

  function toggleParticipant(profileId: string) {
    setParticipants((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    );
  }

  function handleLinkedMealSelect(meal: MealEntry) {
    setLinkedMealId(meal.id);
    setLinkedMealName(meal.name);
    if (!name.trim()) {
      setName(meal.name);
    }
    setShowMealPicker(false);
  }

  async function handleSave() {
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
      await onSave(trimmed, mealType, isLeftovers ? linkedMealId : null, participants);
      resetForm();
      onClose();
    } catch {
      setNameError('Erro ao guardar refeição');
    } finally {
      setIsSaving(false);
    }
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <Text style={styles.title}>Nova refeição</Text>
          <Text style={styles.subtitle}>{dayLabel} — {slotLabel}</Text>

          <Text style={styles.label}>Tipo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
            {MEAL_TYPE_OPTIONS.map((opt) => {
              const isDisabled = opt.disabled || (opt.value === 'leftovers' && linkableMeals.length === 0);
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
            placeholder="Ex: Frango grelhado com arroz"
            autoFocus
          />
          {nameError ? <Text style={styles.error}>{nameError}</Text> : null}

          {isLeftovers && (
            <>
              <Text style={[styles.label, { marginTop: 16 }]}>Refeição de origem</Text>
              <TouchableOpacity style={styles.linkedMealButton} onPress={() => setShowMealPicker(true)}>
                {linkedMealId ? (
                  <View style={styles.linkedMealSelected}>
                    <Icon source="pot-steam" size={18} color="#B5451B" />
                    <Text style={styles.linkedMealText}>{linkedMealName}</Text>
                  </View>
                ) : (
                  <Text style={styles.linkedMealPlaceholder}>Selecionar refeição caseira...</Text>
                )}
              </TouchableOpacity>
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
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={isSaving}>
              <Text style={styles.cancelText}>Cancelar</Text>
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
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
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
  linkedMealPlaceholder: {
    fontSize: 15,
    color: '#AAA',
  },
});
