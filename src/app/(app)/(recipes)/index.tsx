import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
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
import { RECIPE_TYPES } from '../../../constants/recipe-defaults';
import { PageHeader } from '../../../components/page-header';
import { RecipeAddModal } from '../../../components/recipes/recipe-add-modal';
import { supabaseClient } from '../../../repositories/supabase/supabase.client';
import { logger } from '../../../utils/logger';
import type { RecipeForList, RecipeType, RecipeCategory, RecipeTag } from '../../../types/recipe.types';

interface RecipeSection {
  title: string;
  data: RecipeForList[];
}

function buildSections(recipes: RecipeForList[]): RecipeSection[] {
  const grouped = recipes.reduce(
    (acc, recipe) => {
      const type = recipe.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(recipe);
      return acc;
    },
    {} as Record<RecipeType, RecipeForList[]>,
  );

  return Object.entries(grouped).map(([type, data]) => ({
    title: RECIPE_TYPES[type as RecipeType],
    data,
  }));
}

export default function RecipesScreen() {
  const recipeRepo = useRepository('recipe');
  const recipeCategoryRepo = useRepository('recipeCategory');
  const recipeTagRepo = useRepository('recipeTag');
  const recipeRatingRepo = useRepository('recipeRating');
  const { userAccount } = useAuthStore();
  const { activeTypeFilter, setActiveTypeFilter } = useRecipesStore();

  const [recipes, setRecipes] = useState<RecipeForList[]>([]);
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [tags, setTags] = useState<RecipeTag[]>([]);
  const [familyBannerUrl, setFamilyBannerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [filters, setFilters] = useState<RecipeFilters>(EMPTY_FILTERS);

  const familyId = userAccount?.familyId;

  const reload = useCallback(async () => {
    if (!familyId) return;
    try {
      const list = await recipeRepo.getByFamilyIdForList(familyId);
      const summaries = await recipeRatingRepo.getSummariesForRecipes(list.map((r) => r.id));
      setRecipes(
        list.map((r) => ({
          ...r,
          averageRating: summaries.get(r.id)?.average ?? null,
          ratingCount: summaries.get(r.id)?.count ?? 0,
        })),
      );
    } catch (err) {
      logger.error('RecipesScreen', 'load failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [recipeRepo, recipeRatingRepo, familyId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
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
    }, [reload, familyId]),
  );

  // Load categories and tags for filter panel
  useEffect(() => {
    if (!familyId) return;
    recipeCategoryRepo.getAll(familyId).then(setCategories).catch(() => {});
    recipeTagRepo.getAll(familyId).then(setTags).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  // Cross-device real-time sync
  useRecipeRealtime(familyId, reload);

  // Client-side filtering
  const filteredRecipes = useMemo(() => {
    let result = recipes;

    // Type filter
    if (activeTypeFilter) {
      result = result.filter((r) => r.type === activeTypeFilter);
    }

    // Category filter
    if (filters.categoryIds.length > 0) {
      result = result.filter((r) =>
        filters.categoryIds.some((catId) => r.categoryIds.includes(catId)),
      );
    }

    // Tag filter
    if (filters.tagIds.length > 0) {
      result = result.filter((r) =>
        filters.tagIds.some((tagId) => r.tagIds.includes(tagId)),
      );
    }

    // Ingredient search
    const ingredientSearch = filters.ingredientSearch.trim().toLowerCase();
    if (ingredientSearch) {
      result = result.filter((r) =>
        r.ingredientNames.some((name) => name.toLowerCase().includes(ingredientSearch)),
      );
    }

    // Time filters
    const maxTotal = filters.maxTotalTime ? parseInt(filters.maxTotalTime, 10) : null;
    const maxPrep = filters.maxPrepTime ? parseInt(filters.maxPrepTime, 10) : null;
    const maxCook = filters.maxCookTime ? parseInt(filters.maxCookTime, 10) : null;

    if (maxTotal != null && !isNaN(maxTotal)) {
      result = result.filter((r) => {
        const total = (r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0);
        return total <= maxTotal;
      });
    }

    if (maxPrep != null && !isNaN(maxPrep)) {
      result = result.filter((r) => (r.prepTimeMinutes ?? 0) <= maxPrep);
    }

    if (maxCook != null && !isNaN(maxCook)) {
      result = result.filter((r) => (r.cookTimeMinutes ?? 0) <= maxCook);
    }

    return result;
  }, [recipes, activeTypeFilter, filters]);

  const sections = useMemo(() => buildSections(filteredRecipes), [filteredRecipes]);
  const activeFilterCount = countActiveFilters(filters);
  const hasAnyFilter = activeTypeFilter !== null || activeFilterCount > 0;

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
      {recipes.length > 0 && (
        <View style={s.typeFilterContainer}>
          <RecipeTypeFilter
            recipes={recipes}
            activeType={activeTypeFilter}
            onSelect={setActiveTypeFilter}
          />
        </View>
      )}

      {filteredRecipes.length === 0 ? (
        <View style={s.emptyContainer}>
          {recipes.length === 0 ? (
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
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <Text style={s.sectionHeader}>
              {section.title} ({section.data.length})
            </Text>
          )}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={(recipe) =>
                router.push(`/(app)/(recipes)/${recipe.id}` as any)
              }
            />
          )}
          contentContainerStyle={s.list}
          stickySectionHeadersEnabled={false}
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
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  list: {
    paddingBottom: 80,
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
