import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Icon } from "react-native-paper";
import { router, useFocusEffect } from "expo-router";
import { useRepository } from "../../../hooks/use-repository";
import { useAuthStore } from "../../../stores/auth.store";
import { useCurrentProfile } from "../../../hooks/use-current-profile";
import { useFamily } from "../../../hooks/use-family";
import { supabaseClient } from "../../../repositories/supabase/supabase.client";
import { logger } from "../../../utils/logger";
import { useModalKeyboardScroll } from "../../../hooks/use-modal-keyboard-scroll";
import { PageHeader } from "../../../components/page-header";
import { SuggestionFormModal } from "../../../components/suggestions/suggestion-form-modal";
import { PAGE_SIZE } from "../../../constants/pagination";
import type {
  SuggestionStatus,
  SuggestionWithMeta,
} from "../../../types/suggestion.types";

const STATUS_LABEL: Record<SuggestionStatus, string> = {
  new: "Novo",
  rejected: "Rejeitado",
  accepted: "Aceite",
  planned: "Planeado",
  implemented: "Implementado",
};

const STATUS_COLOR: Record<SuggestionStatus, string> = {
  new: "#2196F3",
  rejected: "#D32F2F",
  accepted: "#388E3C",
  planned: "#FF9800",
  implemented: "#7B1FA2",
};

const ALL_STATUSES: SuggestionStatus[] = [
  "new",
  "accepted",
  "planned",
  "implemented",
  "rejected",
];

