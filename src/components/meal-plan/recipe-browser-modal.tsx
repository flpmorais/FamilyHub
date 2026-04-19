import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRepository } from '../../hooks/use-repository';
import { useAuthStore } from '../../hooks/use-auth.store';
import { RECIPE_TYPE_LIST } from '../../constants/recipe-defaults';
import { DishTypeTag } from '../common/dish-type-tag';
import { logger } from '../../utils/logger';
import { useModalKeyboardScroll } from '../../hooks/use-modal-keyboard-scroll';
import type { Recipe, RecipeType } from '../../types/recipe.types';

interface RecipeBrowserModalProps {
  visible: boolean;
  onSelect: (recipe: Recipe) => void;
  onClose: () => void;
}

export function RecipeBrowserModal({ visible, onSelect, onClose }: RecipeBrowserModalProps) {
  const recipeRepo = useRepository('recipe');
  const { userAccount } = useAuthStore();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeType, setActiveType] = useState<RecipeType | null>(null);
  const [search, setSearch] = useState('');

  const { keyboardHeight, scrollViewRef, getInputProps } = useModalKeyboardScroll({
    inputKeys: ['search'],
  });

  useEffect(() => {
    if (!visible || !userAccount?.familyId) return;
    setIsLoading(true);
    recipeRepo
      .getByFamilyId(userAccount.familyId)
      .then(setRecipes)
      .catch((err) => logger.error('RecipeBrowserModal', 'load failed', err))
      .finally(() => setIsLoading(false));
  }, [visible, userAccount?.familyId, recipeRepo]);

  const filtered = useMemo(() => {
    let result = recipes;
    if (activeType) result = result.filter((r) => r.type === activeType);
    const term = search.trim().toLowerCase();
    if (term) result = result.filter((r) => r.name.toLowerCase().includes(term));
    return result;
  }, [recipes, activeType, search]);

  function handleSelect(recipe: Recipe) {
    onSelect(recipe);
    setActiveType(null);
    setSearch('');
  }

  function handleClose() {
    setActiveType(null);
    setSearch('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={s.panel}>
          <View style={s.header}>
            <Text style={s.title}>Escolher Receita</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={s.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: keyboardHeight + 8 }}
          >
            <TextInput
              {...getInputProps('search')}
              style={s.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Pesquisar receita..."
              placeholderTextColor="#CCCCCC"
              autoCapitalize="none"
            />

            {/* Type tabs */}
            <View style={s.typeScroll}>
              <FlatList
                horizontal
                data={RECIPE_TYPE_LIST}
                keyExtractor={(item) => item.key}
                ListHeaderComponent={
                  <TouchableOpacity
                    style={[s.allChip, !activeType && s.allChipActive]}
                    onPress={() => setActiveType(null)}
                  >
                    <Text style={[s.allChipText, !activeType && s.allChipTextActive]}>Todos</Text>
                  </TouchableOpacity>
                }
                renderItem={({ item }) => (
                  <DishTypeTag
                    typeKey={item.key}
                    variant={activeType === item.key ? 'filled' : 'outlined'}
                    size="md"
                    onPress={() => setActiveType(item.key)}
                  />
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.typeRow}
              />
            </View>

            {isLoading ? (
              <View style={s.centered}><ActivityIndicator /></View>
            ) : filtered.length === 0 ? (
              <View style={s.centered}><Text style={s.empty}>Nenhuma receita encontrada.</Text></View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={s.recipeRow} onPress={() => handleSelect(item)}>
                    <Text style={s.recipeName} numberOfLines={1}>{item.name}</Text>
                    <DishTypeTag typeKey={item.type} variant="filled" size="sm" />
                  </TouchableOpacity>
                )}
                contentContainerStyle={s.list}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  closeText: { fontSize: 20, color: '#888888', padding: 4 },
  search: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  typeScroll: { maxHeight: 44 },
  typeRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' },
  allChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  allChipActive: { backgroundColor: '#B5451B' },
  allChipText: { fontSize: 12, color: '#666666', fontWeight: '600' },
  allChipTextActive: { color: '#FFFFFF' },
  centered: { padding: 32, alignItems: 'center' },
  empty: { color: '#888888', fontSize: 14 },
  list: { paddingHorizontal: 16 },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recipeName: { flex: 1, fontSize: 15, color: '#1A1A1A' },
});
