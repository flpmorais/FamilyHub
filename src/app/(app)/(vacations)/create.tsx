import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  Switch,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Snackbar, Icon } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { useRepository } from '../../../hooks/use-repository';
import { useAuthStore } from '../../../stores/auth.store';
import { useFamily } from '../../../hooks/use-family';
import { logger } from '../../../utils/logger';
import { compressAvatar } from '../../../utils/image.utils';
import { COUNTRIES, countryFlag, countryIso2, findCountry } from '../../../utils/countries';
import { formatDatePt } from '../../../utils/vacation.utils';
import { PageHeader } from '../../../components/page-header';
import type { Vacation } from '../../../types/vacation.types';
import type { Profile } from '../../../types/profile.types';
import type { Tag } from '../../../types/packing.types';

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function CreateVacationScreen() {
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();
  const family = useFamily();
  const vacationRepository = useRepository('vacation');
  const profileRepository = useRepository('profile');
  const tagRepository = useRepository('tag');
  const templateRepository = useRepository('template');
  const taskTemplateRepository = useRepository('taskTemplate');
  const vacationTemplateRepository = useRepository('vacationTemplate');
  const { userAccount } = useAuthStore();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCountryCode, setFormCountryCode] = useState('PRT');
  const [formDeparture, setFormDeparture] = useState(new Date());
  const [formReturn, setFormReturn] = useState(new Date());
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [showReturnPicker, setShowReturnPicker] = useState(false);
  const [formParticipants, setFormParticipants] = useState<Set<string>>(new Set());
  const [formTags, setFormTags] = useState<Set<string>>(new Set());
  const [formPinned, setFormPinned] = useState(true);
  const [pendingCoverUri, setPendingCoverUri] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Country picker
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  useEffect(() => {
    if (!userAccount?.familyId) return;
    (async () => {
      try {
        const [profList, tagList] = await Promise.all([
          profileRepository.getProfilesByFamily(userAccount.familyId),
          tagRepository.getTags(userAccount.familyId),
        ]);
        setProfiles(profList);
        setTags(tagList.filter((t) => t.active));

        if (templateId) {
          // Load template and pre-fill
          const allTemplates = await vacationTemplateRepository.getVacationTemplates(
            userAccount.familyId
          );
          const tpl = allTemplates.find((t) => t.id === templateId);
          if (tpl) {
            setFormTitle(tpl.title);
            setFormCountryCode(tpl.countryCode);
            if (tpl.coverImageUrl) setExistingCoverUrl(tpl.coverImageUrl);
            if (tpl.participantProfileIds.length > 0) {
              setFormParticipants(new Set(tpl.participantProfileIds));
            } else {
              // Default: all active profiles
              setFormParticipants(
                new Set(profList.filter((p) => p.status !== 'inactive').map((p) => p.id))
              );
            }
            if (tpl.tagIds.length > 0) {
              setFormTags(new Set(tpl.tagIds));
            }
          } else {
            // Template not found — default to blank
            setFormParticipants(
              new Set(profList.filter((p) => p.status !== 'inactive').map((p) => p.id))
            );
          }
        } else {
          // Blank — pre-select all active profiles
          setFormParticipants(
            new Set(profList.filter((p) => p.status !== 'inactive').map((p) => p.id))
          );
        }
      } catch (err) {
        logger.error('CreateVacationScreen', 'loadData failed', err);
        setFieldErrors({
          general: err instanceof Error ? err.message : 'Erro ao carregar dados.',
        });
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAccount?.familyId, templateId]);

  function toggleParticipant(profileId: string) {
    setFormParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }

  function toggleTag(tagId: string) {
    setFormTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }

  function onDepartureChange(_: DateTimePickerEvent, date?: Date) {
    setShowDeparturePicker(Platform.OS === 'ios');
    if (date) setFormDeparture(date);
  }

  function onReturnChange(_: DateTimePickerEvent, date?: Date) {
    setShowReturnPicker(Platform.OS === 'ios');
    if (date) setFormReturn(date);
  }

  async function handlePickCover() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFieldErrors({ general: 'Permissao para aceder a galeria negada.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setPendingCoverUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    const title = formTitle.trim();
    const errors: Record<string, string> = {};
    if (!title) errors.title = 'O nome e obrigatorio.';
    if (!formCountryCode) errors.country = 'Selecione um pais.';
    if (formDeparture > formReturn) errors.dates = 'Partida deve ser anterior ao regresso.';
    if (formParticipants.size === 0) errors.participants = 'Selecione pelo menos um participante.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    try {
      const participantIds = [...formParticipants];
      const tagIds = [...formTags];
      const created = await vacationRepository.createVacation({
        title,
        countryCode: formCountryCode,
        destination: null,
        departureDate: toISODate(formDeparture),
        returnDate: toISODate(formReturn),
        familyId: userAccount!.familyId,
        participantProfileIds: participantIds,
        tagIds,
      });

      // Apply templates — inject matching packing items
      const injectedCount = await templateRepository.applyTemplates(
        userAccount!.familyId,
        created.id,
        participantIds,
        tagIds
      );
      if (injectedCount > 0) {
        logger.info(
          'CreateVacationScreen',
          `Template application injected ${injectedCount} packing items`
        );
      }

      // Apply task templates — inject matching booking tasks
      logger.info(
        'CreateVacationScreen',
        `applyTaskTemplates params: tagIds=${JSON.stringify(tagIds)}, participants=${participantIds.length}`
      );
      try {
        const injectedTaskCount = await taskTemplateRepository.applyTaskTemplates(
          userAccount!.familyId,
          created.id,
          toISODate(formDeparture),
          participantIds,
          tagIds
        );
        logger.info(
          'CreateVacationScreen',
          `Task template application: ${injectedTaskCount} tasks injected`
        );
      } catch (taskErr) {
        logger.error('CreateVacationScreen', 'Task template application FAILED', taskErr);
      }

      // Handle cover image
      let coverImageUrl: string | undefined;
      if (pendingCoverUri) {
        const compressedUri = await compressAvatar(pendingCoverUri);
        coverImageUrl = await vacationRepository.uploadCoverImage(
          created.id,
          userAccount!.familyId,
          compressedUri
        );
      } else if (existingCoverUrl) {
        coverImageUrl = existingCoverUrl;
      }

      if (coverImageUrl || formPinned) {
        const updates: Partial<Vacation> = {};
        if (coverImageUrl) updates.coverImageUrl = coverImageUrl;
        if (formPinned) updates.isPinned = true;
        await vacationRepository.updateVacation(created.id, updates);
      }

      router.replace(`/(app)/(vacations)/${created.id}`);
    } catch (err) {
      logger.error('CreateVacationScreen', 'handleSave failed', err);
      setFieldErrors({ general: err instanceof Error ? err.message : 'Erro ao guardar viagem.' });
    } finally {
      setIsSaving(false);
    }
  }

  const filteredCountries = countrySearch.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
          c.id.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : COUNTRIES;

  const coverPreviewUri = pendingCoverUri ?? existingCoverUrl;

  if (isLoading) {
    return (
      <View style={st.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={st.container}>
      <PageHeader title="Nova Viagem" showBack familyBannerUri={family?.bannerUrl} />
      <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
        {fieldErrors.general ? <Text style={st.error}>{fieldErrors.general}</Text> : null}

        <Text style={st.label}>Nome *</Text>
        <TextInput
          style={st.input}
          value={formTitle}
          onChangeText={setFormTitle}
          placeholder="ex: Ferias Algarve 2026"
          autoCapitalize="sentences"
          editable={!isSaving}
        />

        <Text style={st.label}>Pais *</Text>
        <TouchableOpacity
          style={st.countryButton}
          onPress={() => {
            setCountrySearch('');
            setCountryPickerVisible(true);
          }}
          disabled={isSaving}
        >
          <Text style={st.countryButtonFlag}>{countryFlag(countryIso2(formCountryCode))}</Text>
          <Text style={st.countryButtonText}>
            {findCountry(formCountryCode)?.name ?? formCountryCode}
          </Text>
        </TouchableOpacity>

        <Text style={st.label}>Foto de capa</Text>
        {coverPreviewUri ? (
          <TouchableOpacity onPress={handlePickCover} disabled={isSaving} activeOpacity={0.8}>
            <Image source={{ uri: coverPreviewUri }} style={st.coverPreview} />
            <Text style={st.coverChangeHint}>Tocar para alterar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={st.coverBtn} onPress={handlePickCover} disabled={isSaving}>
            <Text style={st.coverBtnText}>Escolher imagem</Text>
          </TouchableOpacity>
        )}

        <View style={st.dateRow}>
          <View style={st.dateCol}>
            <Text style={st.label}>Partida *</Text>
            <TouchableOpacity
              style={st.dateButton}
              onPress={() => setShowDeparturePicker(true)}
              disabled={isSaving}
            >
              <Text style={st.dateButtonText}>{formatDatePt(toISODate(formDeparture))}</Text>
            </TouchableOpacity>
            {showDeparturePicker && (
              <DateTimePicker
                value={formDeparture}
                mode="date"
                display="default"
                onChange={onDepartureChange}
              />
            )}
          </View>
          <View style={st.dateCol}>
            <Text style={st.label}>Regresso *</Text>
            <TouchableOpacity
              style={st.dateButton}
              onPress={() => setShowReturnPicker(true)}
              disabled={isSaving}
            >
              <Text style={st.dateButtonText}>{formatDatePt(toISODate(formReturn))}</Text>
            </TouchableOpacity>
            {showReturnPicker && (
              <DateTimePicker
                value={formReturn}
                mode="date"
                display="default"
                onChange={onReturnChange}
              />
            )}
          </View>
        </View>

        <Text style={st.label}>Participantes *</Text>
        {fieldErrors.participants ? (
          <Text style={st.fieldError}>{fieldErrors.participants}</Text>
        ) : null}
        <View style={st.participantList}>
          {profiles
            .filter((p) => p.status !== 'inactive')
            .map((p) => {
              const selected = formParticipants.has(p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[st.participantRow, selected && st.participantSelected]}
                  onPress={() => toggleParticipant(p.id)}
                  disabled={isSaving}
                >
                  <Text style={st.participantCheck}>{selected ? '\u2611' : '\u2610'}</Text>
                  <Text style={st.participantName}>{p.displayName}</Text>
                </TouchableOpacity>
              );
            })}
        </View>

        {tags.length > 0 && (
          <>
            <Text style={st.label}>Etiquetas da viagem</Text>
            <View style={st.tagWrap}>
              {tags.map((t) => {
                const selected = formTags.has(t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[st.chip, selected && st.chipActive]}
                    onPress={() => toggleTag(t.id)}
                    disabled={isSaving}
                  >
                    <Icon source={t.icon} size={14} color={selected ? '#FFFFFF' : t.color} />
                    <Text style={[st.chipText, selected && st.chipTextActive]}>{t.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <View style={st.pinRow}>
          <Text style={st.pinLabel}>Fixar no dashboard</Text>
          <Switch
            value={formPinned}
            onValueChange={setFormPinned}
            trackColor={{ true: '#B5451B' }}
            disabled={isSaving}
          />
        </View>

        {fieldErrors.title ? <Text style={st.fieldError}>{fieldErrors.title}</Text> : null}
        {fieldErrors.country ? <Text style={st.fieldError}>{fieldErrors.country}</Text> : null}
        {fieldErrors.dates ? <Text style={st.fieldError}>{fieldErrors.dates}</Text> : null}

        <View style={st.buttonRow}>
          <TouchableOpacity
            style={st.cancelButton}
            onPress={() => router.back()}
            disabled={isSaving}
          >
            <Text style={st.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.saveButton, isSaving && st.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={st.saveButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Country picker modal */}
      <Modal
        visible={countryPickerVisible}
        animationType="slide"
        onRequestClose={() => setCountryPickerVisible(false)}
      >
        <View style={st.countryPickerContainer}>
          <View style={st.countryPickerHeader}>
            <Text style={st.countryPickerTitle}>Selecionar pais</Text>
            <TouchableOpacity onPress={() => setCountryPickerVisible(false)}>
              <Text style={st.countryPickerClose}>Fechar</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={st.countrySearchInput}
            value={countrySearch}
            onChangeText={setCountrySearch}
            placeholder="Pesquisar..."
            autoCapitalize="none"
            autoCorrect={false}
          />
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[st.countryRow, item.id === formCountryCode && st.countryRowSelected]}
                onPress={() => {
                  setFormCountryCode(item.id);
                  setCountryPickerVisible(false);
                  setCountrySearch('');
                }}
              >
                <Text style={st.countryRowFlag}>{countryFlag(item.iso2)}</Text>
                <Text style={st.countryRowName}>{item.name}</Text>
                <Text style={st.countryRowCode}>{item.id}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24, paddingBottom: 80 },
  error: { color: '#D32F2F', marginBottom: 12, fontSize: 14 },
  fieldError: { color: '#D32F2F', fontSize: 12, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#555555', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  countryButtonFlag: { fontSize: 22, marginRight: 10 },
  countryButtonText: { fontSize: 15, color: '#1A1A1A', flex: 1 },
  coverBtn: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  coverBtnText: { fontSize: 14, color: '#B5451B', fontWeight: '500' },
  coverPreview: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 4,
  },
  coverChangeHint: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 16,
  },
  dateRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dateCol: { flex: 1 },
  dateButton: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dateButtonText: { fontSize: 15, color: '#1A1A1A' },
  participantList: { marginBottom: 16, gap: 4 },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  participantSelected: { borderColor: '#B5451B', backgroundColor: '#FFF0EB' },
  participantCheck: { fontSize: 18, marginRight: 10, color: '#B5451B' },
  participantName: { fontSize: 15, color: '#1A1A1A' },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 4,
  },
  pinLabel: { fontSize: 15, color: '#1A1A1A' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
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
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  // Country picker
  countryPickerContainer: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: 48 },
  countryPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  countryPickerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  countryPickerClose: { fontSize: 16, color: '#B5451B', fontWeight: '600' },
  countrySearchInput: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  countryRowSelected: { backgroundColor: '#FFF0EB' },
  countryRowFlag: { fontSize: 22, marginRight: 12 },
  countryRowName: { fontSize: 15, color: '#1A1A1A', flex: 1 },
  countryRowCode: { fontSize: 13, color: '#AAAAAA' },
});