export default function SuggestionsScreen() {
  const family = useFamily();
  const suggestionRepo = useRepository("suggestion");
  const { userAccount } = useAuthStore();
  const currentProfile = useCurrentProfile();

  const [suggestions, setSuggestions] = useState<SuggestionWithMeta[]>([]);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);

  // Filters
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<SuggestionStatus | null>(
    null,
  );

  // Form modal
  const [formVisible, setFormVisible] = useState(false);

  const buildRepoFilters = useCallback(
    () => ({ search: filterSearch, status: filterStatus }),
    [filterSearch, filterStatus],
  );

  const reloadFromStart = useCallback(
    async (showSpinner = false) => {
      if (!userAccount?.familyId) return;
      if (showSpinner) setIsLoading(true);
      try {
        const firstPage = await suggestionRepo.getSuggestionsPaginated(
          userAccount.familyId,
          PAGE_SIZE,
          0,
          buildRepoFilters(),
        );
        setSuggestions(firstPage);
        setCursor(PAGE_SIZE);
        setHasMore(firstPage.length === PAGE_SIZE);
      } catch (err) {
        logger.error("SuggestionsScreen", "loadData failed", err);
        setError(
          err instanceof Error ? err.message : "Erro ao carregar sugestões.",
        );
      } finally {
        if (showSpinner) setIsLoading(false);
      }
    },
    [suggestionRepo, userAccount?.familyId, buildRepoFilters],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current || !userAccount?.familyId) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const nextPage = await suggestionRepo.getSuggestionsPaginated(
        userAccount.familyId,
        PAGE_SIZE,
        cursor,
        buildRepoFilters(),
      );
      setSuggestions((prev) => [...prev, ...nextPage]);
      setCursor(cursor + PAGE_SIZE);
      setHasMore(nextPage.length === PAGE_SIZE);
    } catch (err) {
      logger.error("SuggestionsScreen", "loadMore failed", err);
    } finally {
      setIsLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [suggestionRepo, userAccount?.familyId, cursor, hasMore, buildRepoFilters]);

  useFocusEffect(
    useCallback(() => {
      void reloadFromStart(true);
    }, [reloadFromStart]),
  );

  const { keyboardHeight, scrollViewRef, getInputProps } = useModalKeyboardScroll({
    inputKeys: ['filterSearch'],
  });

  // Reload when filters change
  useEffect(() => {
    if (!userAccount?.familyId) return;
    void reloadFromStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSearch, filterStatus, userAccount?.familyId]);

  // Real-time
  useFocusEffect(
    useCallback(() => {
      if (!userAccount?.familyId) return;
      const channel = supabaseClient
        .channel("suggestions-list")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "suggestions",
            filter: `family_id=eq.${userAccount.familyId}`,
          },
          () => {
            void reloadFromStart();
          },
        )
        .subscribe();

      return () => {
        supabaseClient.removeChannel(channel);
      };
    }, [userAccount?.familyId, reloadFromStart]),
  );

  // Filters
  const filterCount = (filterSearch ? 1 : 0) + (filterStatus ? 1 : 0);

  function clearFilters() {
    setFilterSearch("");
    setFilterStatus(null);
  }

  async function handleCreate(title: string, description: string) {
    if (!userAccount?.familyId || !currentProfile) return;
    await suggestionRepo.createSuggestion({
      familyId: userAccount.familyId,
      title,
      description,
      createdBy: currentProfile.id,
    });
    await reloadFromStart();
  }

  if (isLoading) {
    return (
      <View style={st.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={st.container}>
      <PageHeader title="Sugestões" familyBannerUri={family?.bannerUrl} />
      {error ? <Text style={st.error}>{error}</Text> : null}

      {suggestions.length === 0 ? (
        <View style={st.emptyContainer}>
          {filterCount > 0 ? (
            <>
              <Text style={st.emptyFilterText}>
                Nenhuma sugestão corresponde aos filtros activos
              </Text>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={st.clearLink}>Limpar filtros</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={st.empty}>Nenhuma sugestão encontrada.</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(s) => s.id}
          renderItem={({ item: s }) => (
            <TouchableOpacity
              style={st.card}
              onPress={() => router.push(`/(app)/(suggestions)/${s.id}`)}
              activeOpacity={0.7}
            >
              <View style={st.cardTop}>
                {s.creatorAvatarUrl ? (
                  <Image source={{ uri: s.creatorAvatarUrl }} style={st.avatar} />
                ) : (
                  <View style={st.avatarFallback}>
                    <Text style={st.avatarInitial}>
                      {s.creatorName?.[0]?.toUpperCase() ?? "?"}
                    </Text>
                  </View>
                )}
                <View style={st.cardInfo}>
                  <Text style={st.cardTitle} numberOfLines={1}>
                    {s.title}
                  </Text>
                  <Text style={st.cardMeta}>{s.creatorName}</Text>
                </View>
                <View style={[st.statusBadge, { backgroundColor: STATUS_COLOR[s.status] }]}>
                  <Text style={st.statusBadgeText}>{STATUS_LABEL[s.status]}</Text>
                </View>
              </View>
              {s.commentCount > 0 && (
                <View style={st.commentCountRow}>
                  <Icon source="comment-outline" size={14} color="#888888" />
                  <Text style={st.commentCountText}>{s.commentCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={st.content}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator style={st.loadingMore} /> : null}
        />
      )}

      {/* FAB row */}
      <View style={st.fabRow}>
        <TouchableOpacity
          style={[st.fab, st.filterFab]}
          onPress={() => setFilterPanelVisible(!filterPanelVisible)}
          activeOpacity={0.8}
        >
          <Icon source="filter-variant" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={st.fab}
          onPress={() => setFormVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={st.fabText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      <Modal
        visible={filterPanelVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterPanelVisible(false)}
      >
        <View style={st.filterOverlay}>
          <TouchableOpacity
            style={st.filterOverlayTouch}
            onPress={() => setFilterPanelVisible(false)}
            activeOpacity={1}
          />
          <View style={st.filterPanel}>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={{ paddingBottom: keyboardHeight }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={st.filterPanelHeader}>
                <Text style={st.filterPanelTitle}>Filtros</Text>
                {filterCount > 0 && (
                  <TouchableOpacity onPress={clearFilters}>
                    <Text style={st.filterPanelClear}>Limpar</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={st.label}>Nome</Text>
              <TextInput
                {...getInputProps('filterSearch')}
                style={st.input}
                value={filterSearch}
                onChangeText={setFilterSearch}
                placeholder="Pesquisar..."
                autoCapitalize="none"
              />

              <Text style={st.label}>Estado</Text>
              <View style={st.filterChipRow}>
                <TouchableOpacity
                  style={[st.chip, filterStatus === null && st.chipActive]}
                  onPress={() => setFilterStatus(null)}
                >
                  <Text
                    style={[
                      st.chipText,
                      filterStatus === null && st.chipTextActive,
                    ]}
                  >
                    Todos
                  </Text>
                </TouchableOpacity>
                {ALL_STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[st.chip, filterStatus === status && st.chipActive]}
                    onPress={() =>
                      setFilterStatus(filterStatus === status ? null : status)
                    }
                  >
                    <View
                      style={[
                        st.chipDot,
                        { backgroundColor: STATUS_COLOR[status] },
                      ]}
                    />
                    <Text
                      style={[
                        st.chipText,
                        filterStatus === status && st.chipTextActive,
                      ]}
                    >
                      {STATUS_LABEL[status]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={st.filterApplyBtn}
                onPress={() => setFilterPanelVisible(false)}
              >
                <Text style={st.filterApplyBtnText}>Ver sugestões</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add suggestion modal */}
      <SuggestionFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSave={handleCreate}
      />
    </View>
  );
}

const st = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },
  error: { color: "#D32F2F", marginBottom: 12, fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  loadingMore: { marginVertical: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FFFFFF",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#B5451B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  cardInfo: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  cardMeta: {
    fontSize: 12,
    color: "#888888",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  commentCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingLeft: 46,
  },
  commentCountText: {
    fontSize: 12,
    color: "#888888",
  },
  empty: { color: "#888888", textAlign: "center", marginVertical: 16 },
  emptyFilter: { alignItems: "center", marginVertical: 32 },
  emptyFilterText: { color: "#888888", textAlign: "center", marginBottom: 8 },
  clearLink: { color: "#B5451B", fontWeight: "500" },
  // FABs
  fabRow: {
    position: "absolute",
    bottom: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#B5451B",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  filterFab: {
    backgroundColor: "#6D6D6D",
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  fabText: { color: "#FFFFFF", fontSize: 28, fontWeight: "400", marginTop: -2 },
  // Filter panel
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555555",
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    backgroundColor: "#FFFFFF",
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#B5451B", borderColor: "#B5451B" },
  chipText: { fontSize: 13, color: "#555555" },
  chipTextActive: { color: "#FFFFFF" },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
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
  filterApplyBtn: {
    backgroundColor: "#B5451B",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  filterApplyBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
