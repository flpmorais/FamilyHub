import { useState, useEffect } from "react";
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
  Alert,
} from "react-native";
import type { ShoppingItem, ShoppingCategory } from "../../types/shopping.types";

interface ShoppingEditFormProps {
  visible: boolean;
  item: ShoppingItem | null;
  categories: ShoppingCategory[];
  onClose: () => void;
  onSave: (
    id: string,
    data: { name?: string; categoryId?: string; quantityNote?: string | null },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ShoppingEditForm({
  visible,
  item,
  categories,
  onClose,
  onSave,
  onDelete,
}: ShoppingEditFormProps) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [quantityNote, setQuantityNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategoryId(item.categoryId);
      setQuantityNote(item.quantityNote ?? "");
      setNameError("");
    }
  }, [item]);

  if (!item) return null;

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("O nome é obrigatório.");
      return;
    }
    setNameError("");

    setIsSaving(true);
    try {
      await onSave(item!.id, {
        name: trimmedName !== item!.name ? trimmedName : undefined,
        categoryId: categoryId !== item!.categoryId ? categoryId : undefined,
        quantityNote: quantityNote.trim() || null,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      `Eliminar "${item!.name}"?`,
      "Esta acção não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await onDelete(item!.id);
            onClose();
          },
        },
      ],
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={s.title}>Editar item</Text>

            <Text style={s.label}>Nome *</Text>
            <TextInput
              style={[s.input, nameError ? s.inputError : null]}
              value={name}
              onChangeText={(t) => {
                setName(t);
                setNameError("");
              }}
              autoCapitalize="sentences"
              editable={!isSaving}
            />
            {nameError ? <Text style={s.fieldError}>{nameError}</Text> : null}

            <Text style={s.label}>Categoria</Text>
            <View style={s.categoryList}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    s.categoryChip,
                    cat.id === categoryId && s.categoryChipSelected,
                  ]}
                  onPress={() => setCategoryId(cat.id)}
                  disabled={isSaving}
                >
                  <Text
                    style={[
                      s.categoryChipText,
                      cat.id === categoryId && s.categoryChipTextSelected,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
                style={s.deleteBtn}
                onPress={handleDelete}
                disabled={isSaving}
              >
                <Text style={s.deleteText}>Eliminar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={onClose}
                disabled={isSaving}
              >
                <Text style={s.cancelText}>Cancelar</Text>
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
          </ScrollView>
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
    maxHeight: "85%",
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
  categoryList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    backgroundColor: "#FFFFFF",
  },
  categoryChipSelected: {
    borderColor: "#B5451B",
    backgroundColor: "#FFF0EB",
  },
  categoryChipText: {
    fontSize: 13,
    color: "#555555",
  },
  categoryChipTextSelected: {
    color: "#B5451B",
    fontWeight: "600",
  },
  buttons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  deleteBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D32F2F",
    alignItems: "center",
  },
  deleteText: { color: "#D32F2F", fontSize: 14 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    alignItems: "center",
  },
  cancelText: { color: "#1A1A1A", fontSize: 14 },
  saveBtn: {
    flex: 1,
    backgroundColor: "#B5451B",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
