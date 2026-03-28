import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useRepository } from '../../hooks/use-repository';
import { useAuthStore } from '../../stores/auth.store';
import { DashboardVacationWidget } from '../../components/dashboard-vacation-widget';
import { sortVacations } from '../../utils/vacation.utils';
import type { Vacation, VacationLifecycle, BookingTask } from '../../types/vacation.types';
import type { PackingItem } from '../../types/packing.types';

interface DashboardEntry {
  vacation: Vacation;
  allTasks: BookingTask[];
  packingItems: PackingItem[];
}

export default function DashboardScreen() {
  const vacationRepository = useRepository('vacation');
  const packingItemRepository = useRepository('packingItem');
  const { userAccount } = useAuthStore();
  const [entries, setEntries] = useState<DashboardEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      void loadPinned();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function loadPinned() {
    if (!userAccount?.familyId) return;
    try {
      const all = await vacationRepository.getVacations(userAccount.familyId);
      const pinned = sortVacations(all.filter((v) => v.isPinned));

      const enriched: DashboardEntry[] = await Promise.all(
        pinned.map(async (vacation) => {
          const [allTasks, packingItems] = await Promise.all([
            vacationRepository.getBookingTasks(vacation.id),
            packingItemRepository.getPackingItems(vacation.id),
          ]);
          return { vacation, allTasks, packingItems };
        })
      );
      setEntries(enriched);
    } catch {
      // Silently fail on dashboard
    }
  }

  async function handleLifecycleChange(vacationId: string, lc: VacationLifecycle) {
    try {
      await vacationRepository.updateVacation(vacationId, { lifecycle: lc });
      await loadPinned();
    } catch {
      // Silently fail
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>FamilyHub</Text>

      {entries.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Ainda não há viagens</Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.push('/(app)/vacations')}
          >
            <Text style={styles.ctaBtnText}>Criar a primeira viagem</Text>
          </TouchableOpacity>
        </View>
      )}

      {entries.length > 0 && (
        <View style={styles.pinnedSection}>
          {entries.map((entry) => (
            <DashboardVacationWidget
              key={entry.vacation.id}
              vacation={entry.vacation}
              allTasks={entry.allTasks}
              packingItems={entry.packingItems}
              onPress={() => router.push(`/(app)/vacations/${entry.vacation.id}`)}
              onLifecycleChange={(lc) => handleLifecycleChange(entry.vacation.id, lc)}
            />
          ))}
        </View>
      )}

      <View style={styles.navSection}>
        <TouchableOpacity style={styles.link} onPress={() => router.push('/(app)/vacations')}>
          <Text style={styles.linkText}>Viagens</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.link}
          onPress={() => router.push('/(app)/settings/profiles')}
        >
          <Text style={styles.linkText}>Perfis</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.link}
          onPress={() => router.push('/(app)/settings/categories')}
        >
          <Text style={styles.linkText}>Categorias</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => router.push('/(app)/settings/tags')}>
          <Text style={styles.linkText}>Etiquetas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.link}
          onPress={() => router.push('/(app)/settings/templates')}
        >
          <Text style={styles.linkText}>Modelos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.link}
          onPress={() => router.push('/(app)/settings/tasks')}
        >
          <Text style={styles.linkText}>Tarefas</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 48 },
  heading: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 24 },
  pinnedSection: { gap: 16, marginBottom: 32 },
  emptyState: { alignItems: 'center', marginVertical: 40 },
  emptyText: { fontSize: 16, color: '#888888', marginBottom: 16 },
  ctaBtn: {
    backgroundColor: '#B5451B',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  ctaBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  navSection: { gap: 12 },
  link: {
    backgroundColor: '#B5451B',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  linkText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
