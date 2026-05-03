import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Icon } from "react-native-paper";
import { useRepository } from "../../hooks/use-repository";
import { logger } from "../../utils/logger";
import type { RecipeRatingWithProfile } from "../../types/recipe.types";

const STAR_COLOR = "#F5A623";
const STAR_EMPTY_COLOR = "#D0D0D0";

interface RecipeRatingModalProps {
  visible: boolean;
  onClose: () => void;
  recipeId: string;
  profileId: string;
  onRatingChanged: () => void;
}

export function RecipeRatingModal({
  visible,
  onClose,
  recipeId,
  profileId,
  onRatingChanged,
}: RecipeRatingModalProps) {
  const ratingRepo = useRepository("recipeRating");

  const [selectedRating, setSelectedRating] = useState(0);
  const [originalRating, setOriginalRating] = useState(0);
  const [ratings, setRatings] = useState<RecipeRatingWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible || !recipeId) return;
    setIsLoading(true);
    ratingRepo
      .getRatingsForRecipe(recipeId)
      .then((data) => {
        setRatings(data);
        const mine = data.find((r) => r.profileId === profileId);
        setSelectedRating(mine?.rating ?? 0);
        setOriginalRating(mine?.rating ?? 0);
      })
      .catch((err) => logger.error("RecipeRatingModal", "load failed", err))
      .finally(() => setIsLoading(false));
  }, [visible, recipeId, profileId, ratingRepo]);

  function handleStarPress(star: number) {
    if (selectedRating === star) {
      setSelectedRating(0);
    } else {
      setSelectedRating(star);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      if (selectedRating === 0) {
        await ratingRepo.deleteRating(recipeId, profileId);
      } else {
        await ratingRepo.upsertRating(recipeId, profileId, selectedRating);
      }
      onRatingChanged();
      onClose();
    } catch (err) {
      logger.error("RecipeRatingModal", "save failed", err);
    } finally {
      setIsSaving(false);
    }
  }

  function renderStarPicker() {
    return (
      <View style={s.pickerRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleStarPress(star)}
            activeOpacity={0.7}
          >
            <Icon
              source={star <= selectedRating ? "star" : "star-outline"}
              size={40}
              color={star <= selectedRating ? STAR_COLOR : STAR_EMPTY_COLOR}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function renderRatingItem({ item }: { item: RecipeRatingWithProfile }) {
    return (
      <View style={s.ratingRow}>
        {item.profileAvatarUrl ? (
          <Image source={{ uri: item.profileAvatarUrl }} style={s.avatar} />
        ) : (
          <View style={s.avatarFallback}>
            <Text style={s.avatarInitial}>
              {item.profileName?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
        )}
        <Text style={s.profileName} numberOfLines={1}>
          {item.profileName}
        </Text>
        <View style={s.starsSmall}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Icon
              key={star}
              source={star <= item.rating ? "star" : "star-outline"}
              size={16}
              color={star <= item.rating ? STAR_COLOR : STAR_EMPTY_COLOR}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          <Text style={s.title}>Classificar Receita</Text>

          {renderStarPicker()}

          <View style={s.divider} />

          {isLoading ? (
            <ActivityIndicator style={{ marginVertical: 20 }} />
          ) : ratings.length > 0 ? (
            <FlatList
              data={ratings}
              keyExtractor={(item) => item.id}
              renderItem={renderRatingItem}
              style={s.list}
              scrollEnabled={ratings.length > 5}
            />
          ) : (
            <Text style={s.emptyText}>Ainda sem classificações.</Text>
          )}

          <View style={s.buttonRow}>
            <TouchableOpacity
              style={s.cancelButton}
              onPress={onClose}
              disabled={isSaving}
            >
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveButton, isSaving && s.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 16,
  },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginBottom: 12,
  },
  list: {
    maxHeight: 250,
    marginBottom: 16,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#B5451B",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  profileName: {
    flex: 1,
    fontSize: 14,
    color: "#1A1A1A",
  },
  starsSmall: {
    flexDirection: "row",
    gap: 1,
  },
  emptyText: {
    textAlign: "center",
    color: "#AAAAAA",
    fontSize: 14,
    marginVertical: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    alignItems: "center",
  },
  cancelText: { color: "#1A1A1A", fontSize: 16 },
  saveButton: {
    flex: 1,
    backgroundColor: "#B5451B",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
