import { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { IconButton, ActivityIndicator, Icon } from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRepository } from '../../../hooks/use-repository';
import { useAuthStore } from '../../../stores/auth.store';
import { useMealPlanStore, getMonday } from '../../../stores/meal-plan.store';
import { MealAddForm, MealEditForm } from '../../../components/meal-plan';
import { PageHeader } from '../../../components/page-header';
import { supabaseClient } from '../../../repositories/supabase/supabase.client';
import { logger } from '../../../utils/logger';
import type { MealEntry, MealSlot, MealType, MealPlanSlotConfig } from '../../../types/meal-plan.types';
import type { Profile } from '../../../types/profile.types';

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const DAY_FULL_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
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

function formatDayCardLabel(weekStart: string, dayOfWeek: number): string {
  const d = parseLocalDate(weekStart);
  d.setDate(d.getDate() + (dayOfWeek - 1));
  const dateStr = d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
  return `${DAY_FULL_LABELS[dayOfWeek - 1]}, ${dateStr}`;
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
  const [familyBannerUrl, setFamilyBannerUrl] = useState<string | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());

  useEffect(() => {
    const thisWeekStart = getMonday(new Date());
    if (currentWeekStart === thisWeekStart) {
      const today = new Date();
      const todayDow = today.getDay() === 0 ? 7 : today.getDay();
      const collapsed = new Set<number>();
      for (let d = 1; d < todayDow; d++) collapsed.add(d);
      setCollapsedDays(collapsed);
    } else {
      setCollapsedDays(new Set());
    }
  }, [currentWeekStart]);

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
        mealPlanRepo.getRecentLinkableMeals(userAccount.familyId, currentWeekStart, 1),
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
    const familyId = userAccount.familyId;
    Promise.all([
      profileRepo.getProfilesByFamily(familyId),
      mealPlanRepo.getConfig(familyId),
    ]).then(([profileList, configs]) => {
      setProfiles(profileList);
      setProfileIds(profileList.map((p) => p.id));
      setSlotConfigs(configs);
    }).catch((err: unknown) => {
      logger.error('MealPlanScreen', 'Erro ao carregar perfis/configuração', err);
    });
    supabaseClient.from('families').select('banner_url').eq('id', familyId).single()
      .then(({ data }) => { if (data) setFamilyBannerUrl(data.banner_url ?? null); });
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

  async function handleAddMeal(name: string, mealType: MealType, linkedMealId: string | null, participants: string[]) {
    if (!userAccount?.familyId || !addSlot) return;
    if (participants.length === 0) {
      await mealPlanRepo.skipSlot(userAccount.familyId, currentWeekStart, addSlot.dayOfWeek, addSlot.mealSlot);
      await loadWeek();
      return;
    }
    await mealPlanRepo.create({
      familyId: userAccount.familyId,
      weekStart: currentWeekStart,
      dayOfWeek: addSlot.dayOfWeek,
      mealSlot: addSlot.mealSlot,
      name,
      mealType,
      linkedMealId: linkedMealId ?? undefined,
      participants,
    });
    await loadWeek();
  }

  async function handleEditMeal(id: string, name: string, mealType: MealType, participants: string[], isSlotOverridden: boolean, linkedMealId: string | null) {
    await mealPlanRepo.update(id, { name, mealType, participants, isSlotOverridden, linkedMealId });
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
      // Delete the skip entry, then open add form
      mealPlanRepo.delete(entry.id).then(() => {
        loadWeek();
        if (profileIds.length === 0) return;
        setAddSlot({ dayOfWeek, mealSlot: slot });
      });
    } else {
      // Empty slot or config-skipped — open add form directly
      if (profileIds.length === 0) return;
      setAddSlot({ dayOfWeek, mealSlot: slot });
    }
  }

  const getEntry = (dayOfWeek: number, slot: MealSlot): MealEntry | undefined => {
    return entries.find((e) => e.dayOfWeek === dayOfWeek && e.mealSlot === slot);
  };

  function toggleDayCollapse(day: number) {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function onWeekPickerChange(_: DateTimePickerEvent, date?: Date) {
    setShowWeekPicker(Platform.OS === 'ios');
    if (date) {
      setCurrentWeekStart(getMonday(date));
    }
  }

  function renderSlotRow(day: number, slot: MealSlot) {
    const entry = getEntry(day, slot);
    const skippedByEntry = entry?.isSlotSkipped;
    const skippedByConfig = !entry && isSlotSkippedByConfig(day, slot);
    const skipped = skippedByEntry || skippedByConfig;

    return (
      <TouchableOpacity
        key={`${day}-${slot}`}
        style={[styles.slotRow, skipped && styles.slotRowSkipped]}
        onPress={() => handleSlotPress(day, slot)}
        activeOpacity={0.6}
      >
        <Text style={[styles.slotLabel, skipped && styles.slotLabelSkipped]}>{SLOT_LABELS[slot]}</Text>
        <View style={styles.slotContent}>
          {entry && !skippedByEntry ? (
            <>
              <View style={styles.mealInfo}>
                <View style={styles.mealNameRow}>
                  {entry.mealType === 'leftovers' && (
                    <Icon source="recycle-variant" size={14} color="#888" />
                  )}
                  {entry.mealType === 'eating_out' && (
                    <Icon source="store" size={14} color="#888" />
                  )}
                  {entry.mealType === 'takeaway' && (
                    <Icon source="food-takeout-box" size={14} color="#888" />
                  )}
                  <Text style={styles.mealName} numberOfLines={1}>{entry.name}</Text>
                  {entry.isSlotOverridden && (
                    <Icon source="account-edit" size={12} color="#B5451B" />
                  )}
                </View>
              </View>
              {entry.participants.length > 0 && (
                <View style={styles.avatarRow}>
                  {entry.participants.slice(0, 4).map((pid, idx) => {
                    const p = profiles.find((pr) => pr.id === pid);
                    if (!p) return null;
                    return (
                      <View key={pid} style={[styles.avatarCircle, idx > 0 && styles.avatarOverlap]}>
                        {p.avatarUrl ? (
                          <Image source={{ uri: p.avatarUrl }} style={styles.avatarImage} />
                        ) : (
                          <Text style={styles.avatarInitial}>{p.displayName[0]?.toUpperCase() ?? '?'}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          ) : skipped ? (
            <Text style={styles.skippedText}>Saltar</Text>
          ) : (
            <View style={styles.emptySlot}>
              <Icon source="plus" size={16} color="#CCC" />
              <Text style={styles.emptyText}>Adicionar</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Refeições" familyBannerUri={familyBannerUrl} />

      {/* Week navigation */}
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
        <ScrollView style={styles.dayList} contentContainerStyle={styles.dayListContent}>
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const today = isToday(currentWeekStart, day);
            const collapsed = collapsedDays.has(day);
            return (
              <View key={day} style={[styles.dayCard, today && styles.dayCardToday]}>
                <TouchableOpacity
                  style={[styles.dayCardHeader, today && styles.dayCardHeaderToday]}
                  onPress={() => toggleDayCollapse(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayCardTitle, today && styles.dayCardTitleToday]}>
                    {formatDayCardLabel(currentWeekStart, day)}
                  </Text>
                  <View style={styles.dayCardHeaderRight}>
                    {today && <Text style={styles.todayBadge}>Hoje</Text>}
                    <Icon source={collapsed ? 'chevron-down' : 'chevron-up'} size={20} color={today ? '#B5451B' : '#888'} />
                  </View>
                </TouchableOpacity>
                {!collapsed && (
                  <>
                    {renderSlotRow(day, 'lunch')}
                    <View style={styles.slotDivider} />
                    {renderSlotRow(day, 'dinner')}
                  </>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <MealAddForm
        visible={!!addSlot}
        dayLabel={addSlot ? DAY_LABELS[addSlot.dayOfWeek - 1] : ''}
        slotLabel={addSlot ? SLOT_LABELS[addSlot.mealSlot] : ''}
        linkableMeals={linkableMeals}
        profiles={profiles}
        defaultParticipants={addSlot ? getDefaultParticipants(addSlot.dayOfWeek, addSlot.mealSlot) : []}
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
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingBottom: 4,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
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
  dayList: {
    flex: 1,
  },
  dayListContent: {
    padding: 16,
    paddingBottom: 32,
  },
  dayCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  dayCardToday: {
    borderColor: '#B5451B',
    borderWidth: 2,
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF8F5',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dayCardHeaderToday: {
    backgroundColor: '#FFF0EB',
  },
  dayCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  dayCardTitleToday: {
    color: '#B5451B',
  },
  dayCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    backgroundColor: '#B5451B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  slotRowSkipped: {
    backgroundColor: '#F8F8F8',
  },
  slotLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    width: 60,
  },
  slotLabelSkipped: {
    color: '#CCC',
  },
  slotContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  mealInfo: {
    flex: 1,
  },
  mealNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  skippedText: {
    fontSize: 13,
    color: '#CCC',
    fontStyle: 'italic',
  },
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#CCC',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#B5451B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
    overflow: 'hidden',
  },
  avatarOverlap: {
    marginLeft: -6,
  },
  avatarImage: {
    width: 24,
    height: 24,
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
