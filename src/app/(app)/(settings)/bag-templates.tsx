import { memo, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Switch,
  FlatList,
  type ListRenderItemInfo,
} from "react-native";
import ReorderableList, {
  reorderItems,
  useIsActive,
  useReorderableDrag,
  type ReorderableListReorderEvent,
} from "react-native-reorderable-list";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Snackbar, Icon } from "react-native-paper";
import { router } from "expo-router";
import { useModalKeyboardScroll } from "../../../hooks/use-modal-keyboard-scroll";
import { PageHeader } from "../../../components/page-header";
import { useFamily } from "../../../hooks/use-family";
import { useRepository } from "../../../hooks/use-repository";
import { useAuthStore } from "../../../stores/auth.store";
import { logger } from "../../../utils/logger";
import type { BagTemplate } from "../../../types/packing.types";

const BAG_COLORS = [
  "#D32F2F",
  "#C2185B",
  "#9C27B0",
  "#6A1B9A",
  "#3F51B5",
  "#1976D2",
  "#03A9F4",
  "#00897B",
  "#009688",
  "#388E3C",
  "#4CAF50",
  "#CDDC39",
  "#F59300",
  "#E67E22",
  "#FF7043",
  "#F44336",
  "#795548",
  "#607D8B",
  "#888888",
];

interface BagDraggableRowProps {
  bag: BagTemplate;
  onOpenEdit: (bag: BagTemplate) => void;
}

