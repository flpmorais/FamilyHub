import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useRepository } from '../../../../hooks/use-repository';
import { useAuthStore } from '../../../../stores/auth.store';
import { logger } from '../../../../utils/logger';
import { usePackingStore } from '../../../../stores/packing.store';
import { VacationHeroCard } from '../../../../components/vacation-hero-card';
import { BookingTaskList } from '../../../../components/booking-task-list';
import { PackingItemList } from '../../../../components/packing-item-list';
import type { Vacation, VacationLifecycle, BookingTask } from '../../../../types/vacation.types';
import { useIconStore } from '../../../../stores/icon.store';
import type { PackingStatus, Category, Tag } from '../../../../types/packing.types';
import type { Profile } from '../../../../types/profile.types';

type TabId = 'tasks' | 'packing';

export default function VacationDetailScreen() {
  const { id: vacationId } = useLocalSearchParams<{ id: string }>();
  const vacationRepo = useRepository('vacation');
  const packingRepo = useRepository('packingItem');
  const profileRepo = useRepository('profile');
  const categoryRepo = useRepository('category');
  const tagRepo = useRepository('tag');
  const iconRepo = useRepository('icon');
  const { userAccount } = useAuthStore();
  const { loadIcons } = useIconStore();

  const [vacation, setVacation] = useState<Vacation | null>(null);
  const [tasks, setTasks] = useState<BookingTask[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('tasks');
  const [tabInitialized, setTabInitialized] = useState(false);
  const setActiveVacation = usePackingStore((s) => s.setActiveVacation);

  // Packing items (loaded in loadData)
  const [items, setItems] = useState<import('../../../../types/packing.types').PackingItem[]>([]);

  const topLevelIncomplete = tasks.filter((t) => !t.isComplete);
  const allTasksDone = tasks.length > 0 && topLevelIncomplete.length === 0;

  // Packing percentage — always show when lifecycle is packing, otherwise only if some packed
  const packedCount = items.filter((i) => i.status === 'packed').length;
  const showPct =
    (vacation?.lifecycle === 'packing' && items.length > 0) ||
    (items.length > 0 && packedCount > 0);
  const packingLabel = showPct
    ? `Bagagem (${Math.round((packedCount / items.length) * 100)}%)`
    : 'Bagagem';

  const loadData = useCallback(async () => {
    if (!vacationId || !userAccount?.familyId) return;
    try {
      const [allVacs, taskList, profList, catList, tagList, packingList] = await Promise.all([
        vacationRepo.getVacations(userAccount.familyId),
        vacationRepo.getBookingTasks(vacationId),
        profileRepo.getProfilesByFamily(userAccount.familyId),
        categoryRepo.getCategories(userAccount.familyId),
        tagRepo.getTags(userAccount.familyId),
        packingRepo.getPackingItems(vacationId),
      ]);
      await loadIcons(iconRepo);
      setVacation(allVacs.find((v) => v.id === vacationId) ?? null);
      setTasks(taskList);
      setProfiles(profList);
      setCategories(catList);
      setItems(packingList);
      // Only show tags that are actually used by packing items in this trip
      const usedTagIds = new Set(packingList.flatMap((i) => i.tagIds));
      setTags(usedTagIds.size > 0 ? tagList.filter((t) => usedTagIds.has(t.id)) : []);
    } catch (err) {
      logger.error('VacationDetail', 'loadData failed', err);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacationId]);

  useFocusEffect(
    useCallback(() => {
      if (vacationId) setActiveVacation(vacationId);
      void loadData();
    }, [loadData, vacationId, setActiveVacation])
  );

  useEffect(() => {
    if (!isLoading && !tabInitialized) {
      const isPacking = vacation?.lifecycle === 'packing';
      const allDone = tasks.length > 0 && tasks.every((t) => t.isComplete);
      setActiveTab(isPacking || allDone || tasks.length === 0 ? 'packing' : 'tasks');
      setTabInitialized(true);
    }
  }, [isLoading, tabInitialized, tasks, vacation]);

  // ── Targeted reloads ───────────────────────────────────────────────────────

  async function reloadPackingItems() {
    if (!vacationId) return;
    const list = await packingRepo.getPackingItems(vacationId);
    setItems(list);
  }

  async function reloadTasks() {
    if (!vacationId) return;
    const taskList = await vacationRepo.getBookingTasks(vacationId);
    setTasks(taskList);
  }

  // ── Callbacks ──────────────────────────────────────────────────────────────

  async function handleToggleTask(task: BookingTask) {
    await vacationRepo.updateBookingTask(task.id, { isComplete: !task.isComplete });
    await reloadTasks();
  }

  async function handleCreateTask(title: string, dueDate: string) {
    await vacationRepo.createBookingTask({
      vacationId: vacationId!,
      familyId: userAccount!.familyId,
      title,
      taskType: 'custom',
      dueDate,
    });
    await reloadTasks();
  }

  async function handleCreateItem(
    name: string,
    profileId: string | null,
    quantity: number,
    categoryId: string | null,
    iconId: string,
    isAllFamily: boolean
  ) {
    await packingRepo.createPackingItem({
      vacationId: vacationId!,
      familyId: userAccount!.familyId,
      name,
      assignedProfileId: profileId ?? undefined,
      quantity,
      categoryId: categoryId ?? undefined,
      iconId,
      isAllFamily,
    });
    await reloadPackingItems();
  }

  async function handleUpdateItem(
    id: string,
    data: {
      name: string;
      assignedProfileId: string | null;
      quantity: number;
      status: PackingStatus;
      notes: string | null;
      categoryId: string | null;
      iconId: string;
      isAllFamily: boolean;
    }
  ) {
    await packingRepo.updatePackingItem(id, data);
    await reloadPackingItems();
  }

  async function handleDeleteItem(id: string) {
    await packingRepo.deletePackingItem(id);
    await reloadPackingItems();
  }

  async function handleStatusChange(id: string, status: PackingStatus) {
    await packingRepo.updatePackingItem(id, { status });
    await reloadPackingItems();
  }

  async function handleLifecycleChange(lc: VacationLifecycle) {
    if (!vacation) return;
    try {
      const updates: Partial<Vacation> = { lifecycle: lc };
      if (lc === 'cancelled' || lc === 'completed') updates.isPinned = false;
      await vacationRepo.updateVacation(vacation.id, updates);
      await loadData();
    } catch (err) {
      logger.error('VacationDetail', 'changeLifecycle failed', err);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={st.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!vacation) {
    return (
      <View style={st.centered}>
        <Text style={{ color: '#888', marginBottom: 16 }}>Viagem não encontrada.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#B5451B', fontSize: 16 }}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={st.container}>
      {/* Hero card */}
      <VacationHeroCard
        vacation={vacation}
        showBackButton
        height={150}
        onLifecycleChange={handleLifecycleChange}
      />

      {/* Tabs */}
      <View style={st.tabBar}>
        <TouchableOpacity
          style={[st.tab, activeTab === 'tasks' && st.tabActive]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={[st.tabText, activeTab === 'tasks' && st.tabTextActive]}>Tarefas</Text>
          {allTasksDone ? (
            <View style={st.badgeDone}>
              <Text style={st.badgeDoneText}>✓</Text>
            </View>
          ) : topLevelIncomplete.length > 0 ? (
            <View style={st.badgePending}>
              <Text style={st.badgePendingText}>{topLevelIncomplete.length}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.tab, activeTab === 'packing' && st.tabActive]}
          onPress={() => setActiveTab('packing')}
        >
          <Text style={[st.tabText, activeTab === 'packing' && st.tabTextActive]}>
            {packingLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      {activeTab === 'tasks' ? (
        <BookingTaskList
          tasks={tasks}
          onToggleComplete={handleToggleTask}
          onCreateTask={handleCreateTask}
        />
      ) : (
        <PackingItemList
          items={items}
          profiles={profiles}
          categories={categories}
          tags={tags}
          vacationTitle={vacation.title}
          onCreateItem={handleCreateItem}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onStatusChange={handleStatusChange}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#B5451B' },
  tabText: { fontSize: 15, fontWeight: '500', color: '#888888' },
  tabTextActive: { color: '#B5451B', fontWeight: '600' },
  badgePending: {
    backgroundColor: '#D32F2F',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePendingText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  badgeDone: {
    backgroundColor: '#388E3C',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDoneText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
