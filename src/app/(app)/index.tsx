import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useRepository } from '../../hooks/use-repository';
import { useAuthStore } from '../../stores/auth.store';
import { VacationHeroCard } from '../../components/vacation-hero-card';
import { sortVacations } from '../../utils/vacation.utils';
import type { Vacation, VacationLifecycle } from '../../types/vacation.types';

export default function DashboardScreen() {
  const vacationRepository = useRepository('vacation');
  const { userAccount } = useAuthStore();
  const [pinnedVacations, setPinnedVacations] = useState<Vacation[]>([]);

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
      setPinnedVacations(sortVacations(all.filter((v) => v.isPinned)));
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

      {pinnedVacations.length > 0 && (
        <View style={styles.pinnedSection}>
          {pinnedVacations.map((v) => (
            <VacationHeroCard
              key={v.id}
              vacation={v}
              onPress={() => router.push(`/(app)/vacations/${v.id}`)}
              onLifecycleChange={(lc) => handleLifecycleChange(v.id, lc)}
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 48 },
  heading: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 24 },
  pinnedSection: { gap: 16, marginBottom: 32 },
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
