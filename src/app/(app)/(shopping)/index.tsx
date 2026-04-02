import { useState, useCallback } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Snackbar } from "react-native-paper";
import { useFocusEffect } from "expo-router";
import { useRepository } from "../../../hooks/use-repository";
import { useAuthStore } from "../../../stores/auth.store";
import {
  ShoppingItemCard,
  ShoppingAddForm,
  ShoppingEditForm,
} from "../../../components/shopping";
import { OTHER_CATEGORY_NAME } from "../../../constants/shopping-defaults";
import { logger } from "../../../utils/logger";
import { PageHeader } from "../../../components/page-header";
import { supabaseClient } from "../../../repositories/supabase/supabase.client";
import type { ShoppingItem, ShoppingCategory } from "../../../types/shopping.types";

interface ShoppingSection {
  title: string;
  categoryId: string;
  data: ShoppingItem[];
}

function buildSections(
  items: ShoppingItem[],
  categories: ShoppingCategory[],
): ShoppingSection[] {
  const categoryIds = new Set(categories.map((c) => c.id));
  const grouped = new Map<string, ShoppingItem[]>();
  const orphaned: ShoppingItem[] = [];

  for (const item of items) {
    if (item.categoryId && categoryIds.has(item.categoryId)) {
      const list = grouped.get(item.categoryId) ?? [];
      list.push(item);
      grouped.set(item.categoryId, list);
    } else {
      orphaned.push(item);
    }
  }

  const sortByTicked = (a: ShoppingItem, b: ShoppingItem) =>
    Number(a.isTicked) - Number(b.isTicked);

  const sections = categories
    .filter((c) => grouped.has(c.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      title: c.name,
      categoryId: c.id,
      data: (grouped.get(c.id) ?? []).sort(sortByTicked),
    }));

  // Add orphaned items (null/invalid categoryId) under "Outros"
  if (orphaned.length > 0) {
    const otherSection = sections.find((s) => s.title === OTHER_CATEGORY_NAME);
    if (otherSection) {
      otherSection.data = [...otherSection.data, ...orphaned].sort(sortByTicked);
    } else {
      sections.push({
        title: OTHER_CATEGORY_NAME,
        categoryId: "",
        data: orphaned.sort(sortByTicked),
      });
    }
  }

  return sections;
}

