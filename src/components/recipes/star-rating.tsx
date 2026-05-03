import { View, Text, StyleSheet } from "react-native";
import { Icon } from "react-native-paper";

interface StarRatingProps {
  rating: number | null;
  count?: number;
  size?: number;
  showLabel?: boolean;
}

const STAR_COLOR = "#F5A623";

export function StarRating({
  rating,
  count,
  size = 16,
  showLabel = true,
}: StarRatingProps) {
  if (rating == null) {
    if (!showLabel) return null;
    return <Text style={s.noRating}>Sem classificação</Text>;
  }

  const stars: ("star" | "star-half-full" | "star-outline")[] = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push("star");
    } else if (rating >= i - 0.75) {
      stars.push("star-half-full");
    } else {
      stars.push("star-outline");
    }
  }

  return (
    <View style={s.row}>
      {stars.map((icon, i) => (
        <Icon key={i} source={icon} size={size} color={STAR_COLOR} />
      ))}
      {count != null && count > 0 && (
        <Text style={[s.countText, { fontSize: size * 0.7 }]}>
          ({count} {count === 1 ? "voto" : "votos"})
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  countText: {
    color: "#888888",
    marginLeft: 4,
  },
  noRating: {
    fontSize: 12,
    color: "#AAAAAA",
    fontStyle: "italic",
  },
});
