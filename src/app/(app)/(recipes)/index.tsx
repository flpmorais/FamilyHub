import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect, router } from 'expo-router';
import { useRepository } from '../../../hooks/use-repository';
import { useRecipeRealtime } from '../../../hooks/use-recipe-realtime';
import { useAuthStore } from '../../../stores/auth.store';
import { useRecipesStore } from '../../../stores/recipes.store';
import { RecipeCard } from '../../../components/recipes/recipe-card';
import { RecipeTypeFilter } from '../../../components/recipes/recipe-type-filter';
import {
  RecipeFilterPanel,
  EMPTY_FILTERS,
  countActiveFilters,
  type RecipeFilters,
} from '../../../components/recipes/recipe-filter-panel';
import { PageHeader } from '../../../components/page-header';
import { RecipeAddModal } from '../../../components/recipes/recipe-add-modal';
import { PAGE_SIZE } from '../../../constants/pagination';
import { supabaseClient } from '../../../repositories/supabase/supabase.client';
import { logger } from '../../../utils/logger';
import type { RecipeForList, RecipeCategory, RecipeTag } from '../../../types/recipe.types';

export default function RecipesScreen() {
  const recipeRepo = useRepository('recipe');
  const recipeCategoryRepo = useRepository('recipeCategory');
  const recipeTagRepo = useRepository('recipeTag');
  const recipeRatingRepo = useRepository('recipeRating');
  const { userAccount } = useAuthStore();
  const { activeTypeFilter, setActiveTypeFilter } = useRecipesStore();

  const [recipes, setRecipes] = useState<RecipeForList[]>([]);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [tags, setTags] = useState<RecipeTag[]>([]);
  const [familyBannerUrl, setFamilyBannerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [filters, setFilters] = useState<RecipeFilters>(EMPTY_FILTERS);
  const loadingMoreRef = useRef(false);

  const familyId = userAccount?.familyId;

  const parseTime = (value: string): number | null => {
    if (!value.trim()) return null;
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? null : n;
  };

  const buildRepoFilters = useCallback(
    () => ({
      type: activeTypeFilter,
      categoryIds: filters.categoryIds,
      tagIds: filters.tagIds,
      ingredientQuery: filters.ingredientSearch,
      maxTotalTime: parseTime(filters.maxTotalTime),
      maxPrepTime: parseTime(filters.maxPrepTime),
      maxCookTime: parseTime(filters.maxCookTime),
    }),
    [activeTypeFilter, filters],
  );

  const decorateWithRatings = useCallback(
    async (list: RecipeForList[]): Promise<RecipeForList[]> => {
      if (list.length === 0) return list;
      const summaries = await recipeRatingRepo.getSummariesForRecipes(list.map((r) => r.id));
      return list.map((r) => ({
        ...r,
        averageRating: summaries.get(r.id)?.average ?? null,
        ratingCount: summaries.get(r.id)?.count ?? 0,
      }));
    },
    [recipeRatingRepo],
  );

  const reloadFromStart = useCallback(async () => {
    if (!familyId) return;
    try {
      const [firstPage, counts] = await Promise.all([
        recipeRepo.getListPaginated(familyId, PAGE_SIZE, 0, buildRepoFilters()),
        recipeRepo.getTypeCounts(familyId),
      ]);
      const decorated = await decorateWithRatings(firstPage);
      setRecipes(decorated);
      setCursor(PAGE_SIZE);
      setHasMore(firstPage.length === PAGE_SIZE);
      setTypeCounts(counts);
    } catch (err) {
      logger.error('RecipesScreen', 'load failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [recipeRepo, decorateWithRatings, familyId, buildRepoFilters]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current || !familyId) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const nextPage = await recipeRepo.getListPaginated(
        familyId,
        PAGE_SIZE,
        cursor,
        buildRepoFilters(),
      );
      const decorated = await decorateWithRatings(nextPage);
      setRecipes((prev) => [...prev, ...decorated]);
      setCursor(cursor + PAGE_SIZE);
      setHasMore(nextPage.length === PAGE_SIZE);
    } catch (err) {
      logger.error('RecipesScreen', 'loadMore failed', err);
    } finally {
      setIsLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [recipeRepo, decorateWithRatings, familyId, cursor, hasMore, buildRepoFilters]);

  useFocusEffect(
    useCallback(() => {
      void reloadFromStart();
      if (familyId) {
        supabaseClient
          .from('families')
          .select('banner_url')
          .eq('id', familyId)
          .single()
          .then(({ data }) => {
            if (data) setFamilyBannerUrl(data.banner_url ?? null);
          });
      }
    }, [reloadFromStart, familyId]),
  );

  // Reload when filters change
  useEffect(() => {
    if (!familyId) return;
    void reloadFromStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTypeFilter, filters, familyId]);

  // Load categories and tags for filter panel
  useEffect(() => {
    if (!familyId) return;
    recipeCategoryRepo.getAll(familyId).then(setCategories).catch(() => {});
    recipeTagRepo.getAll(familyId).then(setTags).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  // Cross-device real-time sync — reload page 0 on any change
  useRecipeRealtime(familyId, reloadFromStart);

  const activeFilterCount = countActiveFilters(filters);
  const totalCount = Object.values(typeCounts).reduce((sum, n) => sum + n, 0);

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <PageHeader title="Receitas" familyBannerUri={familyBannerUrl} />

      {/* Type filter tabs */}
      {totalCount > 0 && (
        <View style={s.typeFilterContainer}>
          <RecipeTypeFilter
            counts={typeCounts}
            activeType={activeTypeFilter}
            onSelect={setActiveTypeFilter}
          />
        </View>
      )}

      {recipes.length === 0 ? (
        <View style={s.emptyContainer}>
          {totalCount === 0 ? (
            <>
              <Text style={s.emptyText}>Ainda não tem receitas.</Text>
              <Text style={s.emptySubtext}>
                Toque no botão + para adicionar a sua primeira receita.
              </Text>
            </>
          ) : (
            <>
              <Text style={s.emptyText}>Nenhuma receita encontrada com estes filtros.</Text>
              <TouchableOpacity
                onPress={() => {
                  setActiveTypeFilter(null);
                  setFilters(EMPTY_FILTERS);
                }}
              >
                <Text style={s.clearFiltersLink}>Limpar filtros</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={(recipe) => router.push(`/(app)/(recipes)/${recipe.id}` as any)}
            />
          )}
          contentContainerStyle={s.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator style={s.loadingMore} /> : null}
        />
      )}

      {/* FABs */}
      <View style={s.fabRow}>
        <TouchableOpacity
          style={[s.filterFab, activeFilterCount > 0 && s.filterFabActive]}
          onPress={() => setFilterPanelVisible(true)}
          activeOpacity={0.8}
        >
          <Icon source="filter-variant" size={24} color="#FFFFFF" />
          {activeFilterCount > 0 && (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.fab}
          onPress={() => setAddModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Add recipe modal */}
      <RecipeAddModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
      />

      {/* Filter panel */}
      <RecipeFilterPanel
        visible={filterPanelVisible}
        filters={filters}
        categories={categories}
        tags={tags}
        onApply={setFilters}
        onClose={() => setFilterPanelVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  typeFilterContainer: {
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888888',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 8,
  },
  clearFiltersLink: {
    fontSize: 14,
    color: '#B5451B',
    fontWeight: '600',
    marginTop: 12,
  },
  list: {
    paddingBottom: 80,
  },
  loadingMore: {
    marginTop: 12,
    marginBottom: 16,
  },
  fabRow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterFab: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#6D6D6D',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  filterFabActive: {
    backgroundColor: '#B5451B',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#B5451B',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '400',
    marginTop: -2,
  },
});
