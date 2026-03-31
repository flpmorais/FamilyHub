import { useState } from "react";
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
} from "react-native";

interface ShoppingAddFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { name: string; quantityNote?: string }) => Promise<
    | { status: "created" }
    | { status: "unticked" }
    | { status: "duplicate_unticked" }
    | { status: "duplicate_ticked"; itemId: string }
  >;
  onUntick: (id: string) => Promise<void>;
}

export function ShoppingAddForm({
  visible,
  onClose,
  onSave,
  onUntick,
}: ShoppingAddFormProps) {
  const [name, setName] = useState("");
  const [quantityNote, setQuantityNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  function resetForm() {
    setName("");
    setQuantityNote("");
    setNameError("");
  }

  async function handleSave() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError("O nome é obrigatório.");
      return;
    }
    setNameError("");

    setIsSaving(true);
    try {
      const result = await onSave({
        name: trimmedName,
        quantityNote: quantityNote.trim() || undefined,
      });

      if (result.status === "created" || result.status === "unticked") {
        resetForm();
        onClose();
      } else if (result.status === "duplicate_unticked") {
        setNameError("Este item já está na lista.");
      } else if (result.status === "duplicate_ticked") {
        Alert.alert(
          "Item existente",
          "Este item já existe mas está marcado. Desmarcar?",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Desmarcar",
              onPress: async () => {
                await onUntick(result.itemId);
                resetForm();
                onClose();
              },
            },
          ],
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.sheet}>
          <Text style={s.title}>Novo item</Text>

          <Text style={s.label}>Nome *</Text>
          <TextInput
            style={[s.input, nameError ? s.inputError : null]}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setNameError("");
            }}
            placeholder="ex: Leite"
            autoCapitalize="sentences"
            autoFocus
            editable={!isSaving}
          />
          {nameError ? <Text style={s.fieldError}>{nameError}</Text> : null}

          <Text style={s.label}>Quantidade (opcional)</Text>
          <TextInput
            style={s.input}
            value={quantityNote}
            onChangeText={setQuantityNote}
            placeholder="ex: 3 pacotes"
            autoCapitalize="sentences"
            editable={!isSaving}
          />

          <View style={s.buttons}>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={handleClose}
              disabled={isSaving}
            >
              <Text style={s.cancelText}>Fechar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, isSaving && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
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
    paddingBottom: 40,
  },
  title: {
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
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  inputError: { borderColor: "#D32F2F" },
  fieldError: {
    color: "#D32F2F",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    alignItems: "center",
  },
  cancelText: { color: "#1A1A1A", fontSize: 16 },
  saveBtn: {
    flex: 1,
    backgroundColor: "#B5451B",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
