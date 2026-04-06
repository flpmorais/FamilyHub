import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import type { RecipeCategory, RecipeTag } from '../../types/recipe.types';

export interface RecipeFilters {
  categoryIds: string[];
  tagIds: string[];
  ingredientSearch: string;
  maxTotalTime: string;
  maxPrepTime: string;
  maxCookTime: string;
}

export const EMPTY_FILTERS: RecipeFilters = {
  categoryIds: [],
  tagIds: [],
  ingredientSearch: '',
  maxTotalTime: '',
  maxPrepTime: '',
  maxCookTime: '',
};

export function countActiveFilters(filters: RecipeFilters): number {
  let count = 0;
  if (filters.categoryIds.length > 0) count++;
  if (filters.tagIds.length > 0) count++;
  if (filters.ingredientSearch.trim()) count++;
  if (filters.maxTotalTime.trim()) count++;
  if (filters.maxPrepTime.trim()) count++;
  if (filters.maxCookTime.trim()) count++;
  return count;
}

interface RecipeFilterPanelProps {
  visible: boolean;
  filters: RecipeFilters;
  categories: RecipeCategory[];
  tags: RecipeTag[];
  onApply: (filters: RecipeFilters) => void;
  onClose: () => void;
}

export function RecipeFilterPanel({
  visible,
  filters,
  categories,
  tags,
  onApply,
  onClose,
}: RecipeFilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<RecipeFilters>(filters);

  useEffect(() => {
    if (visible) setLocalFilters(filters);
  }, [visible, filters]);

  function toggleCategory(id: string) {
    setLocalFilters((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((c) => c !== id)
        : [...prev.categoryIds, id],
    }));
  }

  function toggleTag(id: string) {
    setLocalFilters((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(id)
        ? prev.tagIds.filter((t) => t !== id)
        : [...prev.tagIds, id],
    }));
  }

  function handleClear() {
    setLocalFilters(EMPTY_FILTERS);
  }

  function handleApply() {
    onApply(localFilters);
    onClose();
  }

  const activeCount = countActiveFilters(localFilters);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.overlayTouch} onPress={onClose} activeOpacity={1} />
        <View style={s.panel}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.panelHeader}>
              <Text style={s.panelTitle}>Filtros</Text>
              {activeCount > 0 && (
                <TouchableOpacity onPress={handleClear}>
                  <Text style={s.clearText}>Limpar</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Ingredient search */}
            <Text style={s.label}>Ingrediente</Text>
            <TextInput
              style={s.input}
              value={localFilters.ingredientSearch}
              onChangeText={(v) => setLocalFilters((prev) => ({ ...prev, ingredientSearch: v }))}
              placeholder="Pesquisar por ingrediente..."
              placeholderTextColor="#CCCCCC"
              autoCapitalize="none"
            />

            {/* Categories */}
            {categories.length > 0 && (
              <>
                <Text style={s.label}>Categorias</Text>
                <View style={s.chipRow}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[s.chip, localFilters.categoryIds.includes(cat.id) && s.chipActive]}
                      onPress={() => toggleCategory(cat.id)}
                    >
                      <Text style={[s.chipText, localFilters.categoryIds.includes(cat.id) && s.chipTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <>
                <Text style={s.label}>Etiquetas</Text>
                <View style={s.chipRow}>
                  {tags.map((tag) => (
                    <TouchableOpacity
                      key={tag.id}
                      style={[s.chip, localFilters.tagIds.includes(tag.id) && s.chipActive]}
                      onPress={() => toggleTag(tag.id)}
                    >
                      <Text style={[s.chipText, localFilters.tagIds.includes(tag.id) && s.chipTextActive]}>
                        {tag.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Time filters */}
            <Text style={s.label}>Tempo total máximo (min)</Text>
            <TextInput
              style={s.input}
              value={localFilters.maxTotalTime}
              onChangeText={(v) => setLocalFilters((prev) => ({ ...prev, maxTotalTime: v }))}
              placeholder="Ex: 30"
              placeholderTextColor="#CCCCCC"
              keyboardType="numeric"
            />

            <Text style={s.label}>Tempo de preparação máximo (min)</Text>
            <TextInput
              style={s.input}
              value={localFilters.maxPrepTime}
              onChangeText={(v) => setLocalFilters((prev) => ({ ...prev, maxPrepTime: v }))}
              placeholder="Ex: 15"
              placeholderTextColor="#CCCCCC"
              keyboardType="numeric"
            />

            <Text style={s.label}>Tempo de cozinhar máximo (min)</Text>
            <TextInput
              style={s.input}
              value={localFilters.maxCookTime}
              onChangeText={(v) => setLocalFilters((prev) => ({ ...prev, maxCookTime: v }))}
              placeholder="Ex: 60"
              placeholderTextColor="#CCCCCC"
              keyboardType="numeric"
            />

            {/* Apply button */}
            <TouchableOpacity style={s.applyBtn} onPress={handleApply}>
              <Text style={s.applyBtnText}>Aplicar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  overlayTouch: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: {
    width: 300,
    backgroundColor: '#FFFFFF',
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 16,
  },
  panelTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  clearText: { fontSize: 14, color: '#B5451B', fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600', color: '#555555', marginBottom: 4, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#B5451B', borderColor: '#B5451B' },
  chipText: { fontSize: 13, color: '#666666' },
  chipTextActive: { color: '#FFFFFF' },
  applyBtn: {
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  applyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
