import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useRepository } from '../../../hooks/use-repository';
import { useAuthStore } from '../../../stores/auth.store';
import { useFamily } from '../../../hooks/use-family';
import { PageHeader } from '../../../components/page-header';
import { logger } from '../../../utils/logger';
import type { Profile } from '../../../types/profile.types';
import type { MealSlot, MealPlanSlotConfig } from '../../../types/meal-plan.types';

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const SLOT_LABELS: Record<MealSlot, string> = { lunch: 'Almoço', dinner: 'Jantar' };
const MEAL_SLOTS: MealSlot[] = ['lunch', 'dinner'];

type ConfigMap = Record<string, MealPlanSlotConfig>;

function configKey(day: number, slot: MealSlot): string {
  return `${day}-${slot}`;
}

export default function MealPlanConfigScreen() {
  const mealPlanRepo = useRepository('mealPlan');
  const profileRepo = useRepository('profile');
  const { userAccount } = useAuthStore();
  const family = useFamily();

  const [configs, setConfigs] = useState<ConfigMap>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pickerSlot, setPickerSlot] = useState<{ day: number; slot: MealSlot } | null>(null);
  const [pickerParticipants, setPickerParticipants] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    if (!userAccount?.familyId) return;
    setIsLoading(true);
    try {
      const [configList, profileList] = await Promise.all([
        mealPlanRepo.getConfig(userAccount.familyId),
        profileRepo.getProfilesByFamily(userAccount.familyId),
      ]);
      const map: ConfigMap = {};
      for (const c of configList) {
        map[configKey(c.dayOfWeek, c.mealSlot)] = c;
      }
      setConfigs(map);
      setProfiles(profileList);
    } catch (err) {
      logger.error('MealPlanConfig', 'Erro ao carregar configuração', err);
    } finally {
      setIsLoading(false);
    }
  }, [mealPlanRepo, profileRepo, userAccount?.familyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function getSlotConfig(day: number, slot: MealSlot): MealPlanSlotConfig | undefined {
    return configs[configKey(day, slot)];
  }

  function getSlotProfileNames(day: number, slot: MealSlot): string {
    const config = getSlotConfig(day, slot);
    if (!config || config.isSkip) return 'Saltar';
    if (config.participants.length === 0) return 'Saltar';
    if (config.participants.length === profiles.length) return 'Todos';
    const names = config.participants
      .map((id) => profiles.find((p) => p.id === id)?.displayName ?? '?')
      .join(', ');
    return names;
  }

  function openPicker(day: number, slot: MealSlot) {
    const config = getSlotConfig(day, slot);
    if (config?.isSkip) return; // don't open picker for skipped slots
    setPickerSlot({ day, slot });
    setPickerParticipants(config?.participants ?? profiles.map((p) => p.id));
  }

  async function toggleSkip(day: number, slot: MealSlot) {
    if (!userAccount?.familyId) return;
    const config = getSlotConfig(day, slot);
    const newIsSkip = !(config?.isSkip ?? false);
    const newParticipants = newIsSkip ? [] : profiles.map((p) => p.id);
    try {
      const result = await mealPlanRepo.upsertConfig(
        userAccount.familyId,
        day,
        slot,
        newParticipants,
        newIsSkip
      );
      setConfigs((prev) => ({ ...prev, [configKey(day, slot)]: result }));
    } catch (err) {
      logger.error('MealPlanConfig', 'Erro ao alterar configuração', err);
    }
  }

  function toggleProfile(profileId: string) {
    setPickerParticipants((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    );
  }

  function toggleAllParticipants() {
    const allSelected = pickerParticipants.length === profiles.length;
    setPickerParticipants(allSelected ? [] : profiles.map((p) => p.id));
  }

  async function savePicker() {
    if (!pickerSlot || !userAccount?.familyId) return;
    try {
      const isSkip = pickerParticipants.length === 0;
      const result = await mealPlanRepo.upsertConfig(
        userAccount.familyId,
        pickerSlot.day,
        pickerSlot.slot,
        pickerParticipants,
        isSkip
      );
      setConfigs((prev) => ({
        ...prev,
        [configKey(pickerSlot.day, pickerSlot.slot)]: result,
      }));
    } catch (err) {
      logger.error('MealPlanConfig', 'Erro ao guardar configuração', err);
    }
    setPickerSlot(null);
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Configuração de Refeições" showBack familyBannerUri={family?.bannerUrl} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {MEAL_SLOTS.map((slot) => (
          <View key={slot}>
            <Text style={styles.sectionTitle}>{SLOT_LABELS[slot]}</Text>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const config = getSlotConfig(day, slot);
              const isSkip = config?.isSkip ?? false;
              return (
                <View key={`${day}-${slot}`} style={[styles.slotRow, isSkip && styles.skippedRow]}>
                  <TouchableOpacity
                    style={styles.slotRowContent}
                    onPress={() => openPicker(day, slot)}
                    disabled={isSkip}
                  >
                    <Text style={styles.dayLabel}>{DAY_LABELS[day - 1]}</Text>
                    <Text style={[styles.participantText, isSkip && styles.skippedText]} numberOfLines={1}>
                      {isSkip ? 'Saltar' : getSlotProfileNames(day, slot)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleSkip(day, slot)} style={styles.skipButton}>
                    <Icon source={isSkip ? 'close-circle' : 'check-circle'} size={20} color={isSkip ? '#BBB' : '#4CAF50'} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Profile Picker Modal */}
      <Modal visible={!!pickerSlot} animationType="slide" transparent onRequestClose={() => setPickerSlot(null)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>
              {pickerSlot ? `${DAY_LABELS[pickerSlot.day - 1]} — ${SLOT_LABELS[pickerSlot.slot]}` : ''}
            </Text>
            <Text style={styles.pickerSubtitle}>Quem come nesta refeição?</Text>

            <TouchableOpacity onPress={toggleAllParticipants} style={styles.selectAllButton}>
              <Text style={styles.selectAllText}>
                {pickerParticipants.length === profiles.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Text>
            </TouchableOpacity>

            {profiles.map((profile) => {
              const selected = pickerParticipants.includes(profile.id);
              return (
                <TouchableOpacity
                  key={profile.id}
                  style={styles.profileRow}
                  onPress={() => toggleProfile(profile.id)}
                >
                  <Icon
                    source={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={24}
                    color={selected ? '#B5451B' : '#CCC'}
                  />
                  <Text style={styles.profileName}>{profile.displayName}</Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.pickerButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setPickerSlot(null)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={savePicker}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  slotRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipButton: {
    paddingLeft: 12,
  },
  skippedRow: {
    backgroundColor: '#F5F5F5',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 40,
  },
  participantText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  skippedText: {
    color: '#BBB',
    fontStyle: 'italic',
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  pickerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  selectAllButton: {
    marginBottom: 12,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B5451B',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  profileName: {
    fontSize: 16,
    color: '#333',
  },
  pickerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 15,
    color: '#888',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#B5451B',
    minWidth: 90,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
