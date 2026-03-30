import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useStatusColours } from '../../constants/status-colours';
import type { PackingStatus } from '../../types/packing.types';

const STATUS_LABELS: Record<PackingStatus, string> = {
  new: 'Novo',
  buy: 'Comprar',
  ready: 'Pronto',
  issue: 'Problema',
  last_minute: 'Últ. hora',
  packed: 'Embalado',
};

interface StatusCountPillProps {
  status: PackingStatus;
  count: number;
  isActive: boolean;
  onPress: () => void;
}

export function StatusCountPill({ status, count, isActive, onPress }: StatusCountPillProps) {
  const colours = useStatusColours();
  const tokens = colours[status];

  return (
    <TouchableOpacity
      style={[
        styles.pill,
        isActive
          ? { backgroundColor: tokens.bg, borderColor: tokens.bg }
          : { borderColor: '#E0E0E0' },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`Filtrar por ${STATUS_LABELS[status]}, ${count} itens`}
      accessibilityRole="button"
    >
      <View style={[styles.dot, { backgroundColor: isActive ? '#FFFFFF' : tokens.bg }]} />
      <Text style={[styles.label, isActive && { color: '#FFFFFF', fontWeight: '600' }]}>
        {STATUS_LABELS[status]}
      </Text>
      <Text style={[styles.count, isActive && { color: '#FFFFFF', fontWeight: '700' }]}>
        {count}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    color: '#888888',
  },
  count: {
    fontSize: 12,
    lineHeight: 16,
    color: '#888888',
    fontWeight: '500',
  },
});
