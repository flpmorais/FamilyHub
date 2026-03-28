import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { Icon } from 'react-native-paper';
import { useStatusColours } from '../../constants/status-colours';
import type { PackingStatus, Category, Tag } from '../../types/packing.types';
import type { Profile } from '../../types/profile.types';

const ALL_STATUSES: PackingStatus[] = ['new', 'buy', 'issue', 'ready', 'last_minute', 'packed'];

const STATUS_LABELS: Record<PackingStatus, string> = {
  new: 'Novo',
  buy: 'Comprar',
  ready: 'Pronto',
  issue: 'Problema',
  last_minute: 'Última hora',
  packed: 'Embalado',
};

interface FilterPanelProps {
  visible: boolean;
  onClose: () => void;
  activeStatuses: PackingStatus[];
  activeProfiles: string[];
  activeCategories: string[];
  activeTags: string[];
  profiles: Profile[];
  categories: Category[];
  tags: Tag[];
  onToggleStatus: (status: PackingStatus) => void;
  onToggleProfile: (profileId: string) => void;
  onToggleCategory: (categoryId: string) => void;
  onToggleTag: (tagId: string) => void;
  onClearAll: () => void;
  filteredCount: number;
}

export function FilterPanel({
  visible,
  onClose,
  activeStatuses,
  activeProfiles,
  activeCategories,
  activeTags,
  profiles,
  categories,
  tags,
  onToggleStatus,
  onToggleProfile,
  onToggleCategory,
  onToggleTag,
  onClearAll,
  filteredCount,
}: FilterPanelProps) {
  const colours = useStatusColours();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.overlayTouch} onPress={onClose} activeOpacity={1} />
        <View style={s.panel}>
          <View style={s.header}>
            <Text style={s.title}>Filtros</Text>
            {(activeStatuses.length > 0 ||
              activeProfiles.length > 0 ||
              activeCategories.length > 0 ||
              activeTags.length > 0) && (
              <TouchableOpacity onPress={onClearAll}>
                <Text style={s.clearText}>Limpar</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView contentContainerStyle={s.content}>
            <Text style={s.sectionTitle}>Estado</Text>
            <View style={s.chipGrid}>
              {ALL_STATUSES.map((status) => {
                const active = activeStatuses.includes(status);
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      s.chip,
                      active && {
                        backgroundColor: colours[status].bg,
                        borderColor: colours[status].bg,
                      },
                    ]}
                    onPress={() => onToggleStatus(status)}
                  >
                    <Text style={[s.chipText, active && { color: colours[status].text }]}>
                      {STATUS_LABELS[status]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.sectionTitle}>Pessoa</Text>
            <View style={s.chipGrid}>
              {profiles
                .filter((p) => p.status !== 'inactive')
                .map((p) => {
                  const active = activeProfiles.includes(p.id);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[s.chip, active && s.chipActive]}
                      onPress={() => onToggleProfile(p.id)}
                    >
                      <Text style={[s.chipText, active && s.chipTextActive]}>{p.displayName}</Text>
                    </TouchableOpacity>
                  );
                })}
            </View>

            {categories.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Categoria</Text>
                <View style={s.chipGrid}>
                  {categories
                    .filter((c) => c.active)
                    .map((c) => {
                      const active = activeCategories.includes(c.id);
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[s.chip, active && s.chipActive]}
                          onPress={() => onToggleCategory(c.id)}
                        >
                          <Text style={[s.chipText, active && s.chipTextActive]}>{c.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </>
            )}

            {tags.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Etiqueta</Text>
                <View style={s.chipGrid}>
                  {tags.map((t) => {
                    const active = activeTags.includes(t.id);
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[s.chip, active && { backgroundColor: t.color, borderColor: t.color }]}
                        onPress={() => onToggleTag(t.id)}
                      >
                        <Icon source={t.icon} size={14} color={active ? '#FFFFFF' : t.color} />
                        <Text style={[s.chipText, active && s.chipTextActive]}>{t.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          <TouchableOpacity style={s.applyBtn} onPress={onClose}>
            <Text style={s.applyBtnText}>
              Ver {filteredCount} {filteredCount === 1 ? 'item' : 'itens'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  overlayTouch: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    width: 300,
    backgroundColor: '#FFFFFF',
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  clearText: { fontSize: 14, color: '#B5451B', fontWeight: '500' },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 10,
    marginTop: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
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
  },
  chipActive: { backgroundColor: '#B5451B', borderColor: '#B5451B' },
  chipText: { fontSize: 13, color: '#555555' },
  chipTextActive: { color: '#FFFFFF' },
  applyBtn: {
    margin: 20,
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
