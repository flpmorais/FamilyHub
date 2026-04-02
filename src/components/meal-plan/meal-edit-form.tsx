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
  onSave: (id: string, name: string, mealType: MealType, detail: string | null, participants: string[], isSlotOverridden: boolean, linkedMealId: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSkip: (id: string) => Promise<void>;
}

export function MealEditForm({ visible, meal, profiles, linkableMeals, onClose, onSave, onDelete, onSkip }: MealEditFormProps) {
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>('home_cooked');
  const [detail, setDetail] = useState('');
  const [linkedMealId, setLinkedMealId] = useState<string | null>(null);
  const [linkedMealName, setLinkedMealName] = useState('');
  const [linkedMealMeta, setLinkedMealMeta] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [nameError, setNameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showParticipantPicker, setShowParticipantPicker] = useState(false);
  const [showMealPicker, setShowMealPicker] = useState(false);

  const showDetail = mealType === 'eating_out' || mealType === 'takeaway';
  const isLeftovers = mealType === 'leftovers';

  useEffect(() => {
    if (meal) {
      setName(meal.name);
      setMealType(meal.mealType);
      setDetail(meal.detail ?? '');
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
    if (type !== 'eating_out' && type !== 'takeaway') {
      setDetail('');
    }
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

  function getParticipantNames(): string[] {
    return participants
      .map((id) => profiles.find((p) => p.id === id)?.displayName ?? '?')
      .filter(Boolean);
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
      const sorted1 = [...participants].sort();
      const sorted2 = [...meal.participants].sort();
      const participantsChanged = sorted1.length !== sorted2.length || sorted1.some((id, i) => id !== sorted2[i]);
      const isOverridden = meal.isSlotOverridden || participantsChanged;

      await onSave(
        meal.id,
        trimmed,
        mealType,
        showDetail && detail.trim() ? detail.trim() : null,
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

          {showDetail && (
            <>
              <Text style={[styles.label, { marginTop: 16 }]}>
                {mealType === 'eating_out' ? 'Restaurante (opcional)' : 'Encomenda (opcional)'}
              </Text>
              <TextInput
                style={styles.input}
                value={detail}
                onChangeText={setDetail}
                placeholder={mealType === 'eating_out' ? 'Ex: Cervejaria Ramiro' : 'Ex: Sushi do Noori'}
              />
            </>
          )}

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
          <View style={styles.participantRow}>
            {getParticipantNames().map((pName, i) => (
              <View key={i} style={styles.participantChip}>
                <Text style={styles.participantChipText}>{pName}</Text>
              </View>
            ))}
            <TouchableOpacity onPress={() => setShowParticipantPicker(true)} style={styles.editParticipantsButton}>
              <Icon source="account-edit" size={20} color="#888" />
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <View style={styles.leftButtons}>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeletePress} disabled={isSaving}>
                <Text style={styles.deleteText}>Apagar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipButton} onPress={handleSkipPress} disabled={isSaving}>
                <Text style={styles.skipText}>Saltar</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rightButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isSaving}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.saveText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Participant Picker Modal */}
      <Modal visible={showParticipantPicker} animationType="fade" transparent onRequestClose={() => setShowParticipantPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Quem come nesta refeição?</Text>
            {profiles.map((profile) => {
              const selected = participants.includes(profile.id);
              return (
                <TouchableOpacity
                  key={profile.id}
                  style={styles.profileRow}
                  onPress={() => toggleParticipant(profile.id)}
                >
                  <Icon
                    source={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={24}
                    color={selected ? '#B5451B' : '#CCC'}
                  />
                  <Text style={styles.profileName}>{profile.displayName}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.pickerDone} onPress={() => setShowParticipantPicker(false)}>
              <Text style={styles.pickerDoneText}>Concluído</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  participantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  participantChip: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  participantChipText: {
    fontSize: 12,
    color: '#555',
  },
  editParticipantsButton: {
    padding: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  leftButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  deleteText: {
    fontSize: 15,
    color: '#D32F2F',
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  skipText: {
    fontSize: 15,
    color: '#888',
    fontWeight: '600',
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 15,
    color: '#888',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#B5451B',
    minWidth: 90,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 32,
  },
  pickerContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  profileName: {
    fontSize: 16,
    color: '#333',
  },
  pickerDone: {
    alignSelf: 'flex-end',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#B5451B',
    borderRadius: 8,
  },
  pickerDoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
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
