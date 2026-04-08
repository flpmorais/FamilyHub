import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useRepository } from '../../../hooks/use-repository';
import { useAuthStore } from '../../../stores/auth.store';
import { mergeIntoShoppingList } from '../../../services/shopping-merge.service';
import { logger } from '../../../utils/logger';
import type { GeneratedShoppingItem } from '../../../types/recipe.types';

export default function ShoppingListReviewScreen() {
  const { itemsJson } = useLocalSearchParams<{ itemsJson: string }>();
  const shoppingRepo = useRepository('shopping');
  const shoppingCategoryRepo = useRepository('shoppingCategory');
  const classificationRepo = useRepository('classification');
  const { userAccount } = useAuthStore();
  const familyId = userAccount?.familyId;

  const parsed: GeneratedShoppingItem[] = (() => {
    try {
      return itemsJson ? JSON.parse(itemsJson) : [];
    } catch {
      return [];
    }
  })();

  const [items, setItems] = useState<GeneratedShoppingItem[]>(parsed);
  const [isMerging, setIsMerging] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarColor, setSnackbarColor] = useState('#388E3C');

  const checkedCount = items.filter((i) => i.checked).length;
  const allChecked = checkedCount === items.length && items.length > 0;

  function toggleItem(index: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item,
      ),
    );
  }

  function toggleAll() {
    const newChecked = !allChecked;
    setItems((prev) => prev.map((item) => ({ ...item, checked: newChecked })));
  }

  async function handleAddToShoppingList() {
    if (!familyId) return;
    const checked = items.filter((i) => i.checked);
    if (checked.length === 0) return;

    setIsMerging(true);
    try {
      const { created, updated } = await mergeIntoShoppingList(
        checked.map((i) => ({ name: i.ingredientName, quantity: i.totalQuantity })),
        familyId,
        shoppingRepo,
        shoppingCategoryRepo,
        classificationRepo,
      );

      const parts: string[] = [];
      if (created > 0) parts.push(`${created} adicionado${created > 1 ? 's' : ''}`);
      if (updated > 0) parts.push(`${updated} atualizado${updated > 1 ? 's' : ''}`);
      const msg = parts.join(', ') || 'Lista atualizada';

      Alert.alert(
        'Lista de compras atualizada',
        msg,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      logger.error('ShoppingListReviewScreen', 'merge failed', err);
      setSnackbarColor('#D32F2F');
      setSnackbarMsg('Erro ao adicionar à lista de compras');
      setSnackbarVisible(true);
    } finally {
      setIsMerging(false);
    }
  }

  if (items.length === 0) {
    return (
      <View style={s.centered}>
        <Text style={s.emptyText}>Nenhum ingrediente gerado.</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backLink}>
          <Text style={s.backLinkText}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.headerBack}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Lista de Compras</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Select all toggle */}
      <TouchableOpacity style={s.selectAllRow} onPress={toggleAll}>
        <View style={s.checkbox}>
          {allChecked && <View style={s.checkboxFilled} />}
        </View>
        <Text style={s.selectAllText}>
          {allChecked ? 'Desselecionar todos' : 'Selecionar todos'}
        </Text>
        <Text style={s.countText}>{checkedCount}/{items.length}</Text>
      </TouchableOpacity>

      {/* Ingredient list */}
      <FlatList
        data={items}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={s.itemRow} onPress={() => toggleItem(index)}>
            <View style={s.checkbox}>
              {item.checked && <View style={s.checkboxFilled} />}
            </View>
            <Text style={[s.itemName, item.checked && s.itemNameChecked]} numberOfLines={1}>
              {item.ingredientName}
            </Text>
            {item.totalQuantity && (
              <Text style={[s.itemQty, item.checked && s.itemQtyChecked]}>
                {item.totalQuantity}
              </Text>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={s.list}
      />

      {/* Add button */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.addBtn, (checkedCount === 0 || isMerging) && s.addBtnDisabled]}
          onPress={handleAddToShoppingList}
          disabled={checkedCount === 0 || isMerging}
        >
          {isMerging ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.addBtnText}>
              Adicionar à Lista de Compras ({checkedCount})
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={s.snackbar}
        theme={{ colors: { inverseSurface: snackbarColor, inverseOnSurface: '#FFFFFF' } }}
      >
        {snackbarMsg}
      </Snackbar>
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  emptyText: { fontSize: 16, color: '#888888', marginBottom: 16 },
  backLink: { paddingHorizontal: 16, paddingVertical: 8 },
  backLinkText: { fontSize: 14, color: '#B5451B', fontWeight: '600' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerBack: { fontSize: 14, color: '#B5451B', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectAllText: {
    flex: 1,
    fontSize: 14,
    color: '#B5451B',
    fontWeight: '600',
    marginLeft: 12,
  },
  countText: {
    fontSize: 13,
    color: '#888888',
  },
  list: {
    paddingBottom: 80,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxFilled: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#B5451B',
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    marginLeft: 12,
  },
  itemNameChecked: {
    color: '#B5451B',
    fontWeight: '500',
  },
  itemQty: {
    fontSize: 14,
    color: '#888888',
    marginLeft: 8,
  },
  itemQtyChecked: {
    color: '#B5451B',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 16,
  },
  addBtn: {
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  snackbar: {
    position: 'absolute',
    top: 48,
  },
});
