import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
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
import { useModalKeyboardScroll } from '../../../hooks/use-modal-keyboard-scroll';
import { VacationHeroCard } from '../../../components/vacation-hero-card';
import { PageHeader } from '../../../components/page-header';
import { useFamily } from '../../../hooks/use-family';
import { PAGE_SIZE } from '../../../constants/pagination';
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
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const loadingMoreRef = useRef(false);

  // Filters
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterProfile, setFilterProfile] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const buildRepoFilters = useCallback(
    () => ({
      search: filterSearch,
      profileId: filterProfile,
      tagId: filterTag,
    }),
    [filterSearch, filterProfile, filterTag],
  );

  const reloadFromStart = useCallback(
    async (showSpinner = false) => {
      if (!userAccount?.familyId) return;
      if (showSpinner) setIsLoading(true);
      try {
        const firstPage = await vacationRepository.getVacationsPaginated(
          userAccount.familyId,
          PAGE_SIZE,
          0,
          buildRepoFilters(),
        );
        setVacations(firstPage);
        setCursor(PAGE_SIZE);
        setHasMore(firstPage.length === PAGE_SIZE);
      } catch (err) {
        logger.error('VacationsScreen', 'loadData failed', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar viagens.');
      } finally {
        if (showSpinner) setIsLoading(false);
      }
    },
    [vacationRepository, userAccount?.familyId, buildRepoFilters],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current || !userAccount?.familyId) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const nextPage = await vacationRepository.getVacationsPaginated(
        userAccount.familyId,
        PAGE_SIZE,
        cursor,
        buildRepoFilters(),
      );
      setVacations((prev) => [...prev, ...nextPage]);
      setCursor(cursor + PAGE_SIZE);
      setHasMore(nextPage.length === PAGE_SIZE);
    } catch (err) {
      logger.error('VacationsScreen', 'loadMore failed', err);
    } finally {
      setIsLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [vacationRepository, userAccount?.familyId, cursor, hasMore, buildRepoFilters]);

  // Load profiles + tags for filter panel
  useEffect(() => {
    if (!userAccount?.familyId) return;
    profileRepository.getProfilesByFamily(userAccount.familyId).then(setProfiles).catch(() => {});
    tagRepository
      .getTags(userAccount.familyId)
      .then((list) => setTags(list.filter((t) => t.active)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAccount?.familyId]);

  useFocusEffect(
    useCallback(() => {
      void reloadFromStart(true);
    }, [reloadFromStart]),
  );

  // Reload when filters change
  useEffect(() => {
    if (!userAccount?.familyId) return;
    void reloadFromStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSearch, filterProfile, filterTag, userAccount?.familyId]);

  async function handleLifecycleChange(vacationId: string, lc: VacationLifecycle) {
    try {
      const updates: Partial<Vacation> = { lifecycle: lc };
      if (lc === 'cancelled' || lc === 'completed') updates.isPinned = false;
      await vacationRepository.updateVacation(vacationId, updates);
      await reloadFromStart();
    } catch (err) {
      logger.error('VacationsScreen', 'lifecycle change failed', err);
    }
  }

  const filterCount = (filterSearch ? 1 : 0) + (filterProfile ? 1 : 0) + (filterTag ? 1 : 0);

  const { keyboardHeight, scrollViewRef, getInputProps } = useModalKeyboardScroll({
    inputKeys: ['filterSearch'],
  });

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
      {error ? <Text style={st.error}>{error}</Text> : null}

      {vacations.length === 0 ? (
        <View style={st.emptyContainer}>
          {filterCount > 0 ? (
            <>
              <Text style={st.emptyFilterText}>Nenhuma viagem corresponde aos filtros activos</Text>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={st.clearLink}>Limpar filtros</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={st.empty}>Nenhuma viagem encontrada.</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={vacations}
          keyExtractor={(v) => v.id}
          renderItem={({ item }) => (
            <View style={{ borderRadius: 12, overflow: 'hidden' }}>
              <VacationHeroCard
                vacation={item}
                onPress={() => router.push(`/(app)/(vacations)/${item.id}`)}
                onLifecycleChange={(lc) => handleLifecycleChange(item.id, lc)}
              />
            </View>
          )}
          contentContainerStyle={st.content}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator style={st.loadingMore} /> : null}
        />
      )}

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
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={{ paddingBottom: keyboardHeight }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
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
                {...getInputProps('filterSearch')}
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
                <Text style={st.filterApplyBtnText}>Ver viagens</Text>
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
  empty: { color: '#888888', textAlign: 'center', marginVertical: 16 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyFilterText: { color: '#888888', textAlign: 'center', marginBottom: 8 },
  clearLink: { color: '#B5451B', fontWeight: '500' },
  loadingMore: { marginVertical: 12 },
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
