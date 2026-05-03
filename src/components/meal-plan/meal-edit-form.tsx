import { useState, useEffect } from "react";
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
import { IconButton } from "react-native-paper";
import { DishesSection } from "./dishes-section";
import { ParticipantToggle } from "./participant-toggle";
import { useRepository } from "../../hooks/use-repository";
import { logger } from "../../utils/logger";
import { useModalKeyboardScroll } from "../../hooks/use-modal-keyboard-scroll";
import type {
  MealEntry,
  MealEntryDish,
  MealSlot,
  MealType,
} from "../../types/meal-plan.types";
import type { Profile } from "../../types/profile.types";

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const SLOT_LABELS: Record<MealSlot, string> = {
  lunch: "Almoço",
  dinner: "Jantar",
};

const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: "home_cooked", label: "Caseira" },
  { value: "eating_out", label: "Fora" },
  { value: "takeaway", label: "Takeaway" },
];

interface MealEditFormProps {
  visible: boolean;
  meal: MealEntry | null;
  familyId: string;
  mealDate: string;
  profiles: Profile[];
  dishes: MealEntryDish[];
  onClose: () => void;
  onSave: (
    id: string,
    name: string,
    mealType: MealType,
    participants: string[],
    isSlotOverridden: boolean,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSkip: (id: string) => Promise<void>;
  onAddAsLeftover?: (dishes: MealEntryDish[]) => void;
  onDishChanged: () => void;
  onOpenAddDish: () => void;
}

export function MealEditForm({
  visible,
  meal,
  familyId,
  mealDate,
  profiles,
  dishes,
  onClose,
  onSave,
  onDelete,
  onSkip,
  onAddAsLeftover,
  onDishChanged,
  onOpenAddDish,
}: MealEditFormProps) {
  const [name, setName] = useState("");
  const [mealType, setMealType] = useState<MealType>("home_cooked");
  const [participants, setParticipants] = useState<string[]>([]);
  const [nameError, setNameError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { keyboardHeight, scrollViewRef, getInputProps } =
    useModalKeyboardScroll({
      inputKeys: ["name"],
    });

  const needsName = mealType === "eating_out" || mealType === "takeaway";

  useEffect(() => {
    if (meal) {
      setName(meal.name === "_dishes" ? "" : meal.name);
      setMealType(meal.mealType);
      setParticipants(meal.participants);
      setNameError("");
    }
  }, [meal]);

  function handleTypeChange(type: MealType) {
    setMealType(type);
    setNameError("");
  }

  function toggleParticipant(profileId: string) {
    setParticipants((prev) =>
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId],
    );
  }

  async function handleSave() {
    if (!meal) return;
    let finalName = name.trim();

    if (needsName && !finalName) {
      setNameError("O nome da refeição é obrigatório");
      return;
    }

    // home_cooked: name stays empty, dishes are displayed instead
    if (!needsName) {
      finalName = "";
    }

    setIsSaving(true);
    try {
      if (participants.length === 0) {
        await onSkip(meal.id);
        onClose();
        return;
      }
      const sorted1 = [...participants].sort();
      const sorted2 = [...meal.participants].sort();
      const participantsChanged =
        sorted1.length !== sorted2.length ||
        sorted1.some((id, i) => id !== sorted2[i]);
      const isOverridden = meal.isSlotOverridden || participantsChanged;

      await onSave(meal.id, finalName, mealType, participants, isOverridden);
      onClose();
    } catch {
      setNameError("Erro ao guardar refeição");
    } finally {
      setIsSaving(false);
    }
  }

  function handleDeletePress() {
    if (!meal) return;
    Alert.alert(
      "Apagar refeição",
      "Tem a certeza que quer apagar esta refeição?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: async () => {
            setIsSaving(true);
            try {
              await onDelete(meal.id);
              onClose();
            } catch {
              setNameError("Erro ao apagar refeição");
            } finally {
              setIsSaving(false);
            }
          },
        },
      ],
    );
  }

  function handleSkipPress() {
    if (!meal) return;
    Alert.alert(
      "Saltar horário",
      "Quer saltar este horário esta semana? A refeição será removida.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Saltar",
          style: "destructive",
          onPress: async () => {
            setIsSaving(true);
            try {
              await onSkip(meal.id);
              onClose();
            } catch {
              setNameError("Erro ao saltar horário");
            } finally {
              setIsSaving(false);
            }
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
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: keyboardHeight + 8 }}
          >
            <View style={styles.titleRow}>
              <Text style={styles.title}>Editar refeição</Text>
              {onAddAsLeftover && mealType === "home_cooked" && (
                <IconButton
                  icon="recycle-variant"
                  size={22}
                  iconColor="#B5451B"
                  style={styles.leftoverBtn}
                  onPress={() => onAddAsLeftover(dishes)}
                />
              )}
            </View>

            <Text style={styles.label}>Tipo</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.typeRow}
            >
              {MEAL_TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.typeChip,
                    mealType === opt.value && styles.typeChipSelected,
                  ]}
                  onPress={() => handleTypeChange(opt.value)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      mealType === opt.value && styles.typeChipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {needsName && (
              <>
                <Text style={styles.label}>Nome *</Text>
                <TextInput
                  {...getInputProps("name")}
                  style={[styles.input, nameError ? styles.inputError : null]}
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setNameError("");
                  }}
                  placeholder="Ex: Restaurante O Manel"
                  editable={!isSaving}
                />
              </>
            )}

            {nameError ? <Text style={styles.error}>{nameError}</Text> : null}

            {meal && mealType === "home_cooked" && (
              <DishesSection
                mealEntryId={meal.id}
                dishes={dishes}
                onChanged={onDishChanged}
                onOpenAddDish={onOpenAddDish}
              />
            )}

            <Text style={[styles.label, { marginTop: 16 }]}>Participantes</Text>
            <ParticipantToggle
              profiles={profiles}
              selectedIds={participants}
              onToggle={toggleParticipant}
              disabled={isSaving}
            />
          </ScrollView>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSaving}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDeletePress}
              disabled={isSaving}
            >
              <Text style={styles.deleteText}>Apagar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkipPress}
              disabled={isSaving}
            >
              <Text style={styles.skipText}>Saltar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFF" size="small" />
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
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  container: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#333" },
  leftoverBtn: { margin: 0 },
  label: { fontSize: 14, fontWeight: "600", color: "#555", marginBottom: 6 },
  typeRow: { flexDirection: "row", marginBottom: 16 },
  typeChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDD",
    marginRight: 8,
    backgroundColor: "#FFF",
  },
  typeChipSelected: { backgroundColor: "#B5451B", borderColor: "#B5451B" },
  typeChipText: { fontSize: 13, color: "#555", fontWeight: "500" },
  typeChipTextSelected: { color: "#FFF" },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  inputError: { borderColor: "#D32F2F" },
  error: { color: "#D32F2F", fontSize: 12, marginTop: 4 },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCC",
    alignItems: "center",
  },
  cancelText: { color: "#1A1A1A", fontSize: 16 },
  deleteBtn: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D32F2F",
    alignItems: "center",
  },
  deleteText: { color: "#D32F2F", fontSize: 14, fontWeight: "600" },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#888",
    alignItems: "center",
  },
  skipText: { color: "#888", fontSize: 14, fontWeight: "600" },
  saveBtn: {
    flex: 1,
    backgroundColor: "#B5451B",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
