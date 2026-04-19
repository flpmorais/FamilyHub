import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { logger } from '../utils/logger';
import { useModalKeyboardScroll } from '../hooks/use-modal-keyboard-scroll';

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, dueDate: string) => Promise<void>;
}

export function AddTaskModal({ visible, onClose, onSave }: AddTaskModalProps) {
  const [formTitle, setFormTitle] = useState('');
  const [formDueDate, setFormDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { keyboardHeight, scrollViewRef, getInputProps } = useModalKeyboardScroll({
    inputKeys: ['formTitle'],
  });

  function reset() {
    setFormTitle('');
    setFormDueDate(new Date());
    setShowDatePicker(false);
    setError(null);
  }

  function onDateChange(_: DateTimePickerEvent, date?: Date) {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) setFormDueDate(date);
  }

  async function handleSave() {
    const title = formTitle.trim();
    if (!title) {
      setError('O título é obrigatório.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave(title, toISODate(formDueDate));
      reset();
      onClose();
    } catch (err) {
      logger.error('AddTaskModal', 'handleSave failed', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar tarefa.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
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
            {error && error.includes('título') ? (
              <Text style={styles.fieldError}>{error}</Text>
            ) : null}
            <Text style={styles.label}>Data limite *</Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowDatePicker(true)}
              disabled={isSaving}
            >
              <Text style={styles.dateBtnText}>{formatDate(toISODate(formDueDate))}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={formDueDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
            {error && !error.includes('título') ? (
              <Text style={styles.formError}>{error}</Text>
            ) : null}
          </ScrollView>

          <View style={styles.sheetBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={isSaving}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
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
  dateBtn: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  dateBtnText: { fontSize: 15, color: '#1A1A1A' },
  formError: { color: '#D32F2F', marginBottom: 12, fontSize: 14 },
  fieldError: { color: '#D32F2F', fontSize: 12, marginTop: -12, marginBottom: 12 },
  sheetBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
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
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
