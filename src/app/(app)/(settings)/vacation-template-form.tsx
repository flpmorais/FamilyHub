import { useEffect, useState } from "react";
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
  Switch,
  Image,
  Alert,
} from "react-native";
import { Icon, Snackbar } from "react-native-paper";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { PageHeader } from "../../../components/page-header";
import { useFamily } from "../../../hooks/use-family";
import { useRepository } from "../../../hooks/use-repository";
import { useAuthStore } from "../../../stores/auth.store";
import { logger } from "../../../utils/logger";
import { compressAvatar } from "../../../utils/image.utils";
import {
  COUNTRIES,
  countryFlag,
  countryIso2,
  findCountry,
} from "../../../utils/countries";
import { useModalKeyboardScroll } from "../../../hooks/use-modal-keyboard-scroll";
import type {
  VacationTemplate,
  VacationTemplateBag,
} from "../../../types/vacation.types";
import type { Tag, BagTemplate } from "../../../types/packing.types";
import type { Profile } from "../../../types/profile.types";

export default function VacationTemplateFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const family = useFamily();
  const vacationTemplateRepo = useRepository("vacationTemplate");
  const profileRepository = useRepository("profile");
  const tagRepository = useRepository("tag");
  const bagTemplateRepo = useRepository("bagTemplate");
  const { userAccount } = useAuthStore();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allBags, setAllBags] = useState<BagTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formCountryCode, setFormCountryCode] = useState("PRT");
  const [formParticipants, setFormParticipants] = useState<Set<string>>(
    new Set(),
  );
  const [formTags, setFormTags] = useState<Set<string>>(new Set());
  const [formActive, setFormActive] = useState(true);
  const [formBags, setFormBags] = useState<VacationTemplateBag[]>([]);
  const [pendingCoverUri, setPendingCoverUri] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);

  // Bag picker
  const [bagPickerVisible, setBagPickerVisible] = useState(false);

  // Country picker
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  // Existing template reference for edit
  const [existingTemplate, setExistingTemplate] =
    useState<VacationTemplate | null>(null);

  const { keyboardHeight, scrollViewRef, getInputProps } =
    useModalKeyboardScroll({
      inputKeys: ["formTitle", "countrySearch"],
    });

  async function loadData() {
    if (!userAccount?.familyId) return;
    setIsLoading(true);
    try {
      const [profList, tagList, bagList] = await Promise.all([
        profileRepository.getProfilesByFamily(userAccount.familyId),
        tagRepository.getTags(userAccount.familyId),
        bagTemplateRepo.getBagTemplates(userAccount.familyId),
      ]);
      setProfiles(profList);
      setTags(tagList.filter((t) => t.active));
      setAllBags(bagList);

      if (isEdit && id) {
        const templates = await vacationTemplateRepo.getVacationTemplates(
          userAccount.familyId,
        );
        const tpl = templates.find((t) => t.id === id);
        if (tpl) {
          setExistingTemplate(tpl);
          setFormTitle(tpl.title);
          setFormCountryCode(tpl.countryCode);
          setFormParticipants(new Set(tpl.participantProfileIds));
          setFormTags(new Set(tpl.tagIds));
          setFormActive(tpl.active);
          setFormBags(tpl.bags);
          setExistingCoverUrl(tpl.coverImageUrl);
        }
      } else {
        // Pre-select all active profiles for create
        setFormParticipants(
          new Set(
            profList.filter((p) => p.status !== "inactive").map((p) => p.id),
          ),
        );
      }
    } catch (err) {
      logger.error("VacationTemplateForm", "loadData failed", err);
      setFieldErrors({
        general: err instanceof Error ? err.message : "Erro ao carregar dados.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function addBag(bag: BagTemplate) {
    setFormBags((prev) => [
      ...prev,
      { bagTemplateId: bag.id, isTopLevel: bag.isTopLevel },
    ]);
    setBagPickerVisible(false);
  }

  function removeBag(bagTemplateId: string) {
    setFormBags((prev) =>
      prev.filter((b) => b.bagTemplateId !== bagTemplateId),
    );
  }

  function toggleBagTopLevel(bagTemplateId: string) {
    setFormBags((prev) =>
      prev.map((b) =>
        b.bagTemplateId === bagTemplateId
          ? { ...b, isTopLevel: !b.isTopLevel }
          : b,
      ),
    );
  }

  const addedBagIds = new Set(formBags.map((b) => b.bagTemplateId));
  const availableBags = allBags.filter(
    (b) => b.active && !addedBagIds.has(b.id),
  );
  const bagsMap = new Map(allBags.map((b) => [b.id, b]));

  async function handlePickCover() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFieldErrors({ general: "Permissao para aceder a galeria negada." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
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
    if (!title) errors.title = "O nome e obrigatorio.";
    if (!formCountryCode) errors.country = "Selecione um pais.";
    if (formParticipants.size === 0)
      errors.participants = "Selecione pelo menos um participante.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    try {
      const participantIds = [...formParticipants];
      const tagIds = [...formTags];

      if (isEdit && id) {
        // Update template
        let coverImageUrl = existingCoverUrl;

        if (pendingCoverUri) {
          const compressedUri = await compressAvatar(pendingCoverUri);
          coverImageUrl = await vacationTemplateRepo.uploadCoverImage(
            id,
            userAccount!.familyId,
            compressedUri,
          );
        }

        await vacationTemplateRepo.updateVacationTemplate(
          id,
          {
            title,
            countryCode: formCountryCode,
            active: formActive,
            ...(coverImageUrl !== existingCoverUrl ? { coverImageUrl } : {}),
          },
          participantIds,
          tagIds,
          formBags,
        );

        setSuccessMessage("Modelo atualizado");
      } else {
        // Create template
        const created = await vacationTemplateRepo.createVacationTemplate({
          title,
          countryCode: formCountryCode,
          familyId: userAccount!.familyId,
          participantProfileIds: participantIds,
          tagIds,
          bags: formBags,
        });

        let coverImageUrl: string | undefined;
        if (pendingCoverUri) {
          const compressedUri = await compressAvatar(pendingCoverUri);
          coverImageUrl = await vacationTemplateRepo.uploadCoverImage(
            created.id,
            userAccount!.familyId,
            compressedUri,
          );
        }

        if (coverImageUrl || !formActive) {
          const updates: Partial<VacationTemplate> = {};
          if (coverImageUrl) updates.coverImageUrl = coverImageUrl;
          if (!formActive) updates.active = false;
          await vacationTemplateRepo.updateVacationTemplate(
            created.id,
            updates,
          );
        }

        setSuccessMessage("Modelo criado");
      }

      setSuccessVisible(true);
      setTimeout(() => router.back(), 600);
    } catch (err) {
      logger.error("VacationTemplateForm", "handleSave failed", err);
      setFieldErrors({
        general: err instanceof Error ? err.message : "Erro ao guardar modelo.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete() {
    if (!id) return;
    Alert.alert(
      "Eliminar modelo",
      "Tem a certeza que deseja eliminar este modelo de viagem? Esta acao nao pode ser revertida.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await vacationTemplateRepo.deleteVacationTemplate(id);
              setSuccessMessage("Modelo eliminado");
              setSuccessVisible(true);
              setTimeout(() => router.back(), 600);
            } catch (err) {
              logger.error("VacationTemplateForm", "handleDelete failed", err);
              setFieldErrors({
                general:
                  err instanceof Error
                    ? err.message
                    : "Erro ao eliminar modelo.",
              });
            }
          },
        },
      ],
    );
  }

  const filteredCountries = countrySearch.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
          c.id.toLowerCase().includes(countrySearch.toLowerCase()),
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
      <PageHeader
        title={isEdit ? "Editar Modelo de Viagem" : "Novo Modelo de Viagem"}
        showBack
        familyBannerUri={family?.bannerUrl}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          st.scrollContent,
          { paddingBottom: keyboardHeight },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {fieldErrors.general && (
          <Text style={st.error}>{fieldErrors.general}</Text>
        )}

        <Text style={st.label}>Nome *</Text>
        <TextInput
          {...getInputProps("formTitle")}
          style={st.input}
          value={formTitle}
          onChangeText={setFormTitle}
          placeholder="ex: Ferias Praia"
          autoCapitalize="sentences"
          editable={!isSaving}
        />
        {fieldErrors.title && (
          <Text style={st.fieldError}>{fieldErrors.title}</Text>
        )}

        <Text style={st.label}>Pais *</Text>
        <TouchableOpacity
          style={st.countryButton}
          onPress={() => {
            setCountrySearch("");
            setCountryPickerVisible(true);
          }}
          disabled={isSaving}
        >
          <Text style={st.countryButtonFlag}>
            {countryFlag(countryIso2(formCountryCode))}
          </Text>
          <Text style={st.countryButtonText}>
            {findCountry(formCountryCode)?.name ?? formCountryCode}
          </Text>
        </TouchableOpacity>
        {fieldErrors.country && (
          <Text style={st.fieldError}>{fieldErrors.country}</Text>
        )}

        <Text style={st.label}>Foto de capa</Text>
        {coverPreviewUri && (
          <Image
            source={{ uri: coverPreviewUri }}
            style={st.coverPreview}
            resizeMode="cover"
          />
        )}
        <TouchableOpacity
          style={st.coverBtn}
          onPress={handlePickCover}
          disabled={isSaving}
        >
          <Text style={st.coverBtnText}>
            {coverPreviewUri ? "Alterar imagem" : "Escolher imagem"}
          </Text>
        </TouchableOpacity>

        <Text style={st.label}>Participantes *</Text>
        <View style={st.participantList}>
          {profiles
            .filter((p) => p.status !== "inactive")
            .map((p) => {
              const selected = formParticipants.has(p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    st.participantRow,
                    selected && st.participantSelected,
                  ]}
                  onPress={() => toggleParticipant(p.id)}
                  disabled={isSaving}
                >
                  <Text style={st.participantCheck}>
                    {selected ? "\u2611" : "\u2610"}
                  </Text>
                  <Text style={st.participantName}>{p.displayName}</Text>
                </TouchableOpacity>
              );
            })}
        </View>
        {fieldErrors.participants && (
          <Text style={st.fieldError}>{fieldErrors.participants}</Text>
        )}

        {tags.length > 0 && (
          <>
            <Text style={st.label}>Etiquetas</Text>
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
                    <Icon
                      source={t.icon}
                      size={14}
                      color={selected ? "#FFFFFF" : t.color}
                    />
                    <Text style={[st.chipText, selected && st.chipTextActive]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <Text style={st.label}>Malas</Text>
        {formBags.length === 0 ? (
          <Text style={st.emptyBagsText}>Nenhuma mala adicionada.</Text>
        ) : (
          <View style={st.bagList}>
            {formBags.map((fb) => {
              const bag = bagsMap.get(fb.bagTemplateId);
              if (!bag) return null;
              return (
                <View key={fb.bagTemplateId} style={st.bagRow}>
                  <View
                    style={[st.bagColorDot, { backgroundColor: bag.color }]}
                  />
                  <View style={st.bagInfo}>
                    <Text style={st.bagName}>{bag.name}</Text>
                    <Text style={st.bagMeta}>{bag.sizeLiters}L</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      st.bagTopLevelChip,
                      fb.isTopLevel && st.bagTopLevelChipActive,
                    ]}
                    onPress={() => toggleBagTopLevel(fb.bagTemplateId)}
                    disabled={isSaving}
                  >
                    <Text
                      style={[
                        st.bagTopLevelText,
                        fb.isTopLevel && st.bagTopLevelTextActive,
                      ]}
                    >
                      {fb.isTopLevel ? "Principal" : "Interna"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeBag(fb.bagTemplateId)}
                    disabled={isSaving}
                  >
                    <Icon source="close-circle" size={20} color="#D32F2F" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
        {availableBags.length > 0 && (
          <TouchableOpacity
            style={st.addBagBtn}
            onPress={() => setBagPickerVisible(true)}
            disabled={isSaving}
          >
            <Icon source="plus" size={16} color="#B5451B" />
            <Text style={st.addBagBtnText}>Adicionar mala</Text>
          </TouchableOpacity>
        )}

        <View style={st.activeRow}>
          <Text style={st.activeLabel}>Modelo ativo</Text>
          <Switch
            value={formActive}
            onValueChange={setFormActive}
            trackColor={{ true: "#B5451B" }}
            disabled={isSaving}
          />
        </View>

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

        {isEdit && (
          <TouchableOpacity
            style={st.deleteButton}
            onPress={handleDelete}
            disabled={isSaving}
          >
            <Text style={st.deleteButtonText}>Eliminar modelo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Snackbar
        visible={successVisible}
        onDismiss={() => setSuccessVisible(false)}
        duration={2000}
        style={st.successSnackbar}
        theme={{
          colors: { inverseSurface: "#388E3C", inverseOnSurface: "#FFFFFF" },
        }}
      >
        {successMessage}
      </Snackbar>

      {/* Country picker */}
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
                style={[
                  st.countryRow,
                  item.id === formCountryCode && st.countryRowSelected,
                ]}
                onPress={() => {
                  setFormCountryCode(item.id);
                  setCountryPickerVisible(false);
                  setCountrySearch("");
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

      {/* Bag picker */}
      <Modal
        visible={bagPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBagPickerVisible(false)}
      >
        <View style={st.bagPickerOverlay}>
          <TouchableOpacity
            style={st.bagPickerOverlayTouch}
            activeOpacity={1}
            onPress={() => setBagPickerVisible(false)}
          />
          <View style={st.bagPickerSheet}>
            <Text style={st.bagPickerTitle}>Adicionar mala</Text>
            {availableBags.length === 0 ? (
              <Text style={st.emptyBagsText}>
                Todas as malas já foram adicionadas.
              </Text>
            ) : (
              <FlatList
                data={availableBags}
                keyExtractor={(item) => item.id}
                renderItem={({ item: bag }) => (
                  <TouchableOpacity
                    style={st.bagPickerRow}
                    onPress={() => addBag(bag)}
                  >
                    <View
                      style={[st.bagColorDot, { backgroundColor: bag.color }]}
                    />
                    <Text style={st.bagPickerName}>{bag.name}</Text>
                    <Text style={st.bagPickerMeta}>{bag.sizeLiters}L</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  error: { color: "#D32F2F", marginBottom: 12, fontSize: 14 },
  fieldError: {
    color: "#D32F2F",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#555555", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  countryButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  countryButtonFlag: { fontSize: 22, marginRight: 10 },
  countryButtonText: { fontSize: 15, color: "#1A1A1A", flex: 1 },
  coverPreview: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    marginBottom: 8,
  },
  coverBtn: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  coverBtnText: { fontSize: 14, color: "#B5451B", fontWeight: "500" },
  participantList: { marginBottom: 16, gap: 4 },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  participantSelected: { borderColor: "#B5451B", backgroundColor: "#FFF0EB" },
  participantCheck: { fontSize: 18, marginRight: 10, color: "#B5451B" },
  participantName: { fontSize: 15, color: "#1A1A1A" },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    backgroundColor: "#FFFFFF",
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#B5451B", borderColor: "#B5451B" },
  chipText: { fontSize: 13, color: "#555555" },
  chipTextActive: { color: "#FFFFFF" },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingVertical: 4,
  },
  activeLabel: { fontSize: 15, color: "#1A1A1A" },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    alignItems: "center",
  },
  cancelText: { color: "#1A1A1A", fontSize: 16 },
  saveButton: {
    flex: 1,
    backgroundColor: "#B5451B",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  deleteButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D32F2F",
    alignItems: "center",
  },
  deleteButtonText: { color: "#D32F2F", fontSize: 16, fontWeight: "600" },
  successSnackbar: {
    position: "absolute",
    top: 48,
    backgroundColor: "#388E3C",
  },
  // Country picker
  countryPickerContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 48,
  },
  countryPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  countryPickerTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },
  countryPickerClose: { fontSize: 16, color: "#B5451B", fontWeight: "600" },
  countrySearchInput: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  countryRowSelected: { backgroundColor: "#FFF0EB" },
  countryRowFlag: { fontSize: 22, marginRight: 12 },
  countryRowName: { fontSize: 15, color: "#1A1A1A", flex: 1 },
  countryRowCode: { fontSize: 13, color: "#AAAAAA" },
  // Bags
  emptyBagsText: {
    fontSize: 13,
    color: "#888888",
    fontStyle: "italic",
    marginBottom: 12,
  },
  bagList: { marginBottom: 12, gap: 8 },
  bagRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    gap: 10,
  },
  bagColorDot: { width: 16, height: 16, borderRadius: 8 },
  bagInfo: { flex: 1 },
  bagName: { fontSize: 14, color: "#1A1A1A", fontWeight: "500" },
  bagMeta: { fontSize: 12, color: "#888888" },
  bagTopLevelChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
  bagTopLevelChipActive: { backgroundColor: "#B5451B", borderColor: "#B5451B" },
  bagTopLevelText: { fontSize: 11, color: "#555555", fontWeight: "500" },
  bagTopLevelTextActive: { color: "#FFFFFF" },
  addBagBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    marginBottom: 16,
  },
  addBagBtnText: { fontSize: 14, color: "#B5451B", fontWeight: "500" },
  // Bag picker modal
  bagPickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  bagPickerOverlayTouch: { flex: 1 },
  bagPickerSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "50%",
  },
  bagPickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  bagPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 10,
  },
  bagPickerName: { fontSize: 15, color: "#1A1A1A", flex: 1 },
  bagPickerMeta: { fontSize: 13, color: "#888888" },
});
