import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { PageHeader } from '../../../components/page-header';
import { useFamily } from '../../../hooks/use-family';
import { useRepository } from '../../../hooks/use-repository';
import { useAuthStore } from '../../../stores/auth.store';
import { countryFlag, countryIso2 } from '../../../utils/countries';
import type { VacationTemplate } from '../../../types/vacation.types';

export default function SelectTemplateScreen() {
  const family = useFamily();
  const vacationTemplateRepository = useRepository('vacationTemplate');
  const { userAccount } = useAuthStore();

  const [templates, setTemplates] = useState<VacationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userAccount?.familyId) return;
    (async () => {
      try {
        const activeTemplates = await vacationTemplateRepository.getVacationTemplates(userAccount.familyId, true);
        setTemplates(activeTemplates);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAccount?.familyId]);

  if (isLoading) {
    return (
      <View style={st.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={st.container}>
      <PageHeader
        title="Selecionar Modelo de Viagem"
        showBack
        familyBannerUri={family?.bannerUrl}
      />
      <ScrollView contentContainerStyle={st.content}>
        {/* Blank trip card */}
        <TouchableOpacity
          style={st.blankCard}
          activeOpacity={0.7}
          onPress={() => router.push('/(app)/(vacations)/create')}
        >
          <Text style={st.blankCardText}>Viagem em branco</Text>
        </TouchableOpacity>

        {/* Template cards */}
        {templates.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={st.card}
            activeOpacity={0.7}
            onPress={() =>
              router.push({ pathname: '/(app)/(vacations)/create', params: { templateId: t.id } })
            }
          >
            <Image
              source={
                t.coverImageUrl
                  ? { uri: t.coverImageUrl }
                  : require('../../../../assets/default-vacation-cover.jpg')
              }
              style={st.cardImage}
            />
            <View style={st.cardOverlay} />
            <View style={st.cardContent}>
              <Text style={st.cardFlag}>{countryFlag(countryIso2(t.countryCode))}</Text>
              <Text style={st.cardTitle} numberOfLines={1}>
                {t.title}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },
  blankCard: {
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blankCardText: { fontSize: 16, fontWeight: '600', color: '#555555' },
  card: {
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cardContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  cardFlag: { fontSize: 28 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', flex: 1 },
});
