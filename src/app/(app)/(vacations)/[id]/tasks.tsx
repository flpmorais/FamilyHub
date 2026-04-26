import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useRepository } from '../../../../hooks/use-repository';
import { useAuthStore } from '../../../../stores/auth.store';
import { logger } from '../../../../utils/logger';
import { useModalKeyboardScroll } from '../../../../hooks/use-modal-keyboard-scroll';
import type { BookingTask } from '../../../../types/vacation.types';
import type { Profile } from '../../../../types/profile.types';

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function daysRemaining(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function daysColor(days: number): string {
  if (days <= 7) return '#D32F2F';
  if (days <= 30) return '#E67E22';
  return '#888888';
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function BookingTasksScreen() {
  const { id: vacationId } = useLocalSearchParams<{ id: string }>();
  const vacationRepository = useRepository('vacation');
  const profileRepo = useRepository('profile');
  const { userAccount } = useAuthStore();

  const [tasks, setTasks] = useState<BookingTask[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add task sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDueDate, setFormDueDate] = useState(new Date());
  const [formProfileId, setFormProfileId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { keyboardHeight, scrollViewRef, getInputProps } = useModalKeyboardScroll({
    inputKeys: ['formTitle'],
  });

  async function loadTasks(showSpinner = false) {
    if (!vacationId || !userAccount?.familyId) return;
    if (showSpinner) setIsLoading(true);
    try {
      const [list, profList] = await Promise.all([
        vacationRepository.getBookingTasks(vacationId),
        profileRepo.getProfilesByFamily(userAccount.familyId),
      ]);
      setTasks(list);
      setProfiles(profList);
    } catch (err) {
      logger.error('BookingTasksScreen', 'loadTasks failed', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas.');
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleComplete(task: BookingTask) {
    try {
      await vacationRepository.updateBookingTask(task.id, {
        isComplete: !task.isComplete,
      });
      await loadTasks();
    } catch (err) {
      logger.error('BookingTasksScreen', 'toggleComplete failed', err);
      setError(err instanceof Error ? err.message : 'Erro ao actualizar tarefa.');
    }
  }

  function openAddTask() {
    setFormTitle('');
    setFormDueDate(new Date());
    setFormProfileId(null);
    setShowDatePicker(false);
    setError(null);
    setSheetVisible(true);
  }

  function onDateChange(_: DateTimePickerEvent, date?: Date) {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) setFormDueDate(date);
  }

  async function handleAddTask() {
    const title = formTitle.trim();
    if (!title) {
      setError('O título é obrigatório.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await vacationRepository.createBookingTask({
        vacationId: vacationId!,
        familyId: userAccount!.familyId,
        title,
        taskType: 'custom',
        dueDate: toISODate(formDueDate),
        profileId: formProfileId ?? undefined,
      });
      setSheetVisible(false);
      await loadTasks();
    } catch (err) {
      logger.error('BookingTasksScreen', 'handleAddTask failed', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar tarefa.');
    } finally {
      setIsSaving(false);
    }
  }

  const incomplete = tasks.filter((t) => !t.isComplete);
  const completed = tasks.filter((t) => t.isComplete);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Tarefas</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {incomplete.length === 0 && completed.length === 0 && (
          <Text style={styles.empty}>Nenhuma tarefa encontrada.</Text>
        )}

        {incomplete.map((task) => {
          const days = task.dueDate ? daysRemaining(task.dueDate) : null;
          const assigneeName = task.profileId
            ? profiles.find((p) => p.id === task.profileId)?.displayName ?? ''
            : 'Família';
          return (
            <TouchableOpacity
              key={task.id}
              style={styles.taskRow}
              onPress={() => toggleComplete(task)}
            >
              <Text style={styles.taskCheck}>☐</Text>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <View style={styles.taskMetaRow}>
                  {task.dueDate && <Text style={styles.taskDueDate}>{formatDate(task.dueDate)}</Text>}
                  <Text style={styles.taskAssignee}>{assigneeName}</Text>
                </View>
              </View>
              {days !== null && (
                <View style={[styles.daysBadge, { backgroundColor: daysColor(days) + '18' }]}>
                  <Text style={[styles.daysBadgeText, { color: daysColor(days) }]}>
                    {days < 0 ? 'Atrasado' : `${days}d`}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {completed.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Concluídas</Text>
            {completed.map((task) => {
              const assigneeName = task.profileId
                ? profiles.find((p) => p.id === task.profileId)?.displayName ?? ''
                : 'Família';
              return (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskRow}
                  onPress={() => toggleComplete(task)}
                >
                  <Text style={styles.taskCheck}>☑</Text>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitleDone}>{task.title}</Text>
                    <Text style={styles.taskDueDateDone}>{assigneeName}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <TouchableOpacity style={styles.addButton} onPress={() => openAddTask()}>
          <Text style={styles.addButtonText}>Adicionar tarefa</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Add task bottom sheet ─────────────────────────────────────────── */}
      <Modal
        visible={sheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView
              ref={scrollViewRef}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: keyboardHeight + 8 }}
            >
              <Text style={styles.sheetTitle}>Nova tarefa</Text>

              <Text style={styles.label}>Título *</Text>
              <TextInput
                {...getInputProps('formTitle')}
                style={styles.input}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="ex: Seguro de viagem"
                autoCapitalize="sentences"
                editable={!isSaving}
              />

              <Text style={styles.label}>Data limite *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
                disabled={isSaving}
              >
                <Text style={styles.dateButtonText}>{formatDate(toISODate(formDueDate))}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formDueDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}

              <Text style={styles.label}>Atribuir a</Text>
              <View style={styles.profileList}>
                <TouchableOpacity
                  style={[
                    styles.profileChip,
                    formProfileId === null && styles.profileChipSelected,
                  ]}
                  onPress={() => setFormProfileId(null)}
                  disabled={isSaving}
                >
                  <Text
                    style={[
                      styles.profileChipText,
                      formProfileId === null && styles.profileChipTextSelected,
                    ]}
                  >
                    Toda a família
                  </Text>
                </TouchableOpacity>
                {profiles.map((profile) => (
                  <TouchableOpacity
                    key={profile.id}
                    style={[
                      styles.profileChip,
                      formProfileId === profile.id && styles.profileChipSelected,
                    ]}
                    onPress={() => setFormProfileId(profile.id)}
                    disabled={isSaving}
                  >
                    <Text
                      style={[
                        styles.profileChipText,
                        formProfileId === profile.id && styles.profileChipTextSelected,
                      ]}
                    >
                      {profile.displayName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>

            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setSheetVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleAddTask}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingTop: 24 },
  backButton: { marginBottom: 16, paddingHorizontal: 24 },
  backText: { color: '#B5451B', fontSize: 16 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 24, color: '#1A1A1A', paddingHorizontal: 24 },
  error: { color: '#D32F2F', marginBottom: 12, fontSize: 14, paddingHorizontal: 24 },
  empty: { color: '#888888', textAlign: 'center', marginVertical: 16, paddingHorizontal: 24 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  taskCheck: { fontSize: 20, marginRight: 12, color: '#B5451B' },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, color: '#1A1A1A' },
  taskTitleDone: {
    fontSize: 15,
    color: '#AAAAAA',
    textDecorationLine: 'line-through',
  },
  taskMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
  taskDueDate: { fontSize: 12, color: '#888888' },
  taskDueDateDone: {
    fontSize: 12,
    color: '#CCCCCC',
    marginTop: 2,
  },
  taskAssignee: { fontSize: 12, color: '#B5451B' },
  daysBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  daysBadgeText: { fontSize: 12, fontWeight: '600' },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AAAAAA',
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  addButton: {
    marginTop: 24,
    marginHorizontal: 24,
    backgroundColor: '#B5451B',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#555555', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  dateButtonText: { fontSize: 15, color: '#1A1A1A' },
  sheetButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
  },
  cancelText: { color: '#1A1A1A', fontSize: 16 },
  saveButton: {
    flex: 1,
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  profileList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  profileChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  profileChipSelected: { backgroundColor: '#B5451B', borderColor: '#B5451B' },
  profileChipText: { fontSize: 14, color: '#555555' },
  profileChipTextSelected: { color: '#FFFFFF', fontWeight: '500' },
});
