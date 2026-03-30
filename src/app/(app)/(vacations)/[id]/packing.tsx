import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRepository } from '../../../../hooks/use-repository';
import { useAuthStore } from '../../../../stores/auth.store';
import { logger } from '../../../../utils/logger';
import type { PackingItem, PackingStatus } from '../../../../types/packing.types';
import type { Profile } from '../../../../types/profile.types';

const STATUS_LABELS: Record<PackingStatus, string> = {
  new: 'Novo',
  buy: 'Comprar',
  ready: 'Pronto',
  issue: 'Problema',
  last_minute: 'Última hora',
  packed: 'Embalado',
};

const ALL_STATUSES: PackingStatus[] = ['new', 'buy', 'issue', 'ready', 'last_minute', 'packed'];

export default function PackingListScreen() {
  const { id: vacationId } = useLocalSearchParams<{ id: string }>();
  const packingItemRepo = useRepository('packingItem');
  const profileRepo = useRepository('profile');
  const { userAccount } = useAuthStore();

  const [items, setItems] = useState<PackingItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add/Edit sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formProfileId, setFormProfileId] = useState<string | null>(null);
  const [formQuantity, setFormQuantity] = useState('1');
  const [formStatus, setFormStatus] = useState<PackingStatus>('new');
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sticky last-used profile for sequential adds
  const [lastUsedProfileId, setLastUsedProfileId] = useState<string | null>(null);

  const loadItems = useCallback(
    async (showSpinner = false) => {
      if (!vacationId) return;
      if (showSpinner) setIsLoading(true);
      try {
        const list = await packingItemRepo.getPackingItems(vacationId);
        setItems(list);
      } catch (err) {
        logger.error('PackingListScreen', 'loadItems failed', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar itens.');
      } finally {
        if (showSpinner) setIsLoading(false);
      }
    },
    [vacationId, packingItemRepo]
  );

  useEffect(() => {
    void loadItems(true);

    if (userAccount?.familyId) {
      profileRepo
        .getProfilesByFamily(userAccount.familyId)
        .then(setProfiles)
        .catch((err) => logger.error('PackingListScreen', 'loadProfiles failed', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAddSheet() {
    setEditingItem(null);
    setFormName('');
    setFormProfileId(lastUsedProfileId);
    setFormQuantity('1');
    setFormStatus('new');
    setFormNotes('');
    setError(null);
    setSheetVisible(true);
  }

  function openEditSheet(item: PackingItem) {
    setEditingItem(item);
    setFormName(item.name);
    setFormProfileId(item.assignedProfileId);
    setFormQuantity(String(item.quantity));
    setFormStatus(item.status);
    setFormNotes(item.notes ?? '');
    setError(null);
    setSheetVisible(true);
  }

  async function handleSave() {
    const name = formName.trim();
    if (!name) {
      setError('O nome é obrigatório.');
      return;
    }
    setError(null);
    setIsSaving(true);

    try {
      const qty = Math.max(1, parseInt(formQuantity, 10) || 1);

      if (editingItem) {
        await packingItemRepo.updatePackingItem(editingItem.id, {
          name,
          assignedProfileId: formProfileId,
          quantity: qty,
          status: formStatus,
          notes: formNotes || null,
        });
        setSheetVisible(false);
      } else {
        await packingItemRepo.createPackingItem({
          vacationId: vacationId!,
          familyId: userAccount!.familyId,
          name,
          assignedProfileId: formProfileId ?? undefined,
          quantity: qty,
        });
        // Keep sheet open for sequential adds — clear name, retain profile
        setLastUsedProfileId(formProfileId);
        setFormName('');
        setFormQuantity('1');
      }
      await loadItems();
    } catch (err) {
      logger.error('PackingListScreen', 'handleSave failed', err);
      setError(err instanceof Error ? err.message : 'Erro ao guardar item.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete(item: PackingItem) {
    Alert.alert(`Eliminar "${item.name}"?`, 'Esta acção não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await packingItemRepo.deletePackingItem(item.id);
            await loadItems();
          } catch (err) {
            logger.error('PackingListScreen', 'handleDelete failed', err);
            setError(err instanceof Error ? err.message : 'Erro ao eliminar item.');
          }
        },
      },
    ]);
  }

  function profileName(profileId: string | null): string {
    if (!profileId) return '';
    const p = profiles.find((pr) => pr.id === profileId);
    return p?.displayName ?? '';
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Lista de bagagem</Text>

        {error && !sheetVisible ? <Text style={styles.error}>{error}</Text> : null}

        {items.length === 0 && (
          <Text style={styles.empty}>Lista vazia — adiciona o primeiro item</Text>
        )}

        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.itemRow}
            onPress={() => openEditSheet(item)}
            onLongPress={() => handleDelete(item)}
          >
            <View style={[styles.statusStrip, { backgroundColor: statusColor(item.status) }]} />
            <View style={styles.itemInfo}>
              <Text
                style={[styles.itemName, item.status === 'packed' && styles.itemNamePacked]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text style={styles.itemMeta}>
                {[
                  profileName(item.assignedProfileId),
                  item.quantity > 1 ? `×${item.quantity}` : '',
                  STATUS_LABELS[item.status],
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAddSheet} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add/Edit bottom sheet */}
      <Modal
        visible={sheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editingItem ? 'Editar item' : 'Adicionar item'}</Text>

            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              value={formName}
              onChangeText={setFormName}
              placeholder="ex: T-shirts"
              autoCapitalize="sentences"
              editable={!isSaving}
            />

            <Text style={styles.label}>Pessoa</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, formProfileId === null && styles.chipActive]}
                onPress={() => setFormProfileId(null)}
                disabled={isSaving}
              >
                <Text style={[styles.chipText, formProfileId === null && styles.chipTextActive]}>
                  Nenhuma
                </Text>
              </TouchableOpacity>
              {profiles.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, formProfileId === p.id && styles.chipActive]}
                  onPress={() => setFormProfileId(p.id)}
                  disabled={isSaving}
                >
                  <Text style={[styles.chipText, formProfileId === p.id && styles.chipTextActive]}>
                    {p.displayName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Quantidade</Text>
                <TextInput
                  style={styles.input}
                  value={formQuantity}
                  onChangeText={setFormQuantity}
                  keyboardType="number-pad"
                  editable={!isSaving}
                />
              </View>
              {editingItem && (
                <View style={styles.halfField}>
                  <Text style={styles.label}>Estado</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipRow}
                  >
                    {ALL_STATUSES.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.chip, formStatus === s && styles.chipActive]}
                        onPress={() => setFormStatus(s)}
                        disabled={isSaving}
                      >
                        <Text style={[styles.chipText, formStatus === s && styles.chipTextActive]}>
                          {STATUS_LABELS[s]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {editingItem && (
              <>
                <Text style={styles.label}>Notas</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  value={formNotes}
                  onChangeText={setFormNotes}
                  placeholder="Notas adicionais"
                  multiline
                  editable={!isSaving}
                />
              </>
            )}

            <Text style={styles.labelDisabled}>Categoria (Épica 4)</Text>

            {error && sheetVisible ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setSheetVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelText}>{editingItem ? 'Cancelar' : 'Fechar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function statusColor(status: PackingStatus): string {
  const map: Record<PackingStatus, string> = {
    new: '#757575',
    buy: '#F59300',
    ready: '#1976D2',
    issue: '#D32F2F',
    last_minute: '#00897B',
    packed: '#388E3C',
  };
  return map[status];
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingTop: 24, paddingBottom: 80 },
  backButton: { marginBottom: 16, paddingHorizontal: 24 },
  backText: { color: '#B5451B', fontSize: 16 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 24, color: '#1A1A1A', paddingHorizontal: 24 },
  error: { color: '#D32F2F', marginBottom: 12, fontSize: 14, paddingHorizontal: 24 },
  empty: { color: '#888888', textAlign: 'center', marginVertical: 32, paddingHorizontal: 24 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statusStrip: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, color: '#1A1A1A' },
  itemNamePacked: { textDecorationLine: 'line-through', opacity: 0.6 },
  itemMeta: { fontSize: 14, color: '#888888', marginTop: 2 },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
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
  fabText: { color: '#FFFFFF', fontSize: 28, fontWeight: '400', marginTop: -2 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#555555', marginBottom: 4 },
  labelDisabled: { fontSize: 13, fontWeight: '600', color: '#CCCCCC', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  chipRow: { marginBottom: 16, flexGrow: 0 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#B5451B', borderColor: '#B5451B' },
  chipText: { fontSize: 13, color: '#555555' },
  chipTextActive: { color: '#FFFFFF' },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  sheetButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
  },
  cancelText: { color: '#1A1A1A', fontSize: 16 },
  saveButton: {
    flex: 1,
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
