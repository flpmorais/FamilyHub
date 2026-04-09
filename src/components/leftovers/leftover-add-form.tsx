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
} from "react-native";
import {
  DEFAULT_EXPIRY_DAYS,
  DEFAULT_TOTAL_DOSES,
} from "../../constants/leftover-defaults";
import type { LeftoverType } from "../../types/leftover.types";
import { DishTypeTag } from "../common/dish-type-tag";

const TYPE_OPTIONS: LeftoverType[] = [
  "appetizer",
  "soup",
  "meal",
  "main",
  "side",
  "dessert",
  "other",
];

interface LeftoverAddFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    type: LeftoverType;
    totalDoses: number;
    expiryDays: number;
  }) => Promise<void>;
}

export function LeftoverAddForm({
  visible,
  onClose,
  onSave,
}: LeftoverAddFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<LeftoverType>("meal");
  const [doses, setDoses] = useState(String(DEFAULT_TOTAL_DOSES));
  const [expiryDays, setExpiryDays] = useState(String(DEFAULT_EXPIRY_DAYS));
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [dosesError, setDosesError] = useState("");
  const [expiryError, setExpiryError] = useState("");

  function resetForm() {
    setName("");
    setType("meal");
    setDoses(String(DEFAULT_TOTAL_DOSES));
    setExpiryDays(String(DEFAULT_EXPIRY_DAYS));
    setNameError("");
    setDosesError("");
    setExpiryError("");
  }

  async function handleSave() {
    const trimmedName = name.trim();
    const parsedDoses = parseInt(doses, 10);
    const parsedExpiry = expiryDays.trim()
      ? parseInt(expiryDays, 10)
      : DEFAULT_EXPIRY_DAYS;

    let hasError = false;
    if (!trimmedName) {
      setNameError("O nome é obrigatório.");
      hasError = true;
    } else {
      setNameError("");
    }
    if (!doses.trim() || isNaN(parsedDoses) || parsedDoses < 1) {
      setDosesError("Doses deve ser pelo menos 1.");
      hasError = true;
    } else {
      setDosesError("");
    }
    if (isNaN(parsedExpiry) || parsedExpiry < 1) {
      setExpiryError("Dias de validade deve ser pelo menos 1.");
      hasError = true;
    } else {
      setExpiryError("");
    }
    if (hasError) return;

    setIsSaving(true);
    try {
      await onSave({
        name: trimmedName,
        type,
        totalDoses: parsedDoses,
        expiryDays: parsedExpiry,
      });
      resetForm();
      onClose();
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
          <Text style={s.title}>Novo resto</Text>

          <Text style={s.label}>Nome *</Text>
          <TextInput
            style={[s.input, nameError ? s.inputError : null]}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setNameError("");
            }}
            placeholder="ex: Lasanha"
            autoCapitalize="sentences"
            autoFocus
            editable={!isSaving}
          />
          {nameError ? <Text style={s.fieldError}>{nameError}</Text> : null}

          <Text style={s.label}>Tipo</Text>
          <View style={s.chipRow}>
            {TYPE_OPTIONS.map((opt) => (
              <DishTypeTag
                key={opt}
                typeKey={opt}
                variant={type === opt ? "filled" : "outlined"}
                size="md"
                onPress={isSaving ? undefined : () => setType(opt)}
              />
            ))}
          </View>

          <Text style={s.label}>Doses *</Text>
          <TextInput
            style={[s.input, dosesError ? s.inputError : null]}
            value={doses}
            onChangeText={(t) => {
              setDoses(t);
              setDosesError("");
            }}
            placeholder="ex: 4"
            keyboardType="number-pad"
            editable={!isSaving}
          />
          {dosesError ? <Text style={s.fieldError}>{dosesError}</Text> : null}

          <Text style={s.label}>Dias de validade *</Text>
          <TextInput
            style={[s.input, expiryError ? s.inputError : null]}
            value={expiryDays}
            onChangeText={(t) => {
              setExpiryDays(t);
              setExpiryError("");
            }}
            keyboardType="number-pad"
            editable={!isSaving}
          />
          {expiryError ? <Text style={s.fieldError}>{expiryError}</Text> : null}

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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
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
