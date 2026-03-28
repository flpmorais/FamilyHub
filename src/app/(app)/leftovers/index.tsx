import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Snackbar } from "react-native-paper";
import { router } from "expo-router";
import { useRepository } from "../../../hooks/use-repository";
import { useAuthStore } from "../../../stores/auth.store";
import { useLeftoversStore } from "../../../stores/leftovers.store";
import {
  LeftoverItemCard,
  LeftoverAddForm,
  LeftoverEditForm,
} from "../../../components/leftovers";
import { PAGINATION_PAGE_SIZE } from "../../../constants/leftover-defaults";
import { logger } from "../../../utils/logger";
import type { Leftover } from "../../../types/leftover.types";

export default function LeftoversScreen() {
  const leftoverRepo = useRepository("leftover");
  const { userAccount } = useAuthStore();
  const { paginationCursor, setPaginationCursor } = useLeftoversStore();

  const [leftovers, setLeftovers] = useState<Leftover[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [addVisible, setAddVisible] = useState(false);
  const [editItem, setEditItem] = useState<Leftover | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [successVisible, setSuccessVisible] = useState(false);
  const loadingMoreRef = useRef(false);

  const familyId = userAccount?.familyId;

  const reloadFromStart = useCallback(async () => {
    if (!familyId) return;
    try {
      const list = await leftoverRepo.getAll(familyId, PAGINATION_PAGE_SIZE, 0);
      setLeftovers(list);
      setPaginationCursor(PAGINATION_PAGE_SIZE);
      setHasMore(list.length === PAGINATION_PAGE_SIZE);
    } catch (err) {
      logger.error("LeftoversScreen", "load failed", err);
    } finally {
      setIsLoading(false);
    }
  }, [leftoverRepo, familyId, setPaginationCursor]);

  useEffect(() => {
    void reloadFromStart();
  }, [reloadFromStart]);

  async function loadMore() {
    if (!hasMore || loadingMoreRef.current || !familyId) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const nextPage = await leftoverRepo.getAll(
        familyId,
        PAGINATION_PAGE_SIZE,
        paginationCursor,
      );
      setLeftovers((prev) => [...prev, ...nextPage]);
      setPaginationCursor(paginationCursor + PAGINATION_PAGE_SIZE);
      setHasMore(nextPage.length === PAGINATION_PAGE_SIZE);
    } catch (err) {
      logger.error("LeftoversScreen", "loadMore failed", err);
    } finally {
      setIsLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }

  const [snackbarColor, setSnackbarColor] = useState("#388E3C");

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

  async function handleAdd(data: {
    name: string;
    totalDoses: number;
    expiryDays: number;
  }) {
    if (!familyId) return;
    try {
      await leftoverRepo.create({
        familyId,
        name: data.name,
        totalDoses: data.totalDoses,
        expiryDays: data.expiryDays,
      });
      showSuccess("Resto adicionado");
      await reloadFromStart();
    } catch (err) {
      logger.error("LeftoversScreen", "add failed", err);
      showError("Erro ao adicionar resto");
    }
  }

  async function handleEaten(id: string) {
    try {
      await leftoverRepo.incrementEaten(id);
      await reloadFromStart();
    } catch (err) {
      logger.error("LeftoversScreen", "eaten failed", err);
      showError("Erro ao registar dose");
    }
  }

  async function handleThrowOut(id: string) {
    try {
      await leftoverRepo.throwOutRemaining(id);
      showSuccess("Resto descartado");
      await reloadFromStart();
    } catch (err) {
      logger.error("LeftoversScreen", "throwOut failed", err);
      showError("Erro ao descartar resto");
    }
  }

  async function handleEdit(
    id: string,
    data: {
      name?: string;
      totalDoses?: number;
      expiryDate?: string;
      dosesEaten?: number;
      dosesThrownOut?: number;
    },
  ) {
    try {
      await leftoverRepo.update(id, data);
      showSuccess("Resto actualizado");
      await reloadFromStart();
    } catch (err) {
      logger.error("LeftoversScreen", "edit failed", err);
      showError("Erro ao actualizar resto");
    }
  }

  async function handleDelete(id: string) {
    try {
      await leftoverRepo.delete(id);
      showSuccess("Resto eliminado");
      await reloadFromStart();
    } catch (err) {
      logger.error("LeftoversScreen", "delete failed", err);
      showError("Erro ao eliminar resto");
    }
  }

  const firstClosedIndex = leftovers.findIndex((l) => l.status === "closed");
  const hasActiveAndClosed =
    firstClosedIndex > 0 && firstClosedIndex < leftovers.length;

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>← Voltar</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.heading}>Restos</Text>

      {leftovers.length === 0 ? (
        <Text style={s.empty}>Sem restos no frigorífico.</Text>
      ) : (
        <FlatList
          data={leftovers}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <>
              {hasActiveAndClosed && index === firstClosedIndex && (
                <Text style={s.sectionHeader}>Fechados</Text>
              )}
              <LeftoverItemCard
                item={item}
                onEaten={handleEaten}
                onThrowOut={handleThrowOut}
                onPress={setEditItem}
              />
            </>
          )}
          contentContainerStyle={s.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? <ActivityIndicator style={s.loadingMore} /> : null
          }
        />
      )}

      <TouchableOpacity
        style={s.fab}
        onPress={() => setAddVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <LeftoverAddForm
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSave={handleAdd}
      />

      <LeftoverEditForm
        visible={editItem !== null}
        item={editItem}
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
  headerRow: { paddingHorizontal: 24, paddingTop: 16 },
  backText: { color: "#B5451B", fontSize: 16 },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
  },
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
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  loadingMore: {
    paddingVertical: 16,
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
