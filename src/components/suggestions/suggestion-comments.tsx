import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import { useRepository } from "../../hooks/use-repository";
import { supabaseClient } from "../../repositories/supabase/supabase.client";
import { logger } from "../../utils/logger";
import type { SuggestionCommentWithProfile } from "../../types/suggestion.types";

interface SuggestionCommentsProps {
  suggestionId: string;
  currentProfileId: string;
  onInputFocus?: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}m`;
}

export function SuggestionComments({
  suggestionId,
  currentProfileId,
  onInputFocus,
}: SuggestionCommentsProps) {
  const suggestionRepo = useRepository("suggestion");

  const [comments, setComments] = useState<SuggestionCommentWithProfile[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const loadComments = useCallback(() => {
    suggestionRepo
      .getComments(suggestionId)
      .then(setComments)
      .catch((err) => {
        logger.error("SuggestionComments", "load failed", err);
      });
  }, [suggestionRepo, suggestionId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabaseClient
      .channel(`suggestion-comments-${suggestionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "suggestion_comments",
          filter: `suggestion_id=eq.${suggestionId}`,
        },
        () => {
          loadComments();
        },
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [suggestionId, loadComments]);

  async function handleAdd() {
    const trimmed = newComment.trim();
    if (!trimmed || !currentProfileId) return;

    setIsSending(true);
    try {
      await suggestionRepo.createComment(
        suggestionId,
        currentProfileId,
        trimmed,
      );
      setNewComment("");
      loadComments();
    } catch (err) {
      logger.error("SuggestionComments", "create failed", err);
    } finally {
      setIsSending(false);
    }
  }

  async function handleSaveEdit(commentId: string) {
    const trimmed = editingContent.trim();
    if (!trimmed) return;

    try {
      await suggestionRepo.updateComment(commentId, trimmed);
      setEditingId(null);
      setEditingContent("");
      loadComments();
    } catch (err) {
      logger.error("SuggestionComments", "update failed", err);
    }
  }

  function handleDelete(commentId: string) {
    Alert.alert("Eliminar comentário?", "Esta acção não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await suggestionRepo.deleteComment(commentId);
            loadComments();
          } catch (err) {
            logger.error("SuggestionComments", "delete failed", err);
          }
        },
      },
    ]);
  }

  function startEdit(comment: SuggestionCommentWithProfile) {
    setEditingId(comment.id);
    setEditingContent(comment.content);
  }

  // Only latest comment can be edited/deleted by its author
  const latestCommentId =
    comments.length > 0 ? comments[comments.length - 1].id : null;

  return (
    <View style={s.container}>
      <Text style={s.sectionTitle}>Comentários</Text>

      {comments.length === 0 && (
        <Text style={s.emptyText}>Ainda sem comentários.</Text>
      )}

      {comments.map((comment) => {
        const isOwn = comment.profileId === currentProfileId;
        const isLatest = comment.id === latestCommentId;
        const canEditOrDelete = isOwn && isLatest;

        return (
          <View key={comment.id} style={s.commentRow}>
            {comment.profileAvatarUrl ? (
              <Image
                source={{ uri: comment.profileAvatarUrl }}
                style={s.avatar}
              />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarInitial}>
                  {comment.profileName?.[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
            <View style={s.commentContent}>
              <View style={s.commentHeader}>
                <Text style={s.profileName} numberOfLines={1}>
                  {comment.profileName}
                </Text>
                <Text style={s.commentTime}>{timeAgo(comment.createdAt)}</Text>
              </View>
              {editingId === comment.id ? (
                <View>
                  <TextInput
                    style={s.editInput}
                    value={editingContent}
                    onChangeText={setEditingContent}
                    multiline
                    autoFocus
                  />
                  <View style={s.editActions}>
                    <TouchableOpacity onPress={() => setEditingId(null)}>
                      <Text style={s.editCancel}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleSaveEdit(comment.id)}
                    >
                      <Text style={s.editSave}>Guardar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={s.commentText}>{comment.content}</Text>
                  {canEditOrDelete && (
                    <View style={s.ownActions}>
                      <TouchableOpacity onPress={() => startEdit(comment)}>
                        <Text style={s.actionText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(comment.id)}
                      >
                        <Text style={s.actionTextDelete}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        );
      })}

      {/* Add comment */}
      <View style={s.addRow}>
        <TextInput
          style={s.addInput}
          value={newComment}
          onChangeText={setNewComment}
          placeholder="Escrever comentário..."
          placeholderTextColor="#CCCCCC"
          multiline
          editable={!isSending}
        />
        <TouchableOpacity
          style={[
            s.addBtn,
            (!newComment.trim() || isSending) && s.addBtnDisabled,
          ]}
          onPress={handleAdd}
          disabled={!newComment.trim() || isSending}
        >
          <Text style={s.addBtnText}>Comentar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#888888",
    marginBottom: 12,
  },
  commentRow: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
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
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  profileName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
  },
  commentTime: {
    fontSize: 11,
    color: "#AAAAAA",
  },
  commentText: {
    fontSize: 14,
    color: "#333333",
    lineHeight: 20,
  },
  ownActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  actionText: {
    fontSize: 12,
    color: "#B5451B",
    fontWeight: "600",
  },
  actionTextDelete: {
    fontSize: 12,
    color: "#D32F2F",
    fontWeight: "600",
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1A1A1A",
    marginTop: 4,
  },
  editActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 6,
    justifyContent: "flex-end",
  },
  editCancel: {
    fontSize: 13,
    color: "#888888",
    fontWeight: "600",
  },
  editSave: {
    fontSize: 13,
    color: "#B5451B",
    fontWeight: "600",
  },
  addRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
    marginTop: 4,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1A1A1A",
    maxHeight: 100,
  },
  addBtn: {
    backgroundColor: "#B5451B",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
