import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Modal,
  Alert,
  Switch,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useRepository } from "../../../../hooks/use-repository";
import { useAuthStore } from "../../../../stores/auth.store";
import { logger } from "../../../../utils/logger";
import { usePackingStore } from "../../../../stores/packing.store";
import { VacationHeroCard } from "../../../../components/vacation-hero-card";
import { BookingTaskList } from "../../../../components/booking-task-list";
import { PackingItemList } from "../../../../components/packing-item-list";
import { Icon } from "react-native-paper";
import type {
  Vacation,
  VacationLifecycle,
  BookingTask,
  VacationBag,
} from "../../../../types/vacation.types";
import { useIconStore } from "../../../../stores/icon.store";
import type {
  PackingStatus,
  Category,
  Tag,
  BagTemplate,
} from "../../../../types/packing.types";
import type { Profile } from "../../../../types/profile.types";

type TabId = "tasks" | "packing" | "bags";

export default function VacationDetailScreen() {
  const { id: vacationId } = useLocalSearchParams<{ id: string }>();
  const vacationRepo = useRepository("vacation");
  const packingRepo = useRepository("packingItem");
  const profileRepo = useRepository("profile");
  const categoryRepo = useRepository("category");
  const tagRepo = useRepository("tag");
  const iconRepo = useRepository("icon");
  const bagTemplateRepo = useRepository("bagTemplate");
  const { userAccount } = useAuthStore();
  const { loadIcons } = useIconStore();

  const [vacation, setVacation] = useState<Vacation | null>(null);
  const [tasks, setTasks] = useState<BookingTask[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("tasks");
  const [tabInitialized, setTabInitialized] = useState(false);
  const setActiveVacation = usePackingStore((s) => s.setActiveVacation);

  // Packing items (loaded in loadData)
  const [items, setItems] = useState<
    import("../../../../types/packing.types").PackingItem[]
  >([]);
  const [vacationBags, setVacationBags] = useState<VacationBag[]>([]);
  const [bagTemplates, setBagTemplates] = useState<BagTemplate[]>([]);
  const [expandedBags, setExpandedBags] = useState<Set<string>>(new Set());
  const [bagPickerVisible, setBagPickerVisible] = useState(false);

  const topLevelIncomplete = tasks.filter((t) => !t.isComplete);
  const allTasksDone = tasks.length > 0 && topLevelIncomplete.length === 0;

  // Packing percentage — always show when lifecycle is packing, otherwise only if some packed
  const packedCount = items.filter((i) => i.status === "packed").length;
  const showPct =
    (vacation?.lifecycle === "packing" && items.length > 0) ||
    (items.length > 0 && packedCount > 0);
  const packingLabel = showPct
    ? `Bagagem (${Math.round((packedCount / items.length) * 100)}%)`
    : "Bagagem";

  const loadData = useCallback(async () => {
    if (!vacationId || !userAccount?.familyId) return;
    try {
      const [
        allVacs,
        taskList,
        profList,
        catList,
        tagList,
        packingList,
        vacBags,
        bagList,
      ] = await Promise.all([
        vacationRepo.getVacations(userAccount.familyId),
        vacationRepo.getBookingTasks(vacationId),
        profileRepo.getProfilesByFamily(userAccount.familyId),
        categoryRepo.getCategories(userAccount.familyId),
        tagRepo.getTags(userAccount.familyId),
        packingRepo.getPackingItems(vacationId),
        vacationRepo.getVacationBags(vacationId),
        bagTemplateRepo.getBagTemplates(userAccount.familyId),
      ]);
      await loadIcons(iconRepo);
      setVacation(allVacs.find((v) => v.id === vacationId) ?? null);
      setTasks(taskList);
      setProfiles(profList);
      setCategories(catList);
      setItems(packingList);
      setVacationBags(vacBags);
      setBagTemplates(bagList);
      // Only show tags that are actually used by packing items in this trip
      const usedTagIds = new Set(packingList.flatMap((i) => i.tagIds));
      setTags(
        usedTagIds.size > 0 ? tagList.filter((t) => usedTagIds.has(t.id)) : [],
      );
    } catch (err) {
      logger.error("VacationDetail", "loadData failed", err);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacationId]);

  useFocusEffect(
    useCallback(() => {
      if (vacationId) setActiveVacation(vacationId);
      void loadData();
    }, [loadData, vacationId, setActiveVacation]),
  );

  useEffect(() => {
    if (!isLoading && !tabInitialized) {
      const isPacking = vacation?.lifecycle === "packing";
      const allDone = tasks.length > 0 && tasks.every((t) => t.isComplete);
      setActiveTab(
        isPacking || allDone || tasks.length === 0 ? "packing" : "tasks",
      );
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

  async function reloadVacationBags() {
    if (!vacationId) return;
    const bags = await vacationRepo.getVacationBags(vacationId);
    setVacationBags(bags);
  }

  // ── Callbacks ──────────────────────────────────────────────────────────────

  async function handleToggleTask(task: BookingTask) {
    await vacationRepo.updateBookingTask(task.id, {
      isComplete: !task.isComplete,
    });
    await reloadTasks();
  }

  async function handleCreateTask(
    title: string,
    dueDate: string,
    profileId: string | null,
  ) {
    await vacationRepo.createBookingTask({
      vacationId: vacationId!,
      familyId: userAccount!.familyId,
      title,
      taskType: "custom",
      dueDate,
      profileId: profileId ?? undefined,
    });
    await reloadTasks();
  }

  async function handleCreateItem(
    name: string,
    profileId: string | null,
    quantity: number,
    categoryId: string | null,
    iconId: string,
    isAllFamily: boolean,
    vacationBagId: string | null,
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
      vacationBagId: vacationBagId ?? undefined,
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
      vacationBagId: string | null;
    },
  ) {
    await packingRepo.updatePackingItem(id, data);
    await reloadPackingItems();
  }

  async function handleDeleteItem(id: string) {
    await packingRepo.deletePackingItem(id);
    await reloadPackingItems();
  }

  async function handleStatusChange(
    id: string,
    status: PackingStatus,
    vacationBagId?: string,
  ) {
    const updates: Record<string, unknown> = { status };
    if (vacationBagId !== undefined) updates.vacationBagId = vacationBagId;
    await packingRepo.updatePackingItem(id, updates as any);
    await reloadPackingItems();
  }

  async function handleLifecycleChange(lc: VacationLifecycle) {
    if (!vacation) return;
    try {
      const updates: Partial<Vacation> = { lifecycle: lc };
      if (lc === "cancelled" || lc === "completed") updates.isPinned = false;
      await vacationRepo.updateVacation(vacation.id, updates);
      await loadData();
    } catch (err) {
      logger.error("VacationDetail", "changeLifecycle failed", err);
    }
  }

  async function handleAddBag(bagTemplate: BagTemplate) {
    await vacationRepo.addVacationBag(
      vacationId!,
      bagTemplate.id,
      bagTemplate.isTopLevel,
    );
    await reloadVacationBags();
    setBagPickerVisible(false);
  }

  const [editingBag, setEditingBag] = useState<VacationBag | null>(null);
  const [editBagTopLevel, setEditBagTopLevel] = useState(true);

  function openEditBag(vb: VacationBag) {
    setEditingBag(vb);
    setEditBagTopLevel(vb.isTopLevel);
  }

  async function handleSaveBag() {
    if (!editingBag) return;
    if (editBagTopLevel !== editingBag.isTopLevel) {
      await vacationRepo.updateVacationBagTopLevel(
        editingBag.id,
        editBagTopLevel,
      );
    }
    setEditingBag(null);
    await reloadVacationBags();
  }

  async function handleDeleteBagWithItems() {
    if (!editingBag) return;
    Alert.alert(
      "Eliminar mala?",
      'Os itens nesta mala ficarão sem mala atribuída e os embalados voltarão ao estado "Novo".',
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const bagItems = items.filter(
              (i) => i.vacationBagId === editingBag.id,
            );
            for (const item of bagItems) {
              const updates: Record<string, unknown> = { vacationBagId: null };
              if (item.status === "packed") updates.status = "new";
              await packingRepo.updatePackingItem(item.id, updates as any);
            }
            await vacationRepo.removeVacationBag(editingBag.id);
            setEditingBag(null);
            await reloadPackingItems();
            await reloadVacationBags();
          },
        },
      ],
    );
  }

  function toggleBagExpanded(vacationBagId: string) {
    setExpandedBags((prev) => {
      const next = new Set(prev);
      if (next.has(vacationBagId)) next.delete(vacationBagId);
      else next.add(vacationBagId);
      return next;
    });
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
        <Text style={{ color: "#888", marginBottom: 16 }}>
          Viagem não encontrada.
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: "#B5451B", fontSize: 16 }}>← Voltar</Text>
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
          style={[st.tab, activeTab === "tasks" && st.tabActive]}
          onPress={() => setActiveTab("tasks")}
        >
          <Text style={[st.tabText, activeTab === "tasks" && st.tabTextActive]}>
            Tarefas
          </Text>
          {allTasksDone ? (
            <View style={st.badgeDone}>
              <Text style={st.badgeDoneText}>✓</Text>
            </View>
          ) : topLevelIncomplete.length > 0 ? (
            <View style={st.badgePending}>
              <Text style={st.badgePendingText}>
                {topLevelIncomplete.length}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.tab, activeTab === "packing" && st.tabActive]}
          onPress={() => setActiveTab("packing")}
        >
          <Text
            style={[st.tabText, activeTab === "packing" && st.tabTextActive]}
          >
            {packingLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.tab, activeTab === "bags" && st.tabActive]}
          onPress={() => setActiveTab("bags")}
        >
          <Text style={[st.tabText, activeTab === "bags" && st.tabTextActive]}>
            Malas{vacationBags.length > 0 ? ` (${vacationBags.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      {activeTab === "tasks" ? (
        <BookingTaskList
          tasks={tasks}
          profiles={profiles}
          onToggleComplete={handleToggleTask}
          onCreateTask={handleCreateTask}
        />
      ) : activeTab === "bags" ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          >
            {vacationBags.length === 0 && (
              <Text
                style={{
                  color: "#888888",
                  textAlign: "center",
                  marginVertical: 32,
                }}
              >
                Nenhuma mala adicionada.
              </Text>
            )}
            {vacationBags.map((vb) => {
              const bt = bagTemplates.find((b) => b.id === vb.bagTemplateId);
              if (!bt) return null;
              const bagItems = items.filter((i) => i.vacationBagId === vb.id);
              const isExpanded = expandedBags.has(vb.id);
              return (
                <View key={vb.id} style={st.accordionContainer}>
                  <View style={st.accordionHeader}>
                    <TouchableOpacity
                      style={{
                        flex: 3,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                      onPress={() => openEditBag(vb)}
                    >
                      <View
                        style={[st.bagDot, { backgroundColor: bt.color }]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={st.bagName}>
                          {bt.name} · {bagItems.length}{" "}
                          {bagItems.length === 1 ? "item" : "itens"}
                        </Text>
                        <Text style={st.bagMeta}>
                          {bt.sizeLiters}L ·{" "}
                          {vb.isTopLevel ? "Principal" : "Interna"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 12,
                      }}
                      onPress={() => toggleBagExpanded(vb.id)}
                    >
                      <Icon
                        source={isExpanded ? "chevron-up" : "chevron-down"}
                        size={24}
                        color="#888888"
                      />
                    </TouchableOpacity>
                  </View>
                  {isExpanded && (
                    <View style={st.accordionBody}>
                      {bagItems.length === 0 ? (
                        <Text style={st.accordionEmpty}>
                          Sem itens nesta mala
                        </Text>
                      ) : (
                        bagItems.map((item) => (
                          <View key={item.id} style={st.accordionItem}>
                            <Text
                              style={st.accordionItemName}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                            <Text style={st.accordionItemMeta}>
                              {item.assignedProfileId
                                ? (profiles.find(
                                    (p) => p.id === item.assignedProfileId,
                                  )?.displayName ?? "")
                                : ""}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>
              );
            })}
            {/* Unassigned items section */}
            {(() => {
              const unassigned = items.filter((i) => !i.vacationBagId);
              if (unassigned.length === 0) return null;
              return (
                <View style={st.accordionContainer}>
                  <View style={st.accordionHeader}>
                    <View style={[st.bagDot, { backgroundColor: "#CCCCCC" }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[st.bagName, { color: "#888888" }]}>
                        Sem mala
                      </Text>
                      <Text style={st.bagMeta}>
                        {unassigned.length}{" "}
                        {unassigned.length === 1 ? "item" : "itens"}
                      </Text>
                    </View>
                  </View>
                  <View style={st.accordionBody}>
                    {unassigned.map((item) => (
                      <View key={item.id} style={st.accordionItem}>
                        <Text style={st.accordionItemName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={st.accordionItemMeta}>
                          {item.assignedProfileId
                            ? (profiles.find(
                                (p) => p.id === item.assignedProfileId,
                              )?.displayName ?? "")
                            : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}
          </ScrollView>
          {/* Add bag FAB */}
          <TouchableOpacity
            style={st.bagFab}
            onPress={() => setBagPickerVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={st.bagFabText}>+</Text>
          </TouchableOpacity>
          {/* Bag picker modal */}
          <Modal
            visible={bagPickerVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setBagPickerVisible(false)}
          >
            <View style={st.bagPickerOverlay}>
              <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={1}
                onPress={() => setBagPickerVisible(false)}
              />
              <View style={st.bagPickerSheet}>
                <Text style={st.bagPickerTitle}>Adicionar mala</Text>
                {(() => {
                  const addedIds = new Set(
                    vacationBags.map((vb) => vb.bagTemplateId),
                  );
                  const available = bagTemplates.filter(
                    (b) => b.active && !addedIds.has(b.id),
                  );
                  if (available.length === 0)
                    return (
                      <Text style={{ color: "#888888", marginBottom: 16 }}>
                        Todas as malas já foram adicionadas.
                      </Text>
                    );
                  return (
                    <FlatList
                      data={available}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item: bag }) => (
                        <TouchableOpacity
                          style={st.bagPickerRow}
                          onPress={() => handleAddBag(bag)}
                        >
                          <View
                            style={[st.bagDot, { backgroundColor: bag.color }]}
                          />
                          <Text
                            style={{ fontSize: 15, color: "#1A1A1A", flex: 1 }}
                          >
                            {bag.name}
                          </Text>
                          <Text style={{ fontSize: 13, color: "#888888" }}>
                            {bag.sizeLiters}L
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  );
                })()}
              </View>
            </View>
          </Modal>
          {/* Edit bag modal */}
          {editingBag &&
            (() => {
              const bt = bagTemplates.find(
                (b) => b.id === editingBag.bagTemplateId,
              );
              return (
                <Modal
                  visible
                  animationType="slide"
                  transparent
                  onRequestClose={() => setEditingBag(null)}
                >
                  <View style={st.bagPickerOverlay}>
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      activeOpacity={1}
                      onPress={() => setEditingBag(null)}
                    />
                    <View style={st.bagPickerSheet}>
                      <Text style={st.bagPickerTitle}>Editar mala</Text>
                      {bt && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 16,
                          }}
                        >
                          <View
                            style={[st.bagDot, { backgroundColor: bt.color }]}
                          />
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "500",
                              color: "#1A1A1A",
                            }}
                          >
                            {bt.name}
                          </Text>
                          <Text style={{ fontSize: 13, color: "#888888" }}>
                            {bt.sizeLiters}L
                          </Text>
                        </View>
                      )}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 20,
                          paddingVertical: 4,
                        }}
                      >
                        <Text style={{ fontSize: 15, color: "#1A1A1A" }}>
                          Mala principal
                        </Text>
                        <Switch
                          value={editBagTopLevel}
                          onValueChange={setEditBagTopLevel}
                          trackColor={{ true: "#B5451B" }}
                        />
                      </View>
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <TouchableOpacity
                          style={{
                            paddingVertical: 14,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: "#D32F2F",
                            alignItems: "center",
                          }}
                          onPress={handleDeleteBagWithItems}
                        >
                          <Text
                            style={{
                              color: "#D32F2F",
                              fontSize: 14,
                              fontWeight: "600",
                            }}
                          >
                            Eliminar
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: "#B5451B",
                            paddingVertical: 14,
                            borderRadius: 8,
                            alignItems: "center",
                          }}
                          onPress={handleSaveBag}
                        >
                          <Text
                            style={{
                              color: "#FFFFFF",
                              fontSize: 16,
                              fontWeight: "600",
                            }}
                          >
                            Guardar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>
              );
            })()}
        </View>
      ) : (
        <PackingItemList
          items={items}
          profiles={profiles}
          categories={categories}
          tags={tags}
          vacationBags={vacationBags}
          bagTemplates={bagTemplates}
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#B5451B" },
  tabText: { fontSize: 15, fontWeight: "500", color: "#888888" },
  tabTextActive: { color: "#B5451B", fontWeight: "600" },
  badgePending: {
    backgroundColor: "#D32F2F",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgePendingText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  badgeDone: {
    backgroundColor: "#388E3C",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeDoneText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  // Bags tab
  accordionContainer: {
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    backgroundColor: "#FAFAFA",
  },
  accordionBody: { paddingHorizontal: 12, paddingBottom: 8 },
  accordionEmpty: {
    fontSize: 13,
    color: "#AAAAAA",
    fontStyle: "italic",
    paddingVertical: 8,
  },
  accordionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  accordionItemName: { fontSize: 14, color: "#1A1A1A", flex: 1 },
  accordionItemMeta: { fontSize: 12, color: "#888888" },
  bagDot: { width: 16, height: 16, borderRadius: 8 },
  bagName: { fontSize: 15, fontWeight: "500", color: "#1A1A1A" },
  bagMeta: { fontSize: 12, color: "#888888" },
  topLevelChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
  topLevelChipActive: { backgroundColor: "#B5451B", borderColor: "#B5451B" },
  topLevelText: { fontSize: 11, color: "#555555", fontWeight: "500" },
  topLevelTextActive: { color: "#FFFFFF" },
  bagFab: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#B5451B",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  bagFabText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "400",
    marginTop: -2,
  },
  bagPickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  bagPickerSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "50%",
  },
  bagPickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  bagPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 10,
  },
});
