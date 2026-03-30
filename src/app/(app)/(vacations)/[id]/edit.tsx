import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Icon, Snackbar } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { useRepository } from '../../../../hooks/use-repository';
import { useAuthStore } from '../../../../stores/auth.store';
import { logger } from '../../../../utils/logger';
import { compressAvatar } from '../../../../utils/image.utils';
import { COUNTRIES, countryFlag, countryIso2, findCountry } from '../../../../utils/countries';
import { formatDatePt } from '../../../../utils/vacation.utils';
import { PageHeader } from '../../../../components/page-header';
import type { Vacation } from '../../../../types/vacation.types';
import type { Profile } from '../../../../types/profile.types';
import type { Category, Tag } from '../../../../types/packing.types';

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function EditVacationScreen() {
  const { id: vacationId } = useLocalSearchParams<{ id: string }>();
  const vacationRepository = useRepository('vacation');
  const profileRepository = useRepository('profile');
  const categoryRepository = useRepository('category');
  const tagRepository = useRepository('tag');
  const { userAccount } = useAuthStore();

  const [vacation, setVacation] = useState<Vacation | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCountryCode, setFormCountryCode] = useState('PRT');
  const [formDeparture, setFormDeparture] = useState(new Date());
  const [formReturn, setFormReturn] = useState(new Date());
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [showReturnPicker, setShowReturnPicker] = useState(false);
  const [formParticipants, setFormParticipants] = useState<Set<string>>(new Set());
  const [formTags, setFormTags] = useState<Set<string>>(new Set());
  const [formPinned, setFormPinned] = useState(false);
  const [pendingCoverUri, setPendingCoverUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successVisible, setSuccessVisible] = useState(false);

  // Country picker
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    if (!vacationId || !userAccount?.familyId) return;
    try {
      const [vacList, profList, catList, tagList] = await Promise.all([
        vacationRepository.getVacations(userAccount.familyId),
        profileRepository.getProfilesByFamily(userAccount.familyId),
        categoryRepository.getCategories(userAccount.familyId),
        tagRepository.getTags(userAccount.familyId),
      ]);
      setProfiles(profList);
      setCategories(catList.filter((c) => c.active));
      setTags(tagList.filter((t) => t.active));
      const vac = vacList.find((v) => v.id === vacationId);
      if (vac) {
        setVacation(vac);
        setFormTitle(vac.title);
        setFormCountryCode(vac.countryCode);
        setFormDeparture(new Date(vac.departureDate + 'T00:00:00'));
        setFormReturn(new Date(vac.returnDate + 'T00:00:00'));
        setFormPinned(vac.isPinned);
        const [parts, vacTags] = await Promise.all([
          vacationRepository.getParticipants(vac.id),
          vacationRepository.getVacationTags(vac.id),
        ]);
        setFormParticipants(new Set(parts.map((p) => p.profileId)));
        setFormTags(new Set(vacTags));
      }
    } catch (err) {
      logger.error('EditVacation', 'loadData failed', err);
    } finally {
      setIsLoading(false);
    }
  }

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
      setFieldErrors({ general: 'Permissão para aceder à galeria negada.' });
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
    if (!title) errors.title = 'O nome é obrigatório.';
    if (!formCountryCode) errors.country = 'Selecione um país.';
    if (formDeparture > formReturn) errors.dates = 'Partida deve ser anterior ao regresso.';
    if (formParticipants.size === 0) errors.participants = 'Selecione pelo menos um participante.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    if (!vacation) return;

    setFieldErrors({});
    setIsSaving(true);
    try {
      let coverImageUrl: string | undefined;
      if (pendingCoverUri) {
        const compressedUri = await compressAvatar(pendingCoverUri);
        coverImageUrl = await vacationRepository.uploadCoverImage(
          vacation.id,
          userAccount!.familyId,
          compressedUri
        );
      }

      const updates: Partial<Vacation> = {
        title,
        countryCode: formCountryCode,
        departureDate: toISODate(formDeparture),
        returnDate: toISODate(formReturn),
        isPinned: formPinned,
      };
      if (coverImageUrl) updates.coverImageUrl = coverImageUrl;
      await vacationRepository.updateVacation(vacation.id, updates, [...formParticipants], [...formTags]);
      setSuccessVisible(true);
      setTimeout(() => router.back(), 600);
    } catch (err) {
      logger.error('EditVacation', 'handleSave failed', err);
      setFieldErrors({ general: err instanceof Error ? err.message : 'Erro ao guardar viagem.' });
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDelete() {
    if (!vacation) return;
    Alert.alert('Eliminar viagem', `Eliminar "${vacation.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await vacationRepository.deleteVacation(vacation.id);
            router.replace('/(app)/(vacations)');
          } catch (err) {
            logger.error('EditVacation', 'delete failed', err);
          }
        },
      },
    ]);
  }

  // Country picker
  const filteredCountries = countrySearch.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
          c.id.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : COUNTRIES;

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!vacation) {
    return (
      <View style={s.centered}>
        <Text style={{ color: '#888', marginBottom: 16 }}>Viagem não encontrada.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#B5451B', fontSize: 16 }}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <PageHeader
        title={vacation?.title ?? 'Editar viagem'}
        subtitle={vacation ? `${formatDatePt(vacation.departureDate)} — ${formatDatePt(vacation.returnDate)}` : undefined}
        imageUri={vacation?.coverImageUrl}
        showBack
      />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Nome *</Text>
        <TextInput
          style={[s.input, fieldErrors.title && s.inputError]}
          value={formTitle}
          onChangeText={(t) => {
            setFormTitle(t);
            setFieldErrors((e) => ({ ...e, title: '' }));
          }}
          placeholder="ex: Férias Algarve 2026"
          autoCapitalize="sentences"
          editable={!isSaving}
        />
        {fieldErrors.title ? <Text style={s.fieldError}>{fieldErrors.title}</Text> : null}

        <Text style={s.label}>País *</Text>
        <TouchableOpacity
          style={s.countryButton}
          onPress={() => {
            setCountrySearch('');
            setCountryPickerVisible(true);
          }}
          disabled={isSaving}
        >
          <Text style={s.countryButtonFlag}>{countryFlag(countryIso2(formCountryCode))}</Text>
          <Text style={s.countryButtonText}>
            {findCountry(formCountryCode)?.name ?? formCountryCode}
          </Text>
        </TouchableOpacity>

        {fieldErrors.country ? <Text style={s.fieldError}>{fieldErrors.country}</Text> : null}

        <Text style={s.label}>Foto de capa</Text>
        <TouchableOpacity style={s.coverBtn} onPress={handlePickCover} disabled={isSaving}>
          <Text style={s.coverBtnText}>
            {pendingCoverUri
              ? 'Imagem selecionada ✓'
              : vacation.coverImageUrl
                ? 'Alterar imagem'
                : 'Escolher imagem'}
          </Text>
        </TouchableOpacity>

        <View style={s.dateRow}>
          <View style={s.dateCol}>
            <Text style={s.label}>Partida *</Text>
            <TouchableOpacity
              style={s.dateButton}
              onPress={() => setShowDeparturePicker(true)}
              disabled={isSaving}
            >
              <Text style={s.dateButtonText}>{formatDatePt(toISODate(formDeparture))}</Text>
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
          <View style={s.dateCol}>
            <Text style={s.label}>Regresso *</Text>
            <TouchableOpacity
              style={s.dateButton}
              onPress={() => setShowReturnPicker(true)}
              disabled={isSaving}
            >
              <Text style={s.dateButtonText}>{formatDatePt(toISODate(formReturn))}</Text>
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

        {fieldErrors.dates ? <Text style={s.fieldError}>{fieldErrors.dates}</Text> : null}

        <Text style={s.label}>Participantes *</Text>
        <View style={s.participantList}>
          {profiles
            .filter((p) => p.status !== 'inactive')
            .map((p) => {
              const selected = formParticipants.has(p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[s.participantRow, selected && s.participantSelected]}
                  onPress={() => toggleParticipant(p.id)}
                  disabled={isSaving}
                >
                  <Text style={s.participantCheck}>{selected ? '☑' : '☐'}</Text>
                  <Text style={s.participantName}>{p.displayName}</Text>
                </TouchableOpacity>
              );
            })}
        </View>

        {fieldErrors.participants ? (
          <Text style={s.fieldError}>{fieldErrors.participants}</Text>
        ) : null}

        {tags.length > 0 && (
          <>
            <Text style={s.label}>Etiquetas da viagem</Text>
            <View style={s.tagWrap}>
              {tags.map((t) => {
                const selected = formTags.has(t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[s.chip, selected && s.chipActive]}
                    onPress={() => toggleTag(t.id)}
                    disabled={isSaving}
                  >
                    <Icon source={t.icon} size={14} color={selected ? '#FFFFFF' : t.color} />
                    <Text style={[s.chipText, selected && s.chipTextActive]}>{t.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <View style={s.pinRow}>
          <Text style={s.pinLabel}>Fixar no dashboard</Text>
          <Switch
            value={formPinned}
            onValueChange={setFormPinned}
            trackColor={{ true: '#B5451B' }}
            disabled={isSaving}
          />
        </View>

        {fieldErrors.general ? <Text style={s.error}>{fieldErrors.general}</Text> : null}

        <View style={s.buttons}>
          <TouchableOpacity style={s.deleteBtn} onPress={confirmDelete} disabled={isSaving}>
            <Text style={s.deleteText}>Eliminar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, isSaving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={s.saveText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={2000}
        style={s.successSnackbar}
        theme={{ colors: { inverseSurface: '#388E3C', inverseOnSurface: '#FFFFFF' } }}
      >
        Viagem actualizada
      </Snackbar>

      {/* Country picker */}
      <Modal
        visible={countryPickerVisible}
        animationType="slide"
        onRequestClose={() => setCountryPickerVisible(false)}
      >
        <View style={s.countryPickerContainer}>
          <View style={s.countryPickerHeader}>
            <Text style={s.countryPickerTitle}>Selecionar país</Text>
            <TouchableOpacity onPress={() => setCountryPickerVisible(false)}>
              <Text style={s.countryPickerClose}>Fechar</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.countrySearchInput}
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
                style={[s.countryRow, item.id === formCountryCode && s.countryRowSelected]}
                onPress={() => {
                  setFormCountryCode(item.id);
                  setCountryPickerVisible(false);
                  setCountrySearch('');
                }}
              >
                <Text style={s.countryRowFlag}>{countryFlag(item.iso2)}</Text>
                <Text style={s.countryRowName}>{item.name}</Text>
                <Text style={s.countryRowCode}>{item.id}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#B5451B', fontSize: 16 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 24, color: '#1A1A1A' },
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
  error: { color: '#D32F2F', marginBottom: 12, fontSize: 14 },
  inputError: { borderColor: '#D32F2F' },
  fieldError: { color: '#D32F2F', fontSize: 12, marginTop: -12, marginBottom: 12 },
  successSnackbar: { position: 'absolute', top: 48, backgroundColor: '#388E3C' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  deleteBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D32F2F',
    alignItems: 'center',
  },
  deleteText: { color: '#D32F2F', fontSize: 14, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
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
});