export default function ShoppingScreen() {
  const shoppingRepo = useRepository("shopping");
  const categoryRepo = useRepository("shoppingCategory");
  const classificationRepo = useRepository("classification");
  const { userAccount } = useAuthStore();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [familyBannerUrl, setFamilyBannerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addVisible, setAddVisible] = useState(false);
  const [editItem, setEditItem] = useState<ShoppingItem | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [successVisible, setSuccessVisible] = useState(false);
  const [snackbarColor, setSnackbarColor] = useState("#388E3C");

  const familyId = userAccount?.familyId;

  const reload = useCallback(async () => {
    if (!familyId) return;
    try {
      const [itemList, catList] = await Promise.all([
        shoppingRepo.getItems(familyId),
        categoryRepo.getAll(familyId),
      ]);
      setItems(itemList);
      setCategories(catList);
    } catch (err) {
      logger.error("ShoppingScreen", "load failed", err);
    } finally {
      setIsLoading(false);
    }
  }, [shoppingRepo, categoryRepo, familyId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
      if (familyId) {
        supabaseClient.from('families').select('banner_url').eq('id', familyId).single()
          .then(({ data }) => { if (data) setFamilyBannerUrl(data.banner_url ?? null); });
      }
    }, [reload, familyId])
  );

  function showSuccess(msg: string) {
    setSnackbarColor("#388E3C");
    setSuccessMsg(msg);
    setSuccessVisible(true);
  }

  function showError(msg: string) {
    setSnackbarColor("#D32F2F");
    setSuccessMsg(msg);
    setSuccessVisible(true);
  }

  async function handleAdd(data: { name: string; quantityNote?: string }) {
    if (!familyId) return { status: "created" as const };

    try {
      const existing = await shoppingRepo.findByName(familyId, data.name);

      if (existing && !existing.isTicked) {
        return { status: "duplicate_unticked" as const };
      }

      if (existing && existing.isTicked) {
        return { status: "duplicate_ticked" as const, itemId: existing.id };
      }

      // AI classification for new items (FR68) — only active categories
      const categoryNames = categories.filter((c) => c.active).map((c) => c.name);
      const result = await classificationRepo.classifyItem(data.name, categoryNames);
      const matchedCat = categories.find((c) => c.name === result.category);
      const categoryId = matchedCat?.id
        ?? categories.find((c) => c.name === OTHER_CATEGORY_NAME)?.id
        ?? categories[0]?.id;

      if (!categoryId) {
        showError("Sem categorias disponíveis");
        return { status: "created" as const };
      }

      await shoppingRepo.addItem({
        familyId,
        name: data.name,
        categoryId,
        quantityNote: data.quantityNote,
      });
      showSuccess("Item adicionado");
      await reload();
      return { status: "created" as const };
    } catch (err) {
      logger.error("ShoppingScreen", "add failed", err);
      showError("Erro ao adicionar item");
      return { status: "created" as const };
    }
  }

  async function handleUntick(id: string) {
    try {
      await shoppingRepo.untickItem(id);
      await reload();
    } catch (err) {
      logger.error("ShoppingScreen", "untick failed", err);
      showError("Erro ao desmarcar item");
    }
  }

  async function handleToggle(item: ShoppingItem) {
    try {
      if (item.isTicked) {
        await shoppingRepo.untickItem(item.id);
      } else {
        await shoppingRepo.tickItem(item.id);
      }
      // Optimistic: update local state immediately
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, isTicked: !i.isTicked } : i,
        ),
      );
    } catch (err) {
      logger.error("ShoppingScreen", "toggle failed", err);
      showError("Erro ao atualizar item");
      await reload();
    }
  }

  async function handleEdit(
    id: string,
    data: { name?: string; categoryId?: string; quantityNote?: string | null },
  ) {
    try {
      await shoppingRepo.editItem(id, data);
      showSuccess("Item atualizado");
      await reload();
    } catch (err) {
      logger.error("ShoppingScreen", "edit failed", err);
      showError("Erro ao editar item");
    }
  }

  async function handleDelete(id: string) {
    try {
      await shoppingRepo.deleteItem(id);
      showSuccess("Item eliminado");
      await reload();
    } catch (err) {
      logger.error("ShoppingScreen", "delete failed", err);
      showError("Erro ao eliminar item");
    }
  }

  const sections = buildSections(items, categories);

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <PageHeader title="Compras" imageUri={familyBannerUrl} familyBannerUri={familyBannerUrl} />

      <View style={{ height: 16 }} />

      {items.length === 0 ? (
        <Text style={s.empty}>Lista de compras vazia.</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <Text style={s.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <ShoppingItemCard
              item={item}
              onPress={handleToggle}
              onLongPress={setEditItem}
            />
          )}
          contentContainerStyle={s.list}
          stickySectionHeadersEnabled={false}
        />
      )}

      <TouchableOpacity
        style={s.fab}
        onPress={() => setAddVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <ShoppingAddForm
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSave={handleAdd}
        onUntick={handleUntick}
      />

      <ShoppingEditForm
        visible={editItem !== null}
        item={editItem}
        categories={categories}
        onClose={() => setEditItem(null)}
        onSave={handleEdit}
        onDelete={handleDelete}
      />

      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={2000}
        style={s.snackbar}
        theme={{
          colors: {
            inverseSurface: snackbarColor,
            inverseOnSurface: "#FFFFFF",
          },
        }}
      >
        {successMsg}
      </Snackbar>
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  empty: {
    color: "#888888",
    textAlign: "center",
    marginVertical: 32,
    fontSize: 15,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  fab: {
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
  fabText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "400",
    marginTop: -2,
  },
  snackbar: {
    position: "absolute",
    top: 48,
  },
});
