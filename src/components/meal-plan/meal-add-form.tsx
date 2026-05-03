import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { Icon } from "react-native-paper";
import { ParticipantToggle } from "./participant-toggle";
import { useRepository } from "../../hooks/use-repository";
import { DishTypeTag } from "../common/dish-type-tag";
import { getDishDisplay } from "../../types/meal-plan.types";
import { logger } from "../../utils/logger";
import { useModalKeyboardScroll } from "../../hooks/use-modal-keyboard-scroll";
import type {
  MealType,
  CreateDishInput,
  MealEntryDish,
} from "../../types/meal-plan.types";
import type { Profile } from "../../types/profile.types";
import type { RecipeType } from "../../types/recipe.types";

// Temporary display info for dishes not yet saved
interface PendingDish extends CreateDishInput {
  displayName: string;
  displayCategory: RecipeType;
}

const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: "home_cooked", label: "Caseira" },
  { value: "eating_out", label: "Fora" },
  { value: "takeaway", label: "Takeaway" },
];

interface MealAddFormProps {
  visible: boolean;
  dayLabel: string;
  slotLabel: string;
  profiles: Profile[];
  defaultParticipants: string[];
  onClose: () => void;
  onSave: (
    name: string,
    mealType: MealType,
    participants: string[],
  ) => Promise<string>;
  onSkip: () => Promise<void>;
  onOpenAddDish: () => void;
  pendingDish?: CreateDishInput | null;
}

export function MealAddForm({
  visible,
  dayLabel,
  slotLabel,
  profiles,
  defaultParticipants,
  onClose,
  onSave,
  onSkip,
  onOpenAddDish,
  pendingDish,
}: MealAddFormProps) {
  const mealPlanRepo = useRepository("mealPlan");

  const [name, setName] = useState("");
  const [mealType, setMealType] = useState<MealType>("home_cooked");
  const [selectedDishes, setSelectedDishes] = useState<PendingDish[]>([]);
  const [nameError, setNameError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);

  const { keyboardHeight, scrollViewRef, getInputProps } =
    useModalKeyboardScroll({
      inputKeys: ["name"],
    });

  // Cache recipe/leftover names for display
  const recipeRepo = useRepository("recipe");
  const leftoverRepo = useRepository("leftover");

  useEffect(() => {
    if (visible) {
      setParticipants(defaultParticipants);
    }
  }, [visible, defaultParticipants]);

  // Process pending dish from parent (added via top-level AddDishModal)
  const lastPendingRef = useRef<CreateDishInput | null>(null);
  useEffect(() => {
    if (pendingDish && pendingDish !== lastPendingRef.current) {
      lastPendingRef.current = pendingDish;
      handleDishSelect(pendingDish);
    }
  }, [pendingDish]);

  const needsName = mealType === "eating_out" || mealType === "takeaway";

  function resetForm() {
    setName("");
    setMealType("home_cooked");
    setSelectedDishes([]);
    setParticipants([]);
    setNameError("");
  }

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

  async function handleDishSelect(input: CreateDishInput) {
    // Resolve display name for the pending dish
    let displayName = "";
    let displayCategory: RecipeType = "other";

    if (input.dishType === "recipe" && input.recipeId) {
      try {
        const recipe = await recipeRepo.getById(input.recipeId);
        if (recipe) {
          displayName = recipe.name;
          displayCategory = recipe.type;
        }
      } catch {
        /* fallback */
      }
    } else if (input.dishType === "manual") {
      displayName = input.manualName ?? "";
      displayCategory = input.manualCategory ?? "other";
    } else if (input.dishType === "fridge" && input.leftoverId) {
      try {
        const leftover = await leftoverRepo.getById(input.leftoverId);
        if (leftover) {
          displayName = leftover.name;
          displayCategory = leftover.type as RecipeType;
        }
      } catch {
        /* fallback */
      }
    } else if (input.dishType === "resto") {
      displayName = "Resto";
      displayCategory = "other";
    }

    setSelectedDishes((prev) => [
      ...prev,
      { ...input, displayName, displayCategory },
    ]);
  }

  function removeDish(index: number) {
    setSelectedDishes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    let finalName = name.trim();

    if (needsName) {
      // fora / takeaway: name is mandatory
      if (!finalName) {
        setNameError("O nome da refeição é obrigatório");
        return;
      }
    } else {
      // home_cooked: require at least one dish, name is internal placeholder
      if (selectedDishes.length === 0) {
        setNameError("Adicione pelo menos um prato");
        return;
      }
      finalName = "";
    }

    setIsSaving(true);
    try {
      const mealEntryId = await onSave(finalName, mealType, participants);

      // Bulk-add all dishes
      if (mealEntryId && selectedDishes.length > 0) {
        try {
          await mealPlanRepo.addDishes(mealEntryId, selectedDishes);
        } catch (err) {
          logger.error("MealAddForm", "addDishes failed", err);
        }
      }

      resetForm();
      onClose();
    } catch {
      setNameError("Erro ao guardar refeição");
    } finally {
      setIsSaving(false);
    }
  }

  function handleSkipPress() {
    Alert.alert("Saltar horário", "Quer saltar este horário esta semana?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Saltar",
        style: "destructive",
        onPress: async () => {
          setIsSaving(true);
          try {
            await onSkip();
            resetForm();
            onClose();
          } finally {
            setIsSaving(false);
          }
        },
      },
    ]);
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
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: keyboardHeight + 8 }}
          >
            <Text style={styles.title}>Nova refeição</Text>
            <Text style={styles.subtitle}>
              {dayLabel} — {slotLabel}
            </Text>

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
                {nameError ? (
                  <Text style={styles.error}>{nameError}</Text>
                ) : null}
              </>
            )}

            {mealType === "home_cooked" && (
              <View style={styles.dishesSection}>
                <Text style={styles.label}>Pratos</Text>
                {selectedDishes.map((dish, idx) => (
                  <View key={idx} style={styles.dishCard}>
                    <DishTypeTag
                      typeKey={dish.displayCategory}
                      variant="filled"
                      size="sm"
                    />
                    <Text style={styles.dishName} numberOfLines={1}>
                      {dish.displayName}
                    </Text>
                    <TouchableOpacity onPress={() => removeDish(idx)}>
                      <Text style={styles.removeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addDishBtn}
                  onPress={onOpenAddDish}
                >
                  <Text style={styles.addDishBtnText}>+ Adicionar</Text>
                </TouchableOpacity>
              </View>
            )}

            {!needsName && nameError ? (
              <Text style={styles.error}>{nameError}</Text>
            ) : null}

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
              onPress={handleClose}
              disabled={isSaving}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
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
  title: { fontSize: 18, fontWeight: "700", color: "#333", marginBottom: 2 },
  subtitle: { fontSize: 14, color: "#888", marginBottom: 20 },
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
  dishesSection: { marginTop: 16 },
  dishCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  dishName: { flex: 1, fontSize: 14, color: "#1A1A1A", fontWeight: "500" },
  removeBtn: {
    fontSize: 16,
    color: "#D32F2F",
    fontWeight: "700",
    paddingHorizontal: 4,
  },
  addDishBtn: { paddingVertical: 8 },
  addDishBtnText: { fontSize: 14, color: "#B5451B", fontWeight: "600" },
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
