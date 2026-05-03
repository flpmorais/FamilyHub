import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRepository } from "../../hooks/use-repository";
import { useAuthStore } from "../../hooks/use-auth.store";
import { RECIPE_TYPE_LIST } from "../../constants/recipe-defaults";
import { DishTypeTag } from "../common/dish-type-tag";
import { logger } from "../../utils/logger";
import { useModalKeyboardScroll } from "../../hooks/use-modal-keyboard-scroll";
import type { Recipe, RecipeType } from "../../types/recipe.types";
import type {
  MealEntryDish,
  CreateDishInput,
} from "../../types/meal-plan.types";
import { getDishDisplay } from "../../types/meal-plan.types";
import type { Leftover } from "../../types/leftover.types";

type Tab = "recipe" | "manual" | "resto" | "fridge";

const TABS: { key: Tab; label: string }[] = [
  { key: "recipe", label: "Receita" },
  { key: "manual", label: "Manual" },
  { key: "resto", label: "Resto" },
  { key: "fridge", label: "Frigorífico" },
];

interface AddDishModalProps {
  visible: boolean;
  familyId: string;
  mealDate: string; // YYYY-MM-DD for the meal slot date
  onSelect: (dish: CreateDishInput) => void;
  onClose: () => void;
}

export function AddDishModal({
  visible,
  familyId,
  mealDate,
  onSelect,
  onClose,
}: AddDishModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("recipe");

  function handleClose() {
    setActiveTab("recipe");
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={s.overlay}>
        <View style={s.panel}>
          <View style={s.header}>
            <Text style={s.title}>Adicionar Prato</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={s.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.tabScroll}
            contentContainerStyle={s.tabRow}
          >
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[s.tabChip, activeTab === tab.key && s.tabChipActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[s.tabText, activeTab === tab.key && s.tabTextActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {activeTab === "recipe" && (
            <RecipeTab
              familyId={familyId}
              onSelect={onSelect}
              onClose={handleClose}
            />
          )}
          {activeTab === "manual" && (
            <ManualTab onSelect={onSelect} onClose={handleClose} />
          )}
          {activeTab === "resto" && (
            <RestoTab
              familyId={familyId}
              mealDate={mealDate}
              onSelect={onSelect}
              onClose={handleClose}
            />
          )}
          {activeTab === "fridge" && (
            <FridgeTab
              familyId={familyId}
              onSelect={onSelect}
              onClose={handleClose}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Recipe Tab ──────────────────────────────────────────────────────────────

function RecipeTab({
  familyId,
  onSelect,
  onClose,
}: {
  familyId: string;
  onSelect: (d: CreateDishInput) => void;
  onClose: () => void;
}) {
  const recipeRepo = useRepository("recipe");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeType, setActiveType] = useState<RecipeType | null>(null);
  const [search, setSearch] = useState("");

  const { keyboardHeight, scrollViewRef, getInputProps } =
    useModalKeyboardScroll({
      inputKeys: ["search"],
    });

  useEffect(() => {
    setIsLoading(true);
    recipeRepo
      .getByFamilyId(familyId)
      .then(setRecipes)
      .catch((err) => logger.error("AddDishModal:Recipe", "load failed", err))
      .finally(() => setIsLoading(false));
  }, [familyId, recipeRepo]);

  const filtered = useMemo(() => {
    let result = recipes;
    if (activeType) result = result.filter((r) => r.type === activeType);
    const term = search.trim().toLowerCase();
    if (term)
      result = result.filter((r) => r.name.toLowerCase().includes(term));
    return result;
  }, [recipes, activeType, search]);

  function handleSelect(recipe: Recipe) {
    onSelect({
      dishType: "recipe",
      recipeId: recipe.id,
      servingsOverride: recipe.servings,
    });
    setSearch("");
    setActiveType(null);
    onClose();
  }

  return (
    <View style={s.tabContent}>
      <TextInput
        {...getInputProps("search")}
        style={s.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Pesquisar receita..."
        placeholderTextColor="#CCC"
        autoCapitalize="none"
      />
      <FlatList
        horizontal
        data={[
          { key: null as RecipeType | null, label: "Todos" },
          ...RECIPE_TYPE_LIST.map((t) => ({
            key: t.key as RecipeType | null,
            label: t.label,
          })),
        ]}
        keyExtractor={(item) => item.label}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              s.filterChip,
              activeType === item.key && s.filterChipActive,
            ]}
            onPress={() => setActiveType(item.key)}
          >
            <Text
              style={[
                s.filterChipText,
                activeType === item.key && s.filterChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        style={s.filterScroll}
      />
      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyText}>Nenhuma receita encontrada.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.listRow}
              onPress={() => handleSelect(item)}
            >
              <Text style={s.listName} numberOfLines={1}>
                {item.name}
              </Text>
              <DishTypeTag typeKey={item.type} variant="filled" size="sm" />
            </TouchableOpacity>
          )}
          contentContainerStyle={s.listContent}
        />
      )}
    </View>
  );
}

// ── Manual Tab ──────────────────────────────────────────────────────────────

