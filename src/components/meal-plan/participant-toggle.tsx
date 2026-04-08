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
    <View style={s.container}>
      {profiles
        .filter((p) => p.status !== 'inactive')
        .map((p) => {
          const selected = selectedIds.includes(p.id);
          return (
            <TouchableOpacity
              key={p.id}
              style={[s.chip, selected && s.chipSelected]}
              onPress={() => onToggle(p.id)}
              disabled={disabled}
            >
              <Text style={[s.chipText, selected && s.chipTextSelected]}>
                {p.displayName}
              </Text>
            </TouchableOpacity>
          );
        })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  chipSelected: {
    backgroundColor: '#B5451B',
    borderColor: '#B5451B',
  },
  chipText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFF',
  },
});
