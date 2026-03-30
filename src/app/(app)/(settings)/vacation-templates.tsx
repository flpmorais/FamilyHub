import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Switch,
  Image,
} from 'react-native';
import { Icon, Snackbar } from 'react-native-paper';
import { router } from 'expo-router';
import { PageHeader } from '../../../components/page-header';
import { useFamily } from '../../../hooks/use-family';
import { useRepository } from '../../../hooks/use-repository';
import { useAuthStore } from '../../../stores/auth.store';
import { logger } from '../../../utils/logger';
import { countryFlag, countryIso2 } from '../../../utils/countries';
import type { VacationTemplate } from '../../../types/vacation.types';
import type { Tag } from '../../../types/packing.types';

export default function VacationTemplatesScreen() {
  const family = useFamily();
  const vacationTemplateRepo = useRepository('vacationTemplate');
  const tagRepo = useRepository('tag');
  const { userAccount } = useAuthStore();

  const [templates, setTemplates] = useState<VacationTemplate[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);
  const [filterActiveOnly, setFilterActiveOnly] = useState(true);
  const [filterSearch, setFilterSearch] = useState('');

  // Success toast
  const [successMsg, setSuccessMsg] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);

  async function loadAll() {
    if (!userAccount?.familyId) return;
    try {
      const [templateList, tagList] = await Promise.all([
        vacationTemplateRepo.getVacationTemplates(userAccount.familyId),
        tagRepo.getTags(userAccount.familyId),
      ]);
      setTemplates(templateList);
      setTags(tagList.filter((t: Tag) => t.active));
    } catch (err) {
      logger.error('VacationTemplatesScreen', 'load failed', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Filters ---
  const filterCount = (filterActiveOnly ? 0 : 1) + (filterSearch ? 1 : 0);

  const filteredTemplates = templates.filter((t) => {
    if (filterActiveOnly && !t.active) return false;
    if (filterSearch && !t.title.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  if (isLoading) {
    return <View style={s.centered}><ActivityIndicator /></View>;
  }

  return (
    <View style={s.container}>
      <PageHeader title="Modelos de Viagens" showBack familyBannerUri={family?.bannerUrl} />
      <ScrollView contentContainerStyle={s.content}>
        {filteredTemplates.length === 0 && templates.length === 0 && (
          <Text style={s.empty}>Crie o seu primeiro modelo de viagem.</Text>
        )}
        {filteredTemplates.length === 0 && templates.length > 0 && (
          <Text style={s.empty}>Nenhum modelo encontrado com os filtros actuais.</Text>
        )}

        {filteredTemplates.map((template) => {
          const flag = countryFlag(countryIso2(template.countryCode));
          return (
            <TouchableOpacity
              key={template.id}
              style={s.card}
              onPress={() =>
                router.push({
                  pathname: '/(app)/(settings)/vacation-template-form',
                  params: { id: template.id },
                })
              }
              activeOpacity={0.8}
            >
              {template.coverImageUrl ? (
                <Image source={{ uri: template.coverImageUrl }} style={s.cardImage} />
              ) : (
                <View style={[s.cardImage, s.cardImagePlaceholder]}>
                  <Icon source="image-outline" size={32} color="#CCCCCC" />
                </View>
              )}
              <View style={s.cardOverlay} />
              <View style={s.cardContent}>
                <Text style={s.cardFlag}>{flag}</Text>
                <Text style={s.cardTitle} numberOfLines={1}>{template.title}</Text>
              </View>
              {!template.active && (
                <View style={s.inactiveBadge}>
                  <Text style={s.inactiveBadgeText}>Inactiva</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={s.fabRow}>
        <TouchableOpacity
          style={[s.fab, s.filterFab]}
          onPress={() => setFilterPanelVisible(!filterPanelVisible)}
          activeOpacity={0.8}
        >
          <Icon source="filter-variant" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.fab}
          onPress={() => router.push('/(app)/(settings)/vacation-template-form')}
          activeOpacity={0.8}
        >
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>
      </View>

      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={2000}
        style={s.successSnackbar}
        theme={{ colors: { inverseSurface: '#388E3C', inverseOnSurface: '#FFFFFF' } }}
      >
        {successMsg}
      </Snackbar>

      {/* Filter panel */}
      <Modal
        visible={filterPanelVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterPanelVisible(false)}
      >
        <View style={s.filterOverlay}>
          <TouchableOpacity
            style={s.filterOverlayTouch}
            onPress={() => setFilterPanelVisible(false)}
            activeOpacity={1}
          />
          <View style={s.filterPanel}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.filterPanelHeader}>
                <Text style={s.filterPanelTitle}>Filtros</Text>
                {filterCount > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setFilterActiveOnly(true);
                      setFilterSearch('');
                    }}
                  >
                    <Text style={s.filterPanelClear}>Limpar</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={s.label}>Nome</Text>
              <TextInput
                style={s.input}
                value={filterSearch}
                onChangeText={setFilterSearch}
                placeholder="Pesquisar..."
                autoCapitalize="none"
              />

              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>Apenas activos</Text>
                <Switch
                  value={filterActiveOnly}
                  onValueChange={setFilterActiveOnly}
                  trackColor={{ true: '#B5451B' }}
                />
              </View>

              <TouchableOpacity
                style={s.filterApplyBtn}
                onPress={() => setFilterPanelVisible(false)}
              >
                <Text style={s.filterApplyBtnText}>
                  Ver {filteredTemplates.length} modelo{filteredTemplates.length !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },
  empty: { color: '#888888', textAlign: 'center', marginVertical: 32, paddingHorizontal: 24 },

  // Card
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    height: 100,
    backgroundColor: '#E0E0E0',
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cardContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
  },
  cardFlag: { fontSize: 22 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  inactiveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inactiveBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  // FABs
  fabRow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterFab: { backgroundColor: '#6D6D6D', width: 48, height: 48, borderRadius: 14 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#B5451B',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: { color: '#FFFFFF', fontSize: 28, fontWeight: '400', marginTop: -2 },

  // Snackbar
  successSnackbar: { position: 'absolute', top: 48, backgroundColor: '#388E3C' },

  // Filter panel
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 4,
  },
  toggleLabel: { fontSize: 15, color: '#1A1A1A' },
  filterApplyBtn: {
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  filterApplyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
