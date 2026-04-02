import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Profile } from '../../types/profile.types';

interface ParticipantToggleProps {
  profiles: Profile[];
  selectedIds: string[];
  onToggle: (profileId: string) => void;
  disabled?: boolean;
}

export function ParticipantToggle({ profiles, selectedIds, onToggle, disabled }: ParticipantToggleProps) {
  return (
    <View style={styles.list}>
      {profiles
        .filter((p) => p.status !== 'inactive')
        .map((p) => {
          const selected = selectedIds.includes(p.id);
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => onToggle(p.id)}
              disabled={disabled}
            >
              <Text style={styles.check}>{selected ? '\u2611' : '\u2610'}</Text>
              <Text style={styles.name}>{p.displayName}</Text>
            </TouchableOpacity>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  rowSelected: { borderColor: '#B5451B', backgroundColor: '#FFF0EB' },
  check: { fontSize: 18, marginRight: 10, color: '#B5451B' },
  name: { fontSize: 15, color: '#1A1A1A' },
});
