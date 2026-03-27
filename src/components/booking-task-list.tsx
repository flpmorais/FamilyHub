import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { AddTaskModal } from './add-task-modal';
import type { BookingTask } from '../types/vacation.types';

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

interface BookingTaskListProps {
  tasks: BookingTask[];
  onToggleComplete: (task: BookingTask) => Promise<void>;
  onCreateTask: (title: string, dueDate: string) => Promise<void>;
}

export function BookingTaskList({ tasks, onToggleComplete, onCreateTask }: BookingTaskListProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const incomplete = tasks.filter((t) => !t.isComplete);
  const completed = tasks.filter((t) => t.isComplete);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        {incomplete.length === 0 && completed.length === 0 && (
          <Text style={s.empty}>Nenhuma tarefa encontrada.</Text>
        )}
        {incomplete.map((task) => {
          const days = task.dueDate ? daysRemaining(task.dueDate) : null;
          return (
            <TouchableOpacity
              key={task.id}
              style={s.taskRow}
              onPress={() => onToggleComplete(task)}
            >
              <Text style={s.check}>☐</Text>
              <View style={s.info}>
                <Text style={s.title}>{task.title}</Text>
                {task.dueDate && <Text style={s.dueDate}>{formatDate(task.dueDate)}</Text>}
              </View>
              {days !== null && (
                <View style={[s.daysBadge, { backgroundColor: daysColor(days) + '18' }]}>
                  <Text style={[s.daysBadgeText, { color: daysColor(days) }]}>
                    {days < 0 ? 'Atrasado' : `${days}d`}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        {completed.length > 0 && (
          <>
            <Text style={s.sectionHeader}>Concluídas</Text>
            {completed.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={s.taskRow}
                onPress={() => onToggleComplete(task)}
              >
                <Text style={s.check}>☑</Text>
                <View style={s.info}>
                  <Text style={s.titleDone}>{task.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={2000}
        style={s.successSnackbar}
        theme={{ colors: { inverseSurface: '#388E3C', inverseOnSurface: '#FFFFFF' } }}
      >
        Tarefa criada
      </Snackbar>

      <AddTaskModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={async (title, dueDate) => {
          await onCreateTask(title, dueDate);
          setSuccessVisible(true);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 80 },
  empty: { color: '#888888', textAlign: 'center', marginVertical: 32 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  check: { fontSize: 20, marginRight: 12, color: '#B5451B' },
  info: { flex: 1 },
  title: { fontSize: 15, color: '#1A1A1A' },
  titleDone: { fontSize: 15, color: '#AAAAAA', textDecorationLine: 'line-through' },
  dueDate: { fontSize: 12, color: '#888888', marginTop: 2 },
  daysBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  daysBadgeText: { fontSize: 12, fontWeight: '600' },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AAAAAA',
    marginTop: 24,
    marginBottom: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#B5451B',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { color: '#FFFFFF', fontSize: 28, fontWeight: '400', marginTop: -2 },
  successSnackbar: { position: 'absolute', top: 48, backgroundColor: '#388E3C' },
});
