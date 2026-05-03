import { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useRepository } from "../../../hooks/use-repository";
import { useAuthStore } from "../../../stores/auth.store";
import { supabaseClient } from "../../../repositories/supabase/supabase.client";
import { DashboardVacationWidget } from "../../../components/dashboard-vacation-widget";
import { LeftoversWidget } from "../../../components/leftovers";
import { ShoppingWidget } from "../../../components/shopping";
import {
  MealPlanWidget,
  getNextMeal,
  getNextActiveEmptySlot,
} from "../../../components/meal-plan";
import { PageHeader } from "../../../components/page-header";
import { getMonday, addWeeks } from "../../../stores/meal-plan.store";
import { sortVacations } from "../../../utils/vacation.utils";
import type {
  Vacation,
  VacationLifecycle,
  BookingTask,
} from "../../../types/vacation.types";
import type { PackingItem } from "../../../types/packing.types";
import type { Leftover } from "../../../types/leftover.types";
import type {
  MealEntry,
  MealSlot,
  MealPlanSlotConfig,
} from "../../../types/meal-plan.types";
import type { Family, Profile } from "../../../types/profile.types";

interface DashboardEntry {
  vacation: Vacation;
  allTasks: BookingTask[];
  packingItems: PackingItem[];
}

export default function DashboardScreen() {
  const vacationRepository = useRepository("vacation");
  const packingItemRepository = useRepository("packingItem");
  const leftoverRepo = useRepository("leftover");
  const shoppingRepo = useRepository("shopping");
  const mealPlanRepo = useRepository("mealPlan");
  const profileRepo = useRepository("profile");
  const { userAccount } = useAuthStore();
  const [entries, setEntries] = useState<DashboardEntry[]>([]);
  const [activeLeftovers, setActiveLeftovers] = useState<Leftover[]>([]);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [family, setFamily] = useState<Family | null>(null);
  const [nextMeal, setNextMeal] = useState<MealEntry | null>(null);
  const [nextMealProfiles, setNextMealProfiles] = useState<string[]>([]);
  const [emptySlot, setEmptySlot] = useState<{
    dayOfWeek: number;
    mealSlot: MealSlot;
  } | null>(null);
  const [showPlanningReminder, setShowPlanningReminder] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void loadFamily();
      void loadPinned();
      void loadLeftovers();
      void loadShoppingCount();
      void loadNextMeal();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  async function loadFamily() {
    if (!userAccount?.familyId) return;
    try {
      const { data } = await supabaseClient
        .from("families")
        .select("*")
        .eq("id", userAccount.familyId)
        .single();
      if (data) {
        setFamily({
          id: data.id,
          name: data.name,
          bannerUrl: data.banner_url ?? null,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      }
    } catch {
      // Silently fail
    }
  }

  async function loadPinned() {
    if (!userAccount?.familyId) return;
    try {
      const all = await vacationRepository.getVacations(userAccount.familyId);
      const pinned = sortVacations(all.filter((v) => v.isPinned));

      const enriched: DashboardEntry[] = await Promise.all(
        pinned.map(async (vacation) => {
          const [allTasks, packingItems] = await Promise.all([
            vacationRepository.getBookingTasks(vacation.id),
            packingItemRepository.getPackingItems(vacation.id),
          ]);
          return { vacation, allTasks, packingItems };
        }),
      );
      setEntries(enriched);
    } catch {
      // Silently fail on dashboard
    }
  }

  async function loadLeftovers() {
    if (!userAccount?.familyId) return;
    try {
      const list = await leftoverRepo.getActive(userAccount.familyId);
      setActiveLeftovers(list);
    } catch {
      // Silently fail on dashboard
    }
  }

  async function loadShoppingCount() {
    if (!userAccount?.familyId) return;
    try {
      const items = await shoppingRepo.getItems(userAccount.familyId);
      const unticked = items.filter((i) => !i.isTicked);
      setShoppingCount(unticked.length);
      setUrgentCount(unticked.filter((i) => i.isUrgent).length);
    } catch {
      // Silently fail on dashboard
    }
  }

  async function loadNextMeal() {
    if (!userAccount?.familyId) return;
    try {
      const now = new Date();
      const weekStart = getMonday(now);
      const [weekEntries, configs, profiles] = await Promise.all([
        mealPlanRepo.getWeek(userAccount.familyId, weekStart),
        mealPlanRepo.getConfig(userAccount.familyId),
        profileRepo.getProfilesByFamily(userAccount.familyId),
      ]);

      // Next meal with entry (12-1)
      const meal = getNextMeal(weekEntries, configs, now);
      setNextMeal(meal);
      if (meal) {
        const names = meal.participants
          .map(
            (id) =>
              profiles.find((p: Profile) => p.id === id)?.displayName ?? "",
          )
          .filter(Boolean);
        setNextMealProfiles(names);
      } else {
        setNextMealProfiles([]);
      }

      // Next active empty slot warning (12-2)
      setEmptySlot(getNextActiveEmptySlot(weekEntries, configs, now));

      // Sunday planning reminder (12-3)
      if (now.getDay() === 0) {
        const nextWeekStart = addWeeks(weekStart, 1);
        const nextWeekEntries = await mealPlanRepo.getWeek(
          userAccount.familyId,
          nextWeekStart,
        );
        const plannedMeals = nextWeekEntries.filter((e) => !e.isSlotSkipped);
        setShowPlanningReminder(plannedMeals.length === 0);
      } else {
        setShowPlanningReminder(false);
      }
    } catch {
      // Silently fail on dashboard
    }
  }

  async function handleLifecycleChange(
    vacationId: string,
    lc: VacationLifecycle,
  ) {
    try {
      await vacationRepository.updateVacation(vacationId, { lifecycle: lc });
      await loadPinned();
    } catch {
      // Silently fail
    }
  }

  const familyTitle = family ? `Família ${family.name}` : "FamilyHub";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <PageHeader
        title={familyTitle}
        imageUri={family?.bannerUrl}
        familyBannerUri={family?.bannerUrl}
      />

      <View style={styles.body}>
        {entries.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Ainda não há viagens</Text>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => router.push("/(app)/(vacations)")}
            >
              <Text style={styles.ctaBtnText}>Criar a primeira viagem</Text>
            </TouchableOpacity>
          </View>
        )}

        {entries.length > 0 && (
          <View style={styles.pinnedSection}>
            {entries.map((entry) => (
              <DashboardVacationWidget
                key={entry.vacation.id}
                vacation={entry.vacation}
                allTasks={entry.allTasks}
                packingItems={entry.packingItems}
                onPress={() =>
                  router.push(`/(app)/(vacations)/${entry.vacation.id}`)
                }
                onLifecycleChange={(lc) =>
                  handleLifecycleChange(entry.vacation.id, lc)
                }
              />
            ))}
          </View>
        )}

        <View style={styles.widgetSection}>
          <MealPlanWidget
            nextMeal={nextMeal}
            nextMealProfiles={nextMealProfiles}
            emptySlot={emptySlot}
            showPlanningReminder={showPlanningReminder}
            onPress={() => router.push("/(app)/(meal-plan)")}
          />
        </View>

        <View style={styles.widgetSection}>
          <LeftoversWidget
            items={activeLeftovers}
            onPress={() => router.push("/(app)/(leftovers)")}
          />
        </View>

        <View style={styles.widgetSection}>
          <ShoppingWidget
            itemCount={shoppingCount}
            urgentCount={urgentCount}
            onPress={() => router.push("/(app)/(shopping)")}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  body: { paddingHorizontal: 16, paddingTop: 16 },
  pinnedSection: { gap: 16, marginBottom: 32 },
  emptyState: { alignItems: "center", marginVertical: 40 },
  emptyText: { fontSize: 16, color: "#888888", marginBottom: 16 },
  ctaBtn: {
    backgroundColor: "#B5451B",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  ctaBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  widgetSection: { marginBottom: 24 },
});