const BagDraggableRow = memo(function BagDraggableRow({
  bag,
  onOpenEdit,
}: BagDraggableRowProps) {
  const drag = useReorderableDrag();
  const isActive = useIsActive();

  return (
    <TouchableOpacity
      style={[s.row, !bag.active && s.rowInactive, isActive && s.rowDragging]}
      onPress={() => onOpenEdit(bag)}
      onLongPress={drag}
    >
      <View style={[s.colorDot, { backgroundColor: bag.color }]} />
      <View style={s.rowContent}>
        <Text style={[s.rowName, !bag.active && s.rowNameInactive]}>
          {bag.name}
        </Text>
        <Text style={s.rowMeta}>
          {bag.sizeLiters}L{!bag.isTopLevel ? " · Interna" : ""}
        </Text>
      </View>
      {!bag.active && <Text style={s.inactiveBadge}>Inactiva</Text>}
      <TouchableOpacity onPressIn={drag} disabled={isActive}>
        <Text style={[s.dragHandle, isActive && s.dragHandleActive]}>
          {"\u2261"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

export default function BagTemplatesScreen() {
  const family = useFamily();
  const bagRepo = useRepository("bagTemplate");
  const { userAccount } = useAuthStore();

  const [bags, setBags] = useState<BagTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingBag, setEditingBag] = useState<BagTemplate | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(BAG_COLORS[0]);
  const [formSizeLiters, setFormSizeLiters] = useState("40");
  const [formIsTopLevel, setFormIsTopLevel] = useState(true);
  const [formActive, setFormActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [successVisible, setSuccessVisible] = useState(false);

  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);

  const { keyboardHeight, scrollViewRef, getInputProps } =
    useModalKeyboardScroll({
      inputKeys: ["formName", "formSizeLiters", "searchText"],
    });

  async function loadBags() {
    if (!userAccount?.familyId) return;
    try {
      const list = await bagRepo.getBagTemplates(userAccount.familyId);
      setBags(list);
    } catch (err) {
      logger.error("BagTemplatesScreen", "load failed", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadBags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredBags = bags.filter((b) => {
    if (showActiveOnly && !b.active) return false;
    if (searchText && !b.name.toLowerCase().includes(searchText.toLowerCase()))
      return false;
    return true;
  });
  const filterCount = (showActiveOnly ? 1 : 0) + (searchText ? 1 : 0);

  function openAdd() {
    setEditingBag(null);
    setFormName("");
    setFormColor(BAG_COLORS[0]);
    setFormSizeLiters("40");
    setFormIsTopLevel(true);
    setFormActive(true);
    setNameError("");
    setSheetVisible(true);
  }

  function openEdit(bag: BagTemplate) {
    setEditingBag(bag);
    setFormName(bag.name);
    setFormColor(bag.color);
    setFormSizeLiters(String(bag.sizeLiters));
    setFormIsTopLevel(bag.isTopLevel);
    setFormActive(bag.active);
    setNameError("");
    setSheetVisible(true);
  }

  async function handleSave() {
    const name = formName.trim();
    if (!name) {
      setNameError("O nome é obrigatório.");
      return;
    }
    setNameError("");
    setIsSaving(true);
    try {
      const sizeLiters = Math.max(1, parseInt(formSizeLiters, 10) || 40);
      if (editingBag) {
        await bagRepo.updateBagTemplate(editingBag.id, {
          name,
          color: formColor,
          sizeLiters,
          isTopLevel: formIsTopLevel,
        });
        if (editingBag.active !== formActive) {
          await bagRepo.setActive(editingBag.id, formActive);
        }
        setSuccessMsg("Mala actualizada");
        setSheetVisible(false);
      } else {
        await bagRepo.createBagTemplate({
          name,
          color: formColor,
          sizeLiters,
          isTopLevel: formIsTopLevel,
          familyId: userAccount!.familyId,
        });
        setSuccessMsg("Mala criada");
        setSheetVisible(false);
      }
      setSuccessVisible(true);
      await loadBags();
    } catch (err) {
      logger.error("BagTemplatesScreen", "save failed", err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(bag: BagTemplate) {
    const count = await bagRepo.countItemsUsingBag(bag.id);
    if (count > 0) {
      Alert.alert(
        "Não é possível eliminar",
        `Esta mala está a ser utilizada por ${count} ${count === 1 ? "item" : "itens"}. Desactive-a em vez de eliminar.`,
      );
      return;
    }
    Alert.alert(
      `Eliminar "${bag.name}"?`,
      "Esta acção não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await bagRepo.deleteBagTemplate(bag.id);
            setSuccessMsg("Mala eliminada");
            setSuccessVisible(true);
            await loadBags();
          },
        },
      ],
    );
  }

  const handleReorder = useCallback(
    async ({ from, to }: ReorderableListReorderEvent) => {
      const reorderedData = reorderItems(filteredBags, from, to);
      setBags(reorderedData);
      try {
        for (let i = 0; i < reorderedData.length; i++) {
          const item = reorderedData[i];
          const newSortOrder = i + 1;
          if (item.sortOrder !== newSortOrder) {
            await bagRepo.reorderBagTemplate(item.id, newSortOrder);
          }
        }
        await loadBags();
      } catch (err) {
        logger.error("BagTemplatesScreen", "reorder failed", err);
        await loadBags();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bagRepo, filteredBags],
  );

  const renderDraggableItem = useCallback(
    ({ item: bag }: ListRenderItemInfo<BagTemplate>) => (
      <BagDraggableRow bag={bag} onOpenEdit={openEdit} />
    ),

    [],
  );

  const renderStaticItem = useCallback(
    ({ item: bag }: { item: BagTemplate }) => (
      <TouchableOpacity
        style={[s.row, !bag.active && s.rowInactive]}
        onPress={() => openEdit(bag)}
        onLongPress={() => handleDelete(bag)}
      >
        <View style={[s.colorDot, { backgroundColor: bag.color }]} />
        <View style={s.rowContent}>
          <Text style={[s.rowName, !bag.active && s.rowNameInactive]}>
            {bag.name}
          </Text>
          <Text style={s.rowMeta}>
            {bag.sizeLiters}L{!bag.isTopLevel ? " · Interna" : ""}
          </Text>
        </View>
        {!bag.active && <Text style={s.inactiveBadge}>Inactiva</Text>}
      </TouchableOpacity>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const ListHeader = useCallback(
    () => (
      <View style={s.listHeader}>
        {filteredBags.length === 0 && (
          <Text style={s.empty}>Nenhuma mala encontrada.</Text>
        )}
      </View>
    ),
    [filterCount, filteredBags.length],
  );

  if (isLoading)
    return (
      <View style={s.centered}>
        <ActivityIndicator />
      </View>
    );

  const isDragEnabled = !searchText;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={s.container}>
        <PageHeader
          title="Modelos de Malas"
          showBack
          familyBannerUri={family?.bannerUrl}
        />
        {isDragEnabled ? (
          <ReorderableList
            data={filteredBags}
            keyExtractor={(item) => item.id}
            renderItem={renderDraggableItem}
            onReorder={handleReorder}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={s.listContent}
            shouldUpdateActiveItem
          />
        ) : (
          <FlatList
            data={filteredBags}
            keyExtractor={(item) => item.id}
            renderItem={renderStaticItem}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={s.listContent}
          />
        )}

        <View style={s.fabRow}>
          <TouchableOpacity
            style={[s.fab, s.filterFab]}
            onPress={() => setFilterPanelVisible(!filterPanelVisible)}
            activeOpacity={0.8}
          >
            <Icon source="filter-variant" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={s.fab} onPress={openAdd} activeOpacity={0.8}>
            <Text style={s.fabText}>+</Text>
          </TouchableOpacity>
        </View>

        <Snackbar
          visible={successVisible}
          onDismiss={() => setSuccessVisible(false)}
          duration={2000}
          style={s.successSnackbar}
          theme={{
            colors: { inverseSurface: "#388E3C", inverseOnSurface: "#FFFFFF" },
          }}
        >
          {successMsg}
        </Snackbar>

        {/* Create/Edit sheet */}
        <Modal
          visible={sheetVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setSheetVisible(false)}
        >
          <View style={s.modalOverlay}>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={[
                s.sheetScroll,
                { paddingBottom: keyboardHeight },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              <View style={s.sheet}>
                <Text style={s.sheetTitle}>
                  {editingBag ? "Editar mala" : "Nova mala"}
                </Text>

                <Text style={s.label}>Nome *</Text>
                <TextInput
                  {...getInputProps("formName")}
                  style={[s.input, nameError ? s.inputError : null]}
                  value={formName}
                  onChangeText={(t) => {
                    setFormName(t);
                    setNameError("");
                  }}
                  placeholder="ex: Mala grande azul"
                  autoCapitalize="sentences"
                  editable={!isSaving}
                />
                {nameError ? (
                  <Text style={s.fieldError}>{nameError}</Text>
                ) : null}

                <Text style={s.label}>Cor</Text>
                <View style={s.colorRow}>
                  {BAG_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        s.colorCircle,
                        { backgroundColor: c },
                        formColor === c && s.colorCircleSelected,
                      ]}
                      onPress={() => setFormColor(c)}
                      disabled={isSaving}
                    />
                  ))}
                </View>

                <Text style={s.label}>Tamanho (litros)</Text>
                <TextInput
                  {...getInputProps("formSizeLiters")}
                  style={[s.input, { width: 100 }]}
                  value={formSizeLiters}
                  onChangeText={setFormSizeLiters}
                  keyboardType="number-pad"
                  editable={!isSaving}
                />

                <View style={s.toggleRow}>
                  <Text style={s.toggleLabel}>Mala principal</Text>
                  <Switch
                    value={formIsTopLevel}
                    onValueChange={setFormIsTopLevel}
                    trackColor={{ true: "#B5451B" }}
                    disabled={isSaving}
                  />
                </View>

                {editingBag && (
                  <View style={s.toggleRow}>
                    <Text style={s.toggleLabel}>Activa</Text>
                    <Switch
                      value={formActive}
                      onValueChange={setFormActive}
                      trackColor={{ true: "#B5451B" }}
                      disabled={isSaving}
                    />
                  </View>
                )}

                <View style={s.sheetBtns}>
                  <TouchableOpacity
                    style={s.cancelBtn}
                    onPress={() => setSheetVisible(false)}
                    disabled={isSaving}
                  >
                    <Text style={s.cancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  {editingBag && (
                    <TouchableOpacity
                      style={s.deleteBtn}
                      onPress={() => {
                        setSheetVisible(false);
                        setTimeout(() => handleDelete(editingBag), 300);
                      }}
                      disabled={isSaving}
                    >
                      <Text style={s.deleteText}>Eliminar</Text>
                    </TouchableOpacity>
                  )}
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
            </ScrollView>
          </View>
        </Modal>

        {/* Filter panel */}
        <Modal
          visible={filterPanelVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setFilterPanelVisible(false)}
        >
          <View style={s.filterOverlay}>
            <TouchableOpacity
              style={s.filterOverlayTouch}
              onPress={() => setFilterPanelVisible(false)}
              activeOpacity={1}
            />
            <View style={s.filterPanel}>
              <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={{ paddingBottom: keyboardHeight }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={s.filterPanelHeader}>
                  <Text style={s.filterPanelTitle}>Filtros</Text>
                  {filterCount > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setShowActiveOnly(false);
                        setSearchText("");
                      }}
                    >
                      <Text style={s.filterPanelClear}>Limpar</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={s.label}>Nome</Text>
                <TextInput
                  {...getInputProps("searchText")}
                  style={s.input}
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Pesquisar..."
                  autoCapitalize="none"
                />
                <Text style={s.label}>Estado</Text>
                <View style={s.filterChipRow}>
                  <TouchableOpacity
                    style={[s.filterChip, showActiveOnly && s.filterChipActive]}
                    onPress={() => setShowActiveOnly(!showActiveOnly)}
                  >
                    <Text
                      style={[
                        s.filterChipText,
                        showActiveOnly && s.filterChipTextActive,
                      ]}
                    >
                      Apenas activas
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={s.filterApplyBtn}
                  onPress={() => setFilterPanelVisible(false)}
                >
                  <Text style={s.filterApplyBtnText}>
                    Ver {filteredBags.length} malas
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  listHeader: { paddingHorizontal: 16, paddingTop: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 80 },
  fabRow: {
    position: "absolute",
    bottom: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  filterFab: {
    backgroundColor: "#6D6D6D",
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  empty: { color: "#888888", textAlign: "center", marginVertical: 32 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
  },
  rowInactive: { opacity: 0.5 },
  rowDragging: {
    elevation: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  colorDot: { width: 20, height: 20, borderRadius: 10, marginRight: 12 },
  rowContent: { flex: 1 },
  rowName: { fontSize: 16, color: "#1A1A1A" },
  rowNameInactive: { color: "#AAAAAA" },
  rowMeta: { fontSize: 12, color: "#888888", marginTop: 2 },
  inactiveBadge: {
    fontSize: 10,
    color: "#AAAAAA",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dragHandle: { fontSize: 20, color: "#CCCCCC", paddingHorizontal: 8 },
  dragHandleActive: { color: "#B5451B" },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#B5451B",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  fabText: { color: "#FFFFFF", fontSize: 28, fontWeight: "400", marginTop: -2 },
  successSnackbar: {
    position: "absolute",
    top: 48,
    backgroundColor: "#388E3C",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 20,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#555555", marginBottom: 4 },
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
  colorRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  colorCircle: { width: 36, height: 36, borderRadius: 18 },
  colorCircleSelected: { borderWidth: 3, borderColor: "#1A1A1A" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingVertical: 4,
  },
  toggleLabel: { fontSize: 15, color: "#1A1A1A" },
  sheetBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
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
  // Filter panel
  filterOverlay: { flex: 1, flexDirection: "row" },
  filterOverlayTouch: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  filterPanel: {
    width: 300,
    backgroundColor: "#FFFFFF",
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  filterPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginBottom: 16,
  },
  filterPanelTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },
  filterPanelClear: { fontSize: 14, color: "#B5451B", fontWeight: "500" },
  filterChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    backgroundColor: "#FFFFFF",
  },
  filterChipActive: { backgroundColor: "#B5451B", borderColor: "#B5451B" },
  filterChipText: { fontSize: 13, color: "#555555" },
  filterChipTextActive: { color: "#FFFFFF" },
  filterApplyBtn: {
    backgroundColor: "#B5451B",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  filterApplyBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
