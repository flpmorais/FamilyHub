import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useStatusColours } from '../../constants/status-colours';
import { StatusBadge } from './status-badge';
import type { PackingItem } from '../../types/packing.types';

const STATUS_LABELS: Record<string, string> = {
  new: 'Novo',
  buy: 'Comprar',
  ready: 'Pronto',
  issue: 'Problema',
  last_minute: 'Última hora',
  packed: 'Embalado',
};

interface PackingItemCardProps {
  item: PackingItem;
  profileName: string;
  categoryName: string;
  categoryIcon: string;
  onPress: () => void;
  onLongPress: () => void;
  onStatusPress: () => void;
}

export function PackingItemCard({
  item,
  profileName,
  categoryName,
  categoryIcon,
  onPress,
  onLongPress,
  onStatusPress,
}: PackingItemCardProps) {
  const colours = useStatusColours();
  const isPacked = item.status === 'packed';

  const metaParts = [profileName, item.quantity > 1 ? `×${item.quantity}` : ''].filter(Boolean);
  const metaText = metaParts.join(' · ');
  const hasMeta = categoryName || metaText;

  const a11yLabel = [item.name, STATUS_LABELS[item.status], categoryName, profileName]
    .filter(Boolean)
    .join(', ');

  return (
    <TouchableOpacity
      style={[s.card, isPacked && s.cardPacked]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessible
      accessibilityLabel={a11yLabel}
      accessibilityRole="button"
    >
      <View style={[s.strip, { backgroundColor: colours[item.status].bg }]} />
      <View style={s.content}>
        <Text style={[s.name, isPacked && s.namePacked]} numberOfLines={1}>
          {item.name}
        </Text>
        {hasMeta ? (
          <View style={s.metaRow}>
            {categoryIcon ? <Icon source={categoryIcon} size={14} color="#888888" /> : null}
            <Text style={s.meta}>{[categoryName, metaText].filter(Boolean).join(' · ')}</Text>
          </View>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          onStatusPress();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <StatusBadge status={item.status} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  cardPacked: {
    opacity: 0.6,
  },
  strip: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1A1A1A',
  },
  namePacked: {
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  meta: {
    fontSize: 14,
    fontWeight: '400',
    color: '#888888',
  },
});
