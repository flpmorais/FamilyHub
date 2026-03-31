import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Icon, Snackbar } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useRepository } from '../../../hooks/use-repository';
import { useAuthStore } from '../../../stores/auth.store';
import { logger } from '../../../utils/logger';
import { sortVacations } from '../../../utils/vacation.utils';
import { VacationHeroCard } from '../../../components/vacation-hero-card';
import { PageHeader } from '../../../components/page-header';
import { useFamily } from '../../../hooks/use-family';
import { supabaseClient } from '../../../repositories/supabase/supabase.client';
import type { Vacation, VacationLifecycle } from '../../../types/vacation.types';
import type { Profile } from '../../../types/profile.types';
import type { Tag } from '../../../types/packing.types';

export default function VacationsScreen() {
  const family = useFamily();
  const vacationRepository = useRepository('vacation');
  const profileRepository = useRepository('profile');
  const tagRepository = useRepository('tag');
  const { userAccount } = useAuthStore();

  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  // Vacation-level lookup maps for filtering
  const [vacTagMap, setVacTagMap] = useState<Record<string, string[]>>({});
  const [vacParticipantMap, setVacParticipantMap] = useState<Record<string, string[]>>({});

  // Filters
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterProfile, setFilterProfile] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const loadData = useCallback(async (showSpinner = false) => {
    if (!userAccount?.familyId) return;
    if (showSpinner) setIsLoading(true);
    try {
      const [vacList, profList, tagList] = await Promise.all([
        vacationRepository.getVacations(userAccount.familyId),
        profileRepository.getProfilesByFamily(userAccount.familyId),
        tagRepository.getTags(userAccount.familyId),
      ]);
      const sorted = sortVacations(vacList);
      setVacations(sorted);
      setProfiles(profList);
      setTags(tagList.filter((t) => t.active));

      // Batch-load vacation tags and participants for filtering
      const { data: tagRows } = await supabaseClient.from('vacation_tags').select('vacation_id, tag_id');
      const { data: partRows } = await supabaseClient.from('vacation_participants').select('vacation_id, profile_id');

      const tMap: Record<string, string[]> = {};
      for (const r of (tagRows ?? []) as any[]) {
        (tMap[r.vacation_id] ??= []).push(r.tag_id);
      }
      setVacTagMap(tMap);

      const pMap: Record<string, string[]> = {};
      for (const r of (partRows ?? []) as any[]) {
        (pMap[r.vacation_id] ??= []).push(r.profile_id);
      }
      setVacParticipantMap(pMap);
    } catch (err) {
      logger.error('VacationsScreen', 'loadData failed', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar viagens.');
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAccount?.familyId]);

  useFocusEffect(
    useCallback(() => {
      void loadData(true);
    }, [loadData])
  );

  async function handleLifecycleChange(vacationId: string, lc: VacationLifecycle) {
    try {
      const updates: Partial<Vacation> = { lifecycle: lc };
      if (lc === 'cancelled' || lc === 'completed') updates.isPinned = false;
      await vacationRepository.updateVacation(vacationId, updates);
      await loadData();
    } catch (err) {
      logger.error('VacationsScreen', 'lifecycle change failed', err);
    }
  }

  // Filter logic
  const filterCount = (filterSearch ? 1 : 0) + (filterProfile ? 1 : 0) + (filterTag ? 1 : 0);

  const filteredVacations = useMemo(() => {
    if (filterCount === 0) return vacations;
    return vacations.filter((v) => {
      if (filterSearch && !v.title.toLowerCase().includes(filterSearch.toLowerCase())) return false;
      if (filterTag && !vacTagMap[v.id]?.includes(filterTag)) return false;
      if (filterProfile && !vacParticipantMap[v.id]?.includes(filterProfile)) return false;
      return true;
    });
  }, [vacations, filterSearch, filterTag, filterProfile, vacTagMap, vacParticipantMap, filterCount]);

  function clearFilters() {
    setFilterSearch('');
    setFilterProfile(null);
    setFilterTag(null);
  }

  if (isLoading) {
    return (
      <View style={st.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={st.container}>
      <PageHeader title="Viagens" familyBannerUri={family?.bannerUrl} />
      <ScrollView contentContainerStyle={st.content}>
        {error ? <Text style={st.error}>{error}</Text> : null}

        <View style={st.cardList}>
          {filteredVacations.map((v) => (
            <View key={v.id} style={{ borderRadius: 12, overflow: 'hidden' }}>
              <VacationHeroCard
                vacation={v}
                onPress={() => router.push(`/(app)/(vacations)/${v.id}`)}
                onLifecycleChange={(lc) => handleLifecycleChange(v.id, lc)}
              />
            </View>
          ))}
        </View>

        {vacations.length === 0 && <Text style={st.empty}>Nenhuma viagem encontrada.</Text>}
        {vacations.length > 0 && filteredVacations.length === 0 && (
          <View style={st.emptyFilter}>
            <Text style={st.emptyFilterText}>Nenhuma viagem corresponde aos filtros activos</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={st.clearLink}>Limpar filtros</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={2000}
        style={st.successSnackbar}
        theme={{ colors: { inverseSurface: '#388E3C', inverseOnSurface: '#FFFFFF' } }}
      >
        Viagem criada
      </Snackbar>

      {/* FAB row */}
      <View style={st.fabRow}>
        <TouchableOpacity
          style={[st.fab, st.filterFab]}
          onPress={() => setFilterPanelVisible(!filterPanelVisible)}
          activeOpacity={0.8}
        >
          <Icon source="filter-variant" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={st.fab}
          onPress={() => router.push('/(app)/(vacations)/select-template')}
          activeOpacity={0.8}
        >
          <Text style={st.fabText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      <Modal
        visible={filterPanelVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterPanelVisible(false)}
      >
        <View style={st.filterOverlay}>
          <TouchableOpacity
            style={st.filterOverlayTouch}
            onPress={() => setFilterPanelVisible(false)}
            activeOpacity={1}
          />
          <View style={st.filterPanel}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={st.filterPanelHeader}>
                <Text style={st.filterPanelTitle}>Filtros</Text>
                {filterCount > 0 && (
                  <TouchableOpacity onPress={clearFilters}>
                    <Text style={st.filterPanelClear}>Limpar</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={st.label}>Nome</Text>
              <TextInput
                style={st.input}
                value={filterSearch}
                onChangeText={setFilterSearch}
                placeholder="Pesquisar..."
                autoCapitalize="none"
              />

              <Text style={st.label}>Participante</Text>
              <View style={st.filterChipRow}>
                <TouchableOpacity
                  style={[st.chip, filterProfile === null && st.chipActive]}
                  onPress={() => setFilterProfile(null)}
                >
                  <Text style={[st.chipText, filterProfile === null && st.chipTextActive]}>Todos</Text>
                </TouchableOpacity>
                {profiles
                  .filter((p) => p.status !== 'inactive')
                  .map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[st.chip, filterProfile === p.id && st.chipActive]}
                      onPress={() => setFilterProfile(filterProfile === p.id ? null : p.id)}
                    >
                      <Text style={[st.chipText, filterProfile === p.id && st.chipTextActive]}>
                        {p.displayName}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>

              {tags.length > 0 && (
                <>
                  <Text style={st.label}>Etiqueta</Text>
                  <View style={st.filterChipRow}>
                    <TouchableOpacity
                      style={[st.chip, filterTag === null && st.chipActive]}
                      onPress={() => setFilterTag(null)}
                    >
                      <Text style={[st.chipText, filterTag === null && st.chipTextActive]}>Todas</Text>
                    </TouchableOpacity>
                    {tags.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[st.chip, filterTag === t.id && st.chipActive]}
                        onPress={() => setFilterTag(filterTag === t.id ? null : t.id)}
                      >
                        <Icon source={t.icon} size={14} color={filterTag === t.id ? '#FFFFFF' : t.color} />
                        <Text style={[st.chipText, filterTag === t.id && st.chipTextActive]}>{t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <TouchableOpacity style={st.filterApplyBtn} onPress={() => setFilterPanelVisible(false)}>
                <Text style={st.filterApplyBtnText}>
                  Ver {filteredVacations.length} {filteredVacations.length === 1 ? 'viagem' : 'viagens'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },
  error: { color: '#D32F2F', marginBottom: 12, fontSize: 14 },
  successSnackbar: { position: 'absolute', top: 48, backgroundColor: '#388E3C' },
  cardList: { gap: 16 },
  empty: { color: '#888888', textAlign: 'center', marginVertical: 16 },
  emptyFilter: { alignItems: 'center', marginVertical: 32 },
  emptyFilterText: { color: '#888888', textAlign: 'center', marginBottom: 8 },
  clearLink: { color: '#B5451B', fontWeight: '500' },
  // FABs
  fabRow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#B5451B',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  filterFab: { backgroundColor: '#6D6D6D', width: 48, height: 48, borderRadius: 14 },
  fabText: { color: '#FFFFFF', fontSize: 28, fontWeight: '400', marginTop: -2 },
  // Filter panel
  label: { fontSize: 13, fontWeight: '600', color: '#555555', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#B5451B', borderColor: '#B5451B' },
  chipText: { fontSize: 13, color: '#555555' },
  chipTextActive: { color: '#FFFFFF' },
  filterOverlay: { flex: 1, flexDirection: 'row' },
  filterOverlayTouch: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  filterPanel: { width: 300, backgroundColor: '#FFFFFF', paddingTop: 48, paddingHorizontal: 20 },
  filterPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 16,
  },
  filterPanelTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  filterPanelClear: { fontSize: 14, color: '#B5451B', fontWeight: '500' },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  filterApplyBtn: {
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  filterApplyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
