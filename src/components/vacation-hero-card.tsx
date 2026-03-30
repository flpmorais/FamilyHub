import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, StyleSheet, ImageSourcePropType } from 'react-native';
import { router } from 'expo-router';
import { countryFlag, countryIso2 } from '../utils/countries';
import {
  LIFECYCLE_LABEL,
  LIFECYCLE_COLOR,
  LIFECYCLE_ORDER,
  formatDatePt,
} from '../utils/vacation.utils';
import { OfflineIndicator } from './common/offline-indicator';
import type { Vacation, VacationLifecycle } from '../types/vacation.types';

const DEFAULT_COVER: ImageSourcePropType = require('../../assets/default-vacation-cover.jpg');

interface VacationHeroCardProps {
  vacation: Vacation;
  onPress?: () => void;
  onLifecycleChange: (lifecycle: VacationLifecycle) => void;
  showBackButton?: boolean;
  height?: number;
}

export function VacationHeroCard({
  vacation,
  onPress,
  onLifecycleChange,
  showBackButton = false,
  height = 120,
}: VacationHeroCardProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const flag = countryFlag(countryIso2(vacation.countryCode));
  const otherLifecycles = LIFECYCLE_ORDER.filter((l) => l !== vacation.lifecycle);

  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress
    ? { onPress, activeOpacity: 0.85, style: [styles.card, { height }] }
    : { style: [styles.card, { height }] };

  return (
    <>
      <Wrapper {...(wrapperProps as any)}>
        <Image
          source={vacation.coverImageUrl ? { uri: vacation.coverImageUrl } : DEFAULT_COVER}
          style={[styles.coverImage, { height }]}
        />
        <View style={[styles.overlay, { height }]} />

        {/* Top row */}
        <View style={[styles.topRow, showBackButton && styles.topRowSafe]}>
          {showBackButton && (
            <TouchableOpacity style={styles.pillBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={styles.pillBtnText}>← Voltar</Text>
            </TouchableOpacity>
          )}
          <View style={styles.topRight}>
            {showBackButton && <OfflineIndicator />}
            <TouchableOpacity
              style={styles.pillBtn}
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/(app)/(vacations)/${vacation.id}/edit`);
              }}
            >
              <Text style={styles.pillBtnText}>Editar ✎</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom content */}
        <View style={styles.bottom}>
          <View style={styles.bottomLeft}>
            <View style={styles.titleRow}>
              <Text style={styles.flag}>{flag}</Text>
              <Text style={styles.title} numberOfLines={1}>
                {vacation.title}
              </Text>
            </View>
            <Text style={styles.dates}>
              {formatDatePt(vacation.departureDate)} — {formatDatePt(vacation.returnDate)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.lcBadge, { backgroundColor: LIFECYCLE_COLOR[vacation.lifecycle] }]}
            onPress={(e) => {
              e.stopPropagation();
              setPickerVisible(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.lcBadgeText}>{LIFECYCLE_LABEL[vacation.lifecycle]}</Text>
          </TouchableOpacity>
        </View>
      </Wrapper>

      {/* Lifecycle picker modal */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={styles.pickerCard}>
            <Text style={styles.pickerHeading}>Alterar estado</Text>
            <View
              style={[
                styles.pickerCurrent,
                { backgroundColor: LIFECYCLE_COLOR[vacation.lifecycle] + '18' },
              ]}
            >
              <View
                style={[styles.pickerDot, { backgroundColor: LIFECYCLE_COLOR[vacation.lifecycle] }]}
              />
              <Text
                style={[styles.pickerCurrentText, { color: LIFECYCLE_COLOR[vacation.lifecycle] }]}
              >
                {LIFECYCLE_LABEL[vacation.lifecycle]}
              </Text>
            </View>
            <Text style={styles.pickerHint}>Alterar para:</Text>
            <View style={styles.pickerOptions}>
              {otherLifecycles.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[
                    styles.pickerOption,
                    {
                      borderColor: LIFECYCLE_COLOR[l],
                      backgroundColor: LIFECYCLE_COLOR[l] + '10',
                    },
                  ]}
                  onPress={() => {
                    setPickerVisible(false);
                    onLifecycleChange(l);
                  }}
                >
                  <View style={[styles.pickerDot, { backgroundColor: LIFECYCLE_COLOR[l] }]} />
                  <Text style={[styles.pickerOptionText, { color: LIFECYCLE_COLOR[l] }]}>
                    {LIFECYCLE_LABEL[l]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topRow: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  topRowSafe: {
    top: 44,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  circleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  pillBtn: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  pillBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bottomLeft: { flex: 1, marginRight: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  flag: { fontSize: 18, marginRight: 6 },
  title: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  dates: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  lcBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  lcBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  // Lifecycle picker
  pickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    elevation: 8,
  },
  pickerHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerCurrent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  pickerCurrentText: { fontSize: 15, fontWeight: '700' },
  pickerDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  pickerHint: { fontSize: 12, color: '#888888', marginBottom: 10, textAlign: 'center' },
  pickerOptions: { gap: 10 },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  pickerOptionText: { fontSize: 15, fontWeight: '600' },
});
