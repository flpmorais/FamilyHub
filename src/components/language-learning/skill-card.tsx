import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import type { LearningSkill } from "../../types/language-learning.types";
import { SKILL_LABELS } from "../../constants/language-learning-defaults";

interface SkillCardProps {
  skill: LearningSkill;
  isActive: boolean;
  hasResume: boolean;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}

export function SkillCard({
  skill,
  isActive,
  hasResume,
  disabled,
  loading,
  onPress,
}: SkillCardProps) {
  return (
    <TouchableOpacity
      style={[s.card, isActive && s.cardActive, disabled && s.cardDisabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled || loading}
    >
      <Text style={[s.name, disabled && s.nameDisabled]}>
        {SKILL_LABELS[skill]}
      </Text>
      {loading ? (
        <ActivityIndicator size="small" color="#B5451B" style={s.badge} />
      ) : hasResume ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>Retomar</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    elevation: 1,
    minHeight: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  cardActive: {
    borderColor: "#B5451B",
    borderWidth: 2,
  },
  cardDisabled: {
    backgroundColor: "#FAFAFA",
    opacity: 0.5,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "center",
  },
  nameDisabled: {
    color: "#888888",
  },
  badge: {
    marginTop: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B5451B",
  },
});
