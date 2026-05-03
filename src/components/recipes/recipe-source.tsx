import {
  Linking,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from "react-native";

interface RecipeSourceProps {
  source: string | null;
  sourceUrl: string | null;
}

export function RecipeSource({ source, sourceUrl }: RecipeSourceProps) {
  if (!source && !sourceUrl) return null;

  const open = () => {
    if (sourceUrl) Linking.openURL(sourceUrl).catch(() => {});
  };

  // Link only: show link text, clickable.
  if (sourceUrl && !source) {
    return (
      <View style={s.container}>
        <Text style={s.label}>Fonte</Text>
        <TouchableOpacity onPress={open}>
          <Text style={s.linkText} numberOfLines={1}>
            {sourceUrl}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Source + link: show source text, clickable to link.
  if (sourceUrl && source) {
    return (
      <View style={s.container}>
        <Text style={s.label}>Fonte</Text>
        <TouchableOpacity onPress={open}>
          <Text style={s.linkText}>{source}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Source only: plain text.
  return (
    <View style={s.container}>
      <Text style={s.label}>Fonte</Text>
      <Text style={s.plainText}>{source}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "600",
    marginBottom: 2,
  },
  linkText: {
    fontSize: 14,
    color: "#1976D2",
    textDecorationLine: "underline",
  },
  plainText: {
    fontSize: 14,
    color: "#1A1A1A",
  },
});
