import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useUiStore } from "../../stores/ui.store";

const DELAY_MS = 5 * 60 * 1000; // 5 minutes

/** Subtle offline icon — appears only after 5 minutes without connectivity. */
export function OfflineIndicator() {
  const isOffline = useUiStore((s) => s.isOffline);
  const [showIcon, setShowIcon] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOffline) {
      timerRef.current = setTimeout(() => setShowIcon(true), DELAY_MS);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      setShowIcon(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOffline]);

  if (!showIcon) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>☁</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
});
