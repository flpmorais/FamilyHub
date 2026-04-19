import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useModalKeyboardScroll } from "../../hooks/use-modal-keyboard-scroll";

interface SuggestionFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, description: string) => Promise<void>;
  initialTitle?: string;
  initialDescription?: string;
  isEditing?: boolean;
}

export function SuggestionFormModal({
  visible,
  onClose,
  onSave,
  initialTitle = "",
  initialDescription = "",
  isEditing = false,
}: SuggestionFormModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { keyboardHeight, scrollViewRef, getInputProps } = useModalKeyboardScroll({
    inputKeys: ["title", "description"],
  });

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setError(null);
    }
  }, [visible, initialTitle, initialDescription]);

  async function handleSave() {
    const t = title.trim();
    if (!t) {
      setError("O título é obrigatório.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave(t, description.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          <ScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: keyboardHeight + 8 }}
          >
            <Text style={s.sheetTitle}>
              {isEditing ? "Editar sugestão" : "Nova sugestão"}
            </Text>

            <Text style={s.label}>Título *</Text>
            <TextInput
              {...getInputProps("title")}
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="ex: Noite de jogos"
              autoCapitalize="sentences"
              editable={!isSaving}
            />

            <Text style={s.label}>Descrição</Text>
            <TextInput
              {...getInputProps("description")}
              style={[s.input, s.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Descreve a tua sugestão..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSaving}
            />

            {error ? <Text style={s.error}>{error}</Text> : null}
          </ScrollView>

          <View style={s.buttons}>
            <TouchableOpacity
              style={s.cancelButton}
              onPress={onClose}
              disabled={isSaving}
            >
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveButton, isSaving && s.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    maxHeight: "85%",
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555555",
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A1A",
  },
  textArea: {
    minHeight: 100,
  },
  error: {
    color: "#D32F2F",
    marginTop: 8,
    fontSize: 14,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    justifyContent: "flex-end",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 15,
    color: "#555555",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#B5451B",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