function ManualTab({
  onSelect,
  onClose,
}: {
  onSelect: (d: CreateDishInput) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<RecipeType>("meal");
  const [error, setError] = useState("");

  const { keyboardHeight, scrollViewRef, getInputProps } =
    useModalKeyboardScroll({
      inputKeys: ["name"],
    });

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("O nome do prato é obrigatório");
      return;
    }
    onSelect({
      dishType: "manual",
      manualName: trimmed,
      manualCategory: category,
    });
    setName("");
    setCategory("meal");
    setError("");
    onClose();
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        s.tabContent,
        { paddingBottom: keyboardHeight + 8 },
      ]}
    >
      <Text style={s.fieldLabel}>Prato *</Text>
      <TextInput
        {...getInputProps("name")}
        style={[s.input, error ? s.inputError : null]}
        value={name}
        onChangeText={(t) => {
          setName(t);
          setError("");
        }}
        placeholder="Ex: Arroz de pato"
        autoCapitalize="sentences"
      />
      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <Text style={[s.fieldLabel, { marginTop: 16 }]}>Categoria</Text>
      <View style={s.categoryRow}>
        {RECIPE_TYPE_LIST.map((t) => (
          <DishTypeTag
            key={t.key}
            typeKey={t.key}
            variant={category === t.key ? "filled" : "outlined"}
            size="md"
            onPress={() => setCategory(t.key)}
          />
        ))}
      </View>

      <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
        <Text style={s.saveBtnText}>Adicionar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Resto Tab ──────────────────────────────────────────────────────────────

function RestoTab({
  familyId,
  mealDate,
  onSelect,
  onClose,
}: {
  familyId: string;
  mealDate: string;
  onSelect: (d: CreateDishInput) => void;
  onClose: () => void;
}) {
  const mealPlanRepo = useRepository("mealPlan");
  const [dishes, setDishes] = useState<MealEntryDish[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    mealPlanRepo
      .getRecentDishes(familyId, mealDate, 5)
      .then(setDishes)
      .catch((err) => logger.error("AddDishModal:Resto", "load failed", err))
      .finally(() => setIsLoading(false));
  }, [familyId, mealDate, mealPlanRepo]);

  function handleSelect(dish: MealEntryDish) {
    onSelect({
      dishType: "resto",
      sourceDishId: dish.id,
    });
    onClose();
  }

  return (
    <View style={s.tabContent}>
      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator />
        </View>
      ) : dishes.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyText}>Sem pratos nos últimos 5 dias.</Text>
        </View>
      ) : (
        <FlatList
          data={dishes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const display = getDishDisplay(item);
            return (
              <TouchableOpacity
                style={s.listRow}
                onPress={() => handleSelect(item)}
              >
                <Text style={s.listName} numberOfLines={1}>
                  {display.name}
                </Text>
                <DishTypeTag
                  typeKey={display.category}
                  variant="filled"
                  size="sm"
                />
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={s.listContent}
        />
      )}
    </View>
  );
}

// ── Fridge Tab ──────────────────────────────────────────────────────────────

function FridgeTab({
  familyId,
  onSelect,
  onClose,
}: {
  familyId: string;
  onSelect: (d: CreateDishInput) => void;
  onClose: () => void;
}) {
  const leftoverRepo = useRepository("leftover");
  const [leftovers, setLeftovers] = useState<Leftover[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    leftoverRepo
      .getActive(familyId)
      .then((items) => {
        // Filter out expired leftovers
        const now = new Date();
        setLeftovers(items.filter((l) => new Date(l.expiryDate) > now));
      })
      .catch((err) => logger.error("AddDishModal:Fridge", "load failed", err))
      .finally(() => setIsLoading(false));
  }, [familyId, leftoverRepo]);

  function handleSelect(leftover: Leftover) {
    onSelect({
      dishType: "fridge",
      leftoverId: leftover.id,
    });
    onClose();
  }

  function daysLeft(expiryDate: string): number {
    const diff = new Date(expiryDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return (
    <View style={s.tabContent}>
      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator />
        </View>
      ) : leftovers.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyText}>Sem restos no frigorífico.</Text>
        </View>
      ) : (
        <FlatList
          data={leftovers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const days = daysLeft(item.expiryDate);
            const remaining =
              item.totalDoses - item.dosesEaten - item.dosesThrownOut;
            return (
              <TouchableOpacity
                style={s.listRow}
                onPress={() => handleSelect(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.listName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={s.listMeta}>
                    {remaining} doses · {days}d restantes
                  </Text>
                </View>
                <DishTypeTag
                  typeKey={item.type as RecipeType}
                  variant="filled"
                  size="sm"
                />
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={s.listContent}
        />
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  panel: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: "85%",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
  closeText: { fontSize: 20, color: "#888", padding: 4 },
  tabScroll: { maxHeight: 44 },
  tabRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#FFF",
  },
  tabChipActive: { backgroundColor: "#B5451B", borderColor: "#B5451B" },
  tabText: { fontSize: 13, color: "#555", fontWeight: "500" },
  tabTextActive: { color: "#FFF" },
  tabContent: { flex: 1, minHeight: 200 },
  search: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: "#1A1A1A",
  },
  filterScroll: { maxHeight: 44 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
  },
  filterChipActive: { backgroundColor: "#B5451B" },
  filterChipText: { fontSize: 12, color: "#666", fontWeight: "600" },
  filterChipTextActive: { color: "#FFF" },
  centered: { padding: 32, alignItems: "center" },
  emptyText: { color: "#888", fontSize: 14 },
  listContent: { paddingHorizontal: 16 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 8,
  },
  listName: { flex: 1, fontSize: 15, color: "#1A1A1A" },
  listMeta: { fontSize: 12, color: "#888", marginTop: 2 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  input: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  inputError: { borderColor: "#D32F2F" },
  errorText: {
    color: "#D32F2F",
    fontSize: 12,
    marginTop: 4,
    paddingHorizontal: 16,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#FFF",
  },
  categoryChipText: { fontSize: 12, color: "#555", fontWeight: "500" },
  saveBtn: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: "#B5451B",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
