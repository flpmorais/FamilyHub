import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { useRepository } from "../../../hooks/use-repository";
import { useAuthStore } from "../../../stores/auth.store";
import { useCurrentProfile } from "../../../hooks/use-current-profile";
import { supabaseClient } from "../../../repositories/supabase/supabase.client";
import { logger } from "../../../utils/logger";
import { SuggestionFormModal } from "../../../components/suggestions/suggestion-form-modal";
import { SuggestionComments } from "../../../components/suggestions/suggestion-comments";
import type {
  Suggestion,
  SuggestionStatus,
  SuggestionStatusHistory,
} from "../../../types/suggestion.types";
import type { Profile } from "../../../types/profile.types";

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

function formatDatePt(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export default function SuggestionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const suggestionRepo = useRepository("suggestion");
  const profileRepo = useRepository("profile");
  const { userAccount } = useAuthStore();
  const currentProfile = useCurrentProfile();
  const isAdmin = currentProfile?.role === "admin";

  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [history, setHistory] = useState<SuggestionStatusHistory[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Status picker
  const [pickerVisible, setPickerVisible] = useState(false);

  // Edit modal
  const [editVisible, setEditVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!id || !userAccount?.familyId) return;
    try {
      const [sug, hist, profs] = await Promise.all([
        suggestionRepo.getSuggestionById(id),
        suggestionRepo.getStatusHistory(id),
        profileRepo.getProfilesByFamily(userAccount.familyId),
      ]);
      setSuggestion(sug);
      setHistory(hist);
      setProfiles(profs);
      if (sug) {
        const c = profs.find((p) => p.id === sug.createdBy) ?? null;
        setCreator(c);
      }
    } catch (err) {
      logger.error("SuggestionDetail", "loadData failed", err);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userAccount?.familyId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  // Real-time
  useEffect(() => {
    if (!id) return;
    const channel = supabaseClient
      .channel(`suggestion-detail-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "suggestions",
          filter: `id=eq.${id}`,
        },
        () => {
          void loadData();
        },
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [id, loadData]);

  async function handleStatusChange(newStatus: SuggestionStatus) {
    if (!suggestion || !currentProfile) return;
    setPickerVisible(false);
    try {
      await suggestionRepo.updateSuggestionStatus(
        suggestion.id,
        newStatus,
        currentProfile.id,
      );
      await loadData();
    } catch (err) {
      logger.error("SuggestionDetail", "status change failed", err);
    }
  }

  async function handleEdit(title: string, description: string) {
    if (!suggestion) return;
    await suggestionRepo.updateSuggestion(suggestion.id, {
      title,
      description,
    });
    await loadData();
  }

  function getProfileName(profileId: string): string {
    return profiles.find((p) => p.id === profileId)?.displayName ?? "";
  }

  if (isLoading) {
    return (
      <View style={st.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!suggestion) {
    return (
      <View style={st.centered}>
        <Text style={st.emptyText}>Sugestão não encontrada.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={st.backLink}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canEdit = isAdmin || suggestion.createdBy === currentProfile?.id;
  const otherStatuses = ALL_STATUSES.filter((s) => s !== suggestion.status);

  return (
    <View style={st.container}>
      {/* Header */}
      <View
        style={[
          st.header,
          { backgroundColor: STATUS_COLOR[suggestion.status] + "18" },
        ]}
      >
        <View style={st.headerTop}>
          <TouchableOpacity
            style={st.pillBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={st.pillBtnText}>← Voltar</Text>
          </TouchableOpacity>
          <View style={st.headerRight}>
            {canEdit && (
              <TouchableOpacity
                style={st.pillBtn}
                onPress={() => setEditVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={st.pillBtnText}>Editar ✎</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={st.headerBottom}>
          <Text style={st.headerTitle} numberOfLines={2}>
            {suggestion.title}
          </Text>
          <TouchableOpacity
            style={[
              st.statusBadge,
              { backgroundColor: STATUS_COLOR[suggestion.status] },
            ]}
            onPress={isAdmin ? () => setPickerVisible(true) : undefined}
            activeOpacity={isAdmin ? 0.7 : 1}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={st.statusBadgeText}>
              {STATUS_LABEL[suggestion.status]}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={st.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Creator & date */}
          <View style={st.creatorRow}>
            {creator?.avatarUrl ? (
              <Image source={{ uri: creator.avatarUrl }} style={st.avatar} />
            ) : (
              <View style={st.avatarFallback}>
                <Text style={st.avatarInitial}>
                  {creator?.displayName?.[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
            <View>
              <Text style={st.creatorName}>{creator?.displayName ?? ""}</Text>
              <Text style={st.createdDate}>
                Criado a {formatDatePt(suggestion.createdAt)}
              </Text>
            </View>
          </View>

          {/* Description */}
          {suggestion.description ? (
            <Text style={st.description}>{suggestion.description}</Text>
          ) : (
            <Text style={st.descriptionEmpty}>Sem descrição.</Text>
          )}

          {/* Comments */}
          {currentProfile && (
            <SuggestionComments
              suggestionId={suggestion.id}
              currentProfileId={currentProfile.id}
            />
          )}

          {/* Status history */}
          {history.length > 0 && (
            <View style={st.historySection}>
              <Text style={st.sectionTitle}>Histórico</Text>
              {history.map((h) => (
                <View key={h.id} style={st.historyRow}>
                  <View
                    style={[
                      st.historyDot,
                      { backgroundColor: STATUS_COLOR[h.newStatus] },
                    ]}
                  />
                  <Text style={st.historyText}>
                    {STATUS_LABEL[h.newStatus]} a {formatDatePt(h.changedAt)}
                    {getProfileName(h.changedBy)
                      ? ` por ${getProfileName(h.changedBy)}`
                      : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Status picker modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={st.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={st.pickerCard}>
            <Text style={st.pickerHeading}>Alterar estado</Text>
            <View
              style={[
                st.pickerCurrent,
                { backgroundColor: STATUS_COLOR[suggestion.status] + "18" },
              ]}
            >
              <View
                style={[
                  st.pickerDot,
                  { backgroundColor: STATUS_COLOR[suggestion.status] },
                ]}
              />
              <Text
                style={[
                  st.pickerCurrentText,
                  { color: STATUS_COLOR[suggestion.status] },
                ]}
              >
                {STATUS_LABEL[suggestion.status]}
              </Text>
            </View>
            <Text style={st.pickerHint}>Alterar para:</Text>
            <View style={st.pickerOptions}>
              {otherStatuses.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    st.pickerOption,
                    {
                      borderColor: STATUS_COLOR[s],
                      backgroundColor: STATUS_COLOR[s] + "10",
                    },
                  ]}
                  onPress={() => handleStatusChange(s)}
                >
                  <View
                    style={[st.pickerDot, { backgroundColor: STATUS_COLOR[s] }]}
                  />
                  <Text
                    style={[st.pickerOptionText, { color: STATUS_COLOR[s] }]}
                  >
                    {STATUS_LABEL[s]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit modal */}
      <SuggestionFormModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSave={handleEdit}
        initialTitle={suggestion.title}
        initialDescription={suggestion.description}
        isEditing
      />
    </View>
  );
}

const st = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  emptyText: { color: "#888888", marginBottom: 12, fontSize: 14 },
  backLink: { color: "#B5451B", fontWeight: "600" },
  // Header
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pillBtn: {
    backgroundColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  pillBtnText: {
    color: "#1A1A1A",
    fontSize: 13,
    fontWeight: "600",
  },
  headerBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
    marginRight: 12,
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
  // Content
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#B5451B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  creatorName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  createdDate: {
    fontSize: 12,
    color: "#888888",
    marginTop: 2,
  },
  description: {
    fontSize: 15,
    color: "#333333",
    lineHeight: 22,
    marginBottom: 8,
  },
  descriptionEmpty: {
    fontSize: 14,
    color: "#AAAAAA",
    fontStyle: "italic",
    marginBottom: 8,
  },
  // History
  historySection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  historyText: {
    fontSize: 14,
    color: "#555555",
  },
  // Status picker
  pickerOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  pickerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "80%",
    maxWidth: 320,
    elevation: 8,
  },
  pickerHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
    textAlign: "center",
  },
  pickerCurrent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  pickerCurrentText: { fontSize: 15, fontWeight: "700" },
  pickerDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  pickerHint: {
    fontSize: 12,
    color: "#888888",
    marginBottom: 10,
    textAlign: "center",
  },
  pickerOptions: { gap: 10 },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  pickerOptionText: { fontSize: 15, fontWeight: "600" },
});
