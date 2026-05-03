import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Icon } from "react-native-paper";
import type {
  MealEntry,
  MealSlot,
  MealType,
  MealPlanSlotConfig,
} from "../../types/meal-plan.types";

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const SLOT_LABELS: Record<MealSlot, string> = {
  lunch: "Almoço",
  dinner: "Jantar",
};
const LUNCH_CUTOFF = 14;
const DINNER_CUTOFF = 21;

const MEAL_TYPE_ICONS: Record<MealType, string | null> = {
  home_cooked: null,
  eating_out: "store",
  takeaway: "food-takeout-box",
};

interface EmptySlotInfo {
  dayOfWeek: number;
  mealSlot: MealSlot;
}

interface MealPlanWidgetProps {
  nextMeal: MealEntry | null;
  nextMealProfiles: string[];
  emptySlot: EmptySlotInfo | null;
  showPlanningReminder: boolean;
  onPress: () => void;
}

export function getNextMeal(
  entries: MealEntry[],
  configs: MealPlanSlotConfig[],
  now: Date,
): MealEntry | null {
  const jsDay = now.getDay();
  const currentDay = jsDay === 0 ? 7 : jsDay; // 1=Mon, 7=Sun
  const hour = now.getHours();

  // Determine which slots to check starting from
  const slots: MealSlot[] = ["lunch", "dinner"];
  let startSlotIndex: number;
  if (hour < LUNCH_CUTOFF) {
    startSlotIndex = 0; // lunch
  } else if (hour < DINNER_CUTOFF) {
    startSlotIndex = 1; // dinner
  } else {
    startSlotIndex = 0; // next day lunch
  }
  const startDay = hour >= DINNER_CUTOFF ? currentDay + 1 : currentDay;

  function isSlotSkippedByConfig(day: number, slot: MealSlot): boolean {
    const config = configs.find(
      (c) => c.dayOfWeek === day && c.mealSlot === slot,
    );
    return config?.isSkip ?? false;
  }

  for (let day = startDay; day <= 7; day++) {
    const slotStart = day === startDay ? startSlotIndex : 0;
    for (let si = slotStart; si < slots.length; si++) {
      const slot = slots[si];
      const entry = entries.find(
        (e) => e.dayOfWeek === day && e.mealSlot === slot,
      );

      // Skip: entry-level skip
      if (entry?.isSlotSkipped) continue;
      // Skip: config-level skip with no entry
      if (!entry && isSlotSkippedByConfig(day, slot)) continue;

      // Found an active entry
      if (entry) return entry;
    }
  }

  return null;
}

export function getNextActiveEmptySlot(
  entries: MealEntry[],
  configs: MealPlanSlotConfig[],
  now: Date,
): EmptySlotInfo | null {
  const jsDay = now.getDay();
  const currentDay = jsDay === 0 ? 7 : jsDay;
  const hour = now.getHours();

  const slots: MealSlot[] = ["lunch", "dinner"];
  const startSlotIndex = hour < LUNCH_CUTOFF ? 0 : hour < DINNER_CUTOFF ? 1 : 0;
  const startDay = hour >= DINNER_CUTOFF ? currentDay + 1 : currentDay;

  function isSlotSkippedByConfig(day: number, slot: MealSlot): boolean {
    const config = configs.find(
      (c) => c.dayOfWeek === day && c.mealSlot === slot,
    );
    return config?.isSkip ?? false;
  }

  for (let day = startDay; day <= 7; day++) {
    const slotStart = day === startDay ? startSlotIndex : 0;
    for (let si = slotStart; si < slots.length; si++) {
      const slot = slots[si];
      const entry = entries.find(
        (e) => e.dayOfWeek === day && e.mealSlot === slot,
      );

      if (entry?.isSlotSkipped) continue;
      if (!entry && isSlotSkippedByConfig(day, slot)) continue;

      // Active slot with no entry — this is an empty plannable slot
      if (!entry) return { dayOfWeek: day, mealSlot: slot };

      // Active slot with entry — not empty, but keep looking for empty ones after
    }
  }

  return null;
}

export function MealPlanWidget({
  nextMeal,
  nextMealProfiles,
  emptySlot,
  showPlanningReminder,
  onPress,
}: MealPlanWidgetProps) {
  const typeIcon = nextMeal ? MEAL_TYPE_ICONS[nextMeal.mealType] : null;
  const slotContext = nextMeal
    ? `${DAY_LABELS[nextMeal.dayOfWeek - 1]} ${SLOT_LABELS[nextMeal.mealSlot]}`
    : "";
  const emptySlotLabel = emptySlot
    ? `${DAY_LABELS[emptySlot.dayOfWeek - 1]} ${SLOT_LABELS[emptySlot.mealSlot]}`
    : "";

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={s.titleRow}>
        <Icon source="silverware-fork-knife" size={18} color="#B5451B" />
        <Text style={s.title}>Refeições</Text>
      </View>

      <View style={s.contentRow}>
        <View style={{ flex: 1 }}>
          {!nextMeal ? (
            <Text style={s.emptyText}>Sem refeições planeadas</Text>
          ) : (
            <>
              <Text style={s.slotContext}>{slotContext}</Text>
              <View style={s.mealRow}>
                {typeIcon && <Icon source={typeIcon} size={16} color="#888" />}
                <Text style={s.mealName} numberOfLines={1}>
                  {nextMeal.name}
                </Text>
              </View>
              {nextMealProfiles.length > 0 && (
                <View style={s.participantsRow}>
                  <Icon source="account-group" size={14} color="#888" />
                  <Text style={s.participantsText} numberOfLines={1}>
                    {nextMealProfiles.join(", ")}
                  </Text>
                </View>
              )}
            </>
          )}

          {emptySlot && (
            <View style={s.alertRow}>
              <Icon source="alert-circle" size={14} color="#F59300" />
              <Text style={s.alertWarning}>
                Sem refeição para {emptySlotLabel}
              </Text>
            </View>
          )}

          {showPlanningReminder && (
            <View style={s.alertRow}>
              <Icon source="calendar-alert" size={14} color="#1976D2" />
              <Text style={s.alertInfo}>
                Sem refeições planeadas para a próxima semana
              </Text>
            </View>
          )}
        </View>
        <Text style={s.arrow}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#FFF8F5",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0E0D8",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B5451B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: "#888888",
  },
  slotContext: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  participantsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  participantsText: {
    fontSize: 13,
    color: "#555555",
    flex: 1,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  alertWarning: {
    fontSize: 13,
    color: "#F59300",
    fontWeight: "600",
  },
  alertInfo: {
    fontSize: 13,
    color: "#1976D2",
    fontWeight: "600",
  },
  contentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  arrow: {
    fontSize: 16,
    color: "#B5451B",
    marginLeft: 8,
  },
});
