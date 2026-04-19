import { useEffect, useState, createRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import type { Leftover, LeftoverType } from "../../types/leftover.types";
import { toISODate } from "../../utils/date.utils";
import { DishTypeTag } from "../common/dish-type-tag";
import { useModalKeyboardScroll } from "../../hooks/use-modal-keyboard-scroll";

const TYPE_OPTIONS: LeftoverType[] = [
  "appetizer",
  "soup",
  "meal",
  "main",
  "side",
  "dessert",
  "other",
];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

interface LeftoverEditFormProps {
  visible: boolean;
  item: Leftover | null;
  onClose: () => void;
  onSave: (
    id: string,
    data: {
      name?: string;
      type?: LeftoverType;
      totalDoses?: number;
      expiryDate?: string;
      dosesEaten?: number;
      dosesThrownOut?: number;
    },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function LeftoverEditForm({
  visible,
  item,
  onClose,
  onSave,
  onDelete,
}: LeftoverEditFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<LeftoverType>("meal");
  const [totalDoses, setTotalDoses] = useState("");
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dosesEaten, setDosesEaten] = useState("");
  const [dosesThrownOut, setDosesThrownOut] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [dosesError, setDosesError] = useState("");
  const [eatenError, setEatenError] = useState("");
  const [thrownError, setThrownError] = useState("");

  const { keyboardHeight, scrollViewRef, getInputProps } = useModalKeyboardScroll({
    inputKeys: ["name", "doses", "eaten", "thrown"],
  });

  useEffect(() => {
    if (item) {
      setName(item.name);
      setType(item.type ?? "meal");
      setTotalDoses(String(item.totalDoses));
      setExpiryDate(new Date(item.expiryDate));
      setShowDatePicker(false);
      setDosesEaten(String(item.dosesEaten));
      setDosesThrownOut(String(item.dosesThrownOut));
      setNameError("");
      setDosesError("");
      setEatenError("");
      setThrownError("");
    }
  }, [item]);

  if (!item) return null;

  function onDateChange(_: DateTimePickerEvent, date?: Date) {
    setShowDatePicker(Platform.OS === "ios");
    if (date) setExpiryDate(date);
  }

  async function handleSave() {
    const trimmedName = name.trim();
    const parsedDoses = parseInt(totalDoses, 10);
    const parsedEaten = parseInt(dosesEaten, 10);
    const parsedThrown = parseInt(dosesThrownOut, 10);

    let hasError = false;

    if (!trimmedName) {
      setNameError("O nome é obrigatório.");
      hasError = true;
    } else {
      setNameError("");
    }

    if (isNaN(parsedDoses) || parsedDoses < 1) {
      setDosesError("Doses deve ser pelo menos 1.");
      hasError = true;
    } else {
      setDosesError("");
    }

    if (isNaN(parsedEaten) || parsedEaten < 0) {
      setEatenError("Doses comidas deve ser 0 ou superior.");
      hasError = true;
    } else {
      setEatenError("");
    }

    if (isNaN(parsedThrown) || parsedThrown < 0) {
      setThrownError("Doses deitadas fora deve ser 0 ou superior.");
      hasError = true;
    } else {
      setThrownError("");
    }

    // Cross-field validation: eaten + thrown <= total
    if (
      !hasError &&
      parsedEaten + parsedThrown > parsedDoses
    ) {
      setDosesError(
        `Comidas (${parsedEaten}) + deitadas fora (${parsedThrown}) não pode exceder doses totais (${parsedDoses}).`,
      );
      hasError = true;
    }

    if (hasError) return;

    setIsSaving(true);
    try {
      await onSave(item!.id, {
        name: trimmedName,
        type,
        totalDoses: parsedDoses,
        expiryDate: expiryDate.toISOString(),
        dosesEaten: parsedEaten,
        dosesThrownOut: parsedThrown,
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
      <View style={s.overlay}>
        <View style={s.sheet}>
          <ScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[s.scrollContent, { paddingBottom: keyboardHeight + 8 }]}
          >
            <Text style={s.title}>Editar resto</Text>

            <Text style={s.label}>Nome *</Text>
            <TextInput
              {...getInputProps("name")}
              style={[s.input, nameError ? s.inputError : null]}
              value={name}
              onChangeText={(t) => {
                setName(t);
                setNameError("");
              }}
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

            <Text style={s.label}>Doses totais *</Text>
            <TextInput
              {...getInputProps("doses")}
              style={[s.input, dosesError ? s.inputError : null]}
              value={totalDoses}
              onChangeText={(t) => {
                setTotalDoses(t);
                setDosesError("");
              }}
              keyboardType="number-pad"
              editable={!isSaving}
            />
            {dosesError ? (
              <Text style={s.fieldError}>{dosesError}</Text>
            ) : null}

            <Text style={s.label}>Data de validade *</Text>
            <TouchableOpacity
              style={s.dateBtn}
              onPress={() => setShowDatePicker(true)}
              disabled={isSaving}
            >
              <Text style={s.dateBtnText}>
                {formatDate(toISODate(expiryDate))}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={expiryDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}

            <Text style={s.label}>Doses comidas</Text>
            <TextInput
              {...getInputProps("eaten")}
              style={[s.input, eatenError ? s.inputError : null]}
              value={dosesEaten}
              onChangeText={(t) => {
                setDosesEaten(t);
                setEatenError("");
                setDosesError("");
              }}
              keyboardType="number-pad"
              editable={!isSaving}
            />
            {eatenError ? (
              <Text style={s.fieldError}>{eatenError}</Text>
            ) : null}

            <Text style={s.label}>Doses deitadas fora</Text>
            <TextInput
              {...getInputProps("thrown")}
              style={[s.input, thrownError ? s.inputError : null]}
              value={dosesThrownOut}
              onChangeText={(t) => {
                setDosesThrownOut(t);
                setThrownError("");
                setDosesError("");
              }}
              keyboardType="number-pad"
              editable={!isSaving}
            />
            {thrownError ? (
              <Text style={s.fieldError}>{thrownError}</Text>
            ) : null}
          </ScrollView>

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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    maxHeight: "85%",
  },
  scrollContent: {
    paddingBottom: 8,
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
  dateBtn: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  dateBtnText: {
    fontSize: 15,
    color: "#1A1A1A",
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
  deleteBtn: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D32F2F",
    alignItems: "center",
  },
  deleteText: { color: "#D32F2F", fontSize: 14, fontWeight: "600" },
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
