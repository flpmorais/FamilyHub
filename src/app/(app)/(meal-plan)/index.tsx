import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { IconButton, ActivityIndicator, Icon } from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRepository } from '../../../hooks/use-repository';
import { useAuthStore } from '../../../stores/auth.store';
import { useMealPlanStore, getMonday } from '../../../stores/meal-plan.store';
import { MealAddForm, MealEditForm } from '../../../components/meal-plan';
import { logger } from '../../../utils/logger';
import type { MealEntry, MealSlot, MealType, MealPlanSlotConfig } from '../../../types/meal-plan.types';
import type { Profile } from '../../../types/profile.types';

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MEAL_SLOTS: MealSlot[] = ['lunch', 'dinner'];
const SLOT_LABELS: Record<MealSlot, string> = { lunch: 'Almoço', dinner: 'Jantar' };

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatWeekLabel(weekStart: string): string {
  const start = parseLocalDate(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const startStr = start.toLocaleDateString('pt-PT', opts);
  const endStr = end.toLocaleDateString('pt-PT', { ...opts, year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

function getDayDate(weekStart: string, dayOfWeek: number): string {
  const d = parseLocalDate(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  return d.getDate().toString();
}

function isToday(weekStart: string, dayOfWeek: number): boolean {
  const d = parseLocalDate(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

interface SlotContext {
  dayOfWeek: number;
  mealSlot: MealSlot;
}

export default function MealPlanScreen() {
  const mealPlanRepo = useRepository('mealPlan');
  const profileRepo = useRepository('profile');
  const { userAccount } = useAuthStore();
  const { currentWeekStart, setCurrentWeekStart, goToNextWeek, goToPreviousWeek, goToCurrentWeek } = useMealPlanStore();

  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileIds, setProfileIds] = useState<string[]>([]);
  const [slotConfigs, setSlotConfigs] = useState<MealPlanSlotConfig[]>([]);
  const [addSlot, setAddSlot] = useState<SlotContext | null>(null);
  const [editMeal, setEditMeal] = useState<MealEntry | null>(null);
  const [linkableMeals, setLinkableMeals] = useState<MealEntry[]>([]);

  const loadWeek = useCallback(async () => {
    if (!userAccount?.familyId) {
      setEntries([]);
      setLinkableMeals([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [data, homeCookedMeals] = await Promise.all([
        mealPlanRepo.getWeek(userAccount.familyId, currentWeekStart),
        mealPlanRepo.getRecentHomeCookedMeals(userAccount.familyId, currentWeekStart),
      ]);
      setEntries(data);
      setLinkableMeals(homeCookedMeals);
    } catch (err) {
      logger.error('MealPlanScreen', 'Erro ao carregar plano de refeições', err);
    } finally {
      setIsLoading(false);
    }
  }, [mealPlanRepo, userAccount?.familyId, currentWeekStart]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  useEffect(() => {
    if (!userAccount?.familyId) return;
    Promise.all([
      profileRepo.getProfilesByFamily(userAccount.familyId),
      mealPlanRepo.getConfig(userAccount.familyId),
    ]).then(([profileList, configs]) => {
      setProfiles(profileList);
      setProfileIds(profileList.map((p) => p.id));
      setSlotConfigs(configs);
    }).catch((err: unknown) => {
      logger.error('MealPlanScreen', 'Erro ao carregar perfis/configuração', err);
    });
  }, [profileRepo, mealPlanRepo, userAccount?.familyId]);

  function isSlotSkippedByConfig(dayOfWeek: number, mealSlot: MealSlot): boolean {
    const config = slotConfigs.find((c) => c.dayOfWeek === dayOfWeek && c.mealSlot === mealSlot);
    return config?.isSkip ?? false;
  }

  function getDefaultParticipants(dayOfWeek: number, mealSlot: MealSlot): string[] {
    const config = slotConfigs.find((c) => c.dayOfWeek === dayOfWeek && c.mealSlot === mealSlot);
    if (config) return config.participants;
    return profileIds; // fallback: all profiles when no config row exists
  }

  async function handleAddMeal(name: string, mealType: MealType, detail: string | null, linkedMealId: string | null) {
    if (!userAccount?.familyId || !addSlot) return;
    await mealPlanRepo.create({
      familyId: userAccount.familyId,
      weekStart: currentWeekStart,
      dayOfWeek: addSlot.dayOfWeek,
      mealSlot: addSlot.mealSlot,
      name,
      mealType,
      detail: detail ?? undefined,
      linkedMealId: linkedMealId ?? undefined,
      participants: getDefaultParticipants(addSlot.dayOfWeek, addSlot.mealSlot),
    });
    await loadWeek();
  }

  async function handleEditMeal(id: string, name: string, mealType: MealType, detail: string | null, participants: string[], isSlotOverridden: boolean, linkedMealId: string | null) {
    await mealPlanRepo.update(id, { name, mealType, detail, participants, isSlotOverridden, linkedMealId });
    await loadWeek();
  }

  async function handleDeleteMeal(id: string) {
    await mealPlanRepo.delete(id);
    await loadWeek();
  }

  async function handleSkipMeal(id: string) {
    if (!userAccount?.familyId || !editMeal) return;
    await mealPlanRepo.delete(id);
    await mealPlanRepo.skipSlot(
      userAccount.familyId,
      currentWeekStart,
      editMeal.dayOfWeek,
      editMeal.mealSlot
    );
    await loadWeek();
  }

  function handleSlotPress(dayOfWeek: number, slot: MealSlot) {
    const entry = getEntry(dayOfWeek, slot);
    if (entry && !entry.isSlotSkipped) {
      setEditMeal(entry);
    } else if (entry && entry.isSlotSkipped) {
      Alert.alert(
        'Reativar horário',
        'Quer reativar este horário para esta semana?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Reativar',
            onPress: async () => {
              await mealPlanRepo.delete(entry.id);
              await loadWeek();
            },
          },
        ]
      );
    } else if (!entry && isSlotSkippedByConfig(dayOfWeek, slot)) {
      Alert.alert(
        'Ativar horário',
        'Este horário está marcado como saltar. Quer ativá-lo para esta semana?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ativar',
            onPress: () => {
              if (profileIds.length === 0) return;
              setAddSlot({ dayOfWeek, mealSlot: slot });
            },
          },
        ]
      );
    } else if (!entry) {
      if (profileIds.length === 0) return;
      setAddSlot({ dayOfWeek, mealSlot: slot });
    }
  }

  const getEntry = (dayOfWeek: number, slot: MealSlot): MealEntry | undefined => {
    return entries.find((e) => e.dayOfWeek === dayOfWeek && e.mealSlot === slot);
  };

  function onWeekPickerChange(_: DateTimePickerEvent, date?: Date) {
    setShowWeekPicker(Platform.OS === 'ios');
    if (date) {
      setCurrentWeekStart(getMonday(date));
    }
  }

  return (
    <View style={styles.container}>
      {/* Week navigation header */}
      <View style={styles.navHeader}>
        <IconButton icon="chevron-left" size={24} onPress={goToPreviousWeek} />
        <TouchableOpacity onPress={goToCurrentWeek} style={styles.weekLabelContainer}>
          <Text style={styles.weekLabel}>{formatWeekLabel(currentWeekStart)}</Text>
        </TouchableOpacity>
        <IconButton icon="chevron-right" size={24} onPress={goToNextWeek} />
        <IconButton icon="calendar" size={22} onPress={() => setShowWeekPicker(true)} />
      </View>
      {showWeekPicker && (
        <DateTimePicker
          value={parseLocalDate(currentWeekStart)}
          mode="date"
          display="default"
          onChange={onWeekPickerChange}
        />
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gridScroll}>
          <View style={styles.grid}>
            {/* Day headers */}
            <View style={styles.headerRow}>
              <View style={styles.slotLabelCell} />
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <View
                  key={day}
                  style={[styles.dayHeader, isToday(currentWeekStart, day) && styles.todayHeader]}
                >
                  <Text style={[styles.dayLabel, isToday(currentWeekStart, day) && styles.todayLabel]}>
                    {DAY_LABELS[day - 1]}
                  </Text>
                  <Text style={[styles.dayDate, isToday(currentWeekStart, day) && styles.todayLabel]}>
                    {getDayDate(currentWeekStart, day)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Meal rows */}
            {MEAL_SLOTS.map((slot) => (
              <View key={slot} style={styles.mealRow}>
                <View style={styles.slotLabelCell}>
                  <Text style={styles.slotLabel}>{SLOT_LABELS[slot]}</Text>
                </View>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const entry = getEntry(day, slot);
                  const skippedByEntry = entry?.isSlotSkipped;
                  const skippedByConfig = !entry && isSlotSkippedByConfig(day, slot);
                  const skipped = skippedByEntry || skippedByConfig;
                  return (
                    <TouchableOpacity
                      key={`${day}-${slot}`}
                      style={[
                        styles.mealCell,
                        skipped && styles.skippedCell,
                        isToday(currentWeekStart, day) && styles.todayCell,
                      ]}
                      onPress={() => handleSlotPress(day, slot)}
                      activeOpacity={0.6}
                    >
                      {entry && !skippedByEntry ? (
                        <View style={styles.mealCellContent}>
                          {entry.mealType === 'leftovers' ? (
                            <>
                              <Icon source="recycle-variant" size={12} color="#888" />
                              <Text style={styles.mealDetail} numberOfLines={1}>Restos</Text>
                              <Text style={styles.mealName} numberOfLines={1}>
                                {entry.name}
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text style={styles.mealName} numberOfLines={entry.detail ? 1 : 2}>
                                {entry.name}
                              </Text>
                              {entry.mealType === 'eating_out' && (
                                <Icon source="store" size={12} color="#888" />
                              )}
                              {entry.mealType === 'takeaway' && (
                                <Icon source="food-takeout-box" size={12} color="#888" />
                              )}
                            </>
                          )}
                          {entry.isSlotOverridden && (
                            <Icon source="account-edit" size={10} color="#B5451B" />
                          )}
                          {entry.detail ? (
                            <Text style={styles.mealDetail} numberOfLines={1}>{entry.detail}</Text>
                          ) : null}
                        </View>
                      ) : skipped ? (
                        <Text style={styles.skippedText}>—</Text>
                      ) : (
                        <Text style={styles.emptyText}>+</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <MealAddForm
        visible={!!addSlot}
        dayLabel={addSlot ? DAY_LABELS[addSlot.dayOfWeek - 1] : ''}
        slotLabel={addSlot ? SLOT_LABELS[addSlot.mealSlot] : ''}
        linkableMeals={linkableMeals}
        onClose={() => setAddSlot(null)}
        onSave={handleAddMeal}
      />

      <MealEditForm
        visible={!!editMeal}
        meal={editMeal}
        profiles={profiles}
        linkableMeals={linkableMeals}
        onClose={() => setEditMeal(null)}
        onSave={handleEditMeal}
        onDelete={handleDeleteMeal}
        onSkip={handleSkipMeal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: 48,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  weekLabelContainer: {
    flex: 1,
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridScroll: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  slotLabelCell: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayHeader: {
    width: 80,
    alignItems: 'center',
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 8,
  },
  todayHeader: {
    backgroundColor: '#B5451B',
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  dayDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  todayLabel: {
    color: '#FFF',
  },
  mealRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  slotLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
  },
  mealCell: {
    width: 80,
    height: 56,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  todayCell: {
    borderColor: '#B5451B',
    borderWidth: 2,
  },
  skippedCell: {
    backgroundColor: '#F0F0F0',
    borderColor: '#E8E8E8',
  },
  mealCellContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealName: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
  },
  mealDetail: {
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
  },
  skippedText: {
    fontSize: 14,
    color: '#CCC',
  },
  emptyText: {
    fontSize: 18,
    color: '#DDD',
  },
});
