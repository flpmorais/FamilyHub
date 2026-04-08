import { View, Text, Image, TouchableOpacity, StyleSheet, ImageSourcePropType } from 'react-native';
import { router } from 'expo-router';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  imageUri?: string | null;
  familyBannerUri?: string | null;
  fallbackImage?: ImageSourcePropType;
  fallbackColor?: string;
  height?: number;
  showBack?: boolean;
  onEdit?: () => void;
}

const DEFAULT_FALLBACK: ImageSourcePropType = require('../../assets/default-vacation-cover.jpg');

export function PageHeader({
  title,
  subtitle,
  imageUri,
  familyBannerUri,
  fallbackImage,
  fallbackColor,
  height = 150,
  showBack = false,
  onEdit,
}: PageHeaderProps) {
  const hasImage = !!(imageUri || familyBannerUri || fallbackImage);
  const source = imageUri
    ? { uri: imageUri }
    : familyBannerUri
      ? { uri: familyBannerUri }
      : fallbackImage ?? (fallbackColor ? null : DEFAULT_FALLBACK);

  return (
    <View style={[s.container, { height }]}>
      {source ? (
        <Image source={source} style={[s.image, { height }]} />
      ) : (
        <View style={[s.fallbackBg, { height, backgroundColor: fallbackColor }]} />
      )}
      <View style={[s.overlay, { height }]} pointerEvents="none" />
      {(showBack || onEdit) && (
        <View style={s.topRow}>
          {showBack && (
            <TouchableOpacity style={s.pillBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={s.pillBtnText}>← Voltar</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {onEdit && (
            <TouchableOpacity style={s.pillBtn} onPress={onEdit} activeOpacity={0.7}>
              <Text style={s.pillBtnText}>Editar ✎</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <View style={s.content} pointerEvents="none">
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { position: 'relative', overflow: 'hidden' },
  image: { width: '100%', position: 'absolute' },
  fallbackBg: { width: '100%', position: 'absolute' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  topRow: { position: 'absolute', top: 56, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', zIndex: 2 },
  pillBtn: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  pillBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  content: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
});
