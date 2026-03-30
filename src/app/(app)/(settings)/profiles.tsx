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
  Image,
} from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useRepository } from '../../../hooks/use-repository';
import { useAuthStore } from '../../../stores/auth.store';
import { supabaseClient } from '../../../repositories/supabase/supabase.client';
import { logger } from '../../../utils/logger';
import { compressAvatar } from '../../../utils/image.utils';
import { PageHeader } from '../../../components/page-header';
import type { Profile, ProfileStatus, UserRole, Family } from '../../../types/profile.types';

// ── Role helpers ────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  maid: 'Empregada',
  child: 'Criança',
};

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ProfileStatus, string> = {
  active: 'Activo',
  invited: 'Convidado',
  enrolled: 'Inscrito',
  inactive: 'Inactivo',
};

const STATUS_COLOR: Record<ProfileStatus, string> = {
  active: '#888888',
  invited: '#E67E22',
  enrolled: '#27AE60',
  inactive: '#D32F2F',
};

function validNextStatuses(current: ProfileStatus): ProfileStatus[] {
  switch (current) {
    case 'active':
      return ['invited', 'inactive'];
    case 'invited':
      return ['active', 'inactive'];
    case 'enrolled':
      return ['active', 'inactive'];
    case 'inactive':
      return ['active', 'invited'];
    default:
      return [];
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ProfilesScreen() {
  const profileRepository = useRepository('profile');
  const { userAccount } = useAuthStore();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [family, setFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Family edit state
  const [familyEditVisible, setFamilyEditVisible] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [familyNameError, setFamilyNameError] = useState('');
  const [pendingBannerUri, setPendingBannerUri] = useState<string | null>(null);
  const [isSavingFamily, setIsSavingFamily] = useState(false);

  // Bottom sheet state
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('child');
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Status picker state
  const [statusPickerProfile, setStatusPickerProfile] = useState<Profile | null>(null);

  // Email prompt state (shown when changing to invited without email)
  const [emailPromptProfile, setEmailPromptProfile] = useState<Profile | null>(null);
  const [emailPromptValue, setEmailPromptValue] = useState('');
  const [emailPromptRole, setEmailPromptRole] = useState<UserRole>('admin');

  async function loadData(showSpinner = false) {
    if (!userAccount?.familyId) return;
    if (showSpinner) setIsLoading(true);
    try {
      const list = await profileRepository.getProfilesByFamily(userAccount.familyId);
      setProfiles(list);

      const { data: famData } = await supabaseClient.from('families').select('*').eq('id', userAccount.familyId).single();
      if (famData) {
        setFamily({ id: famData.id, name: famData.name, bannerUrl: famData.banner_url ?? null, createdAt: famData.created_at, updatedAt: famData.updated_at });
      }
    } catch (err) {
      logger.error('ProfilesScreen', 'loadData failed', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar perfis.');
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }

  async function handleReorder(data: Profile[]) {
    setProfiles(data);
    for (let i = 0; i < data.length; i++) {
      if (data[i].sortOrder !== i + 1) {
        try { await profileRepository.reorderProfile(data[i].id, i + 1); } catch { /* ignore */ }
      }
    }
    await loadData();
  }

  function openFamilyEdit() {
    logger.info('ProfilesScreen', `openFamilyEdit called, family=${family ? family.name : 'null'}`);
    if (!family) return;
    setFamilyName(family.name);
    setPendingBannerUri(null);
    setFamilyNameError('');
    setFamilyEditVisible(true);
  }

  async function pickBanner() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) setPendingBannerUri(result.assets[0].uri);
  }

  async function handleSaveFamily() {
    const name = familyName.trim();
    if (!name) { setFamilyNameError('O nome é obrigatório.'); return; }
    if (!family || !userAccount) return;
    setIsSavingFamily(true);
    try {
      const { supabaseClient } = await import('../../../repositories/supabase/supabase.client');
      const FileSystem = await import('expo-file-system/legacy');
      let bannerUrl = family.bannerUrl;

      logger.info('ProfilesScreen', `handleSaveFamily: name=${name}, pendingBannerUri=${pendingBannerUri ? 'yes' : 'no'}`);

      if (pendingBannerUri) {
        const compressed = await compressAvatar(pendingBannerUri);
        logger.info('ProfilesScreen', `compressed uri: ${compressed}`);
        const storagePath = `${family.id}/banner.jpg`;

        // Delete old banner if exists
        const { error: delErr } = await supabaseClient.storage.from('family-banners').remove([storagePath]);
        logger.info('ProfilesScreen', `delete old banner: ${delErr ? delErr.message : 'ok'}`);

        // Upload new banner (same pattern as vacation covers)
        const base64 = await FileSystem.readAsStringAsync(compressed, { encoding: FileSystem.EncodingType.Base64 });
        logger.info('ProfilesScreen', `base64 length: ${base64.length}`);
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const { error: upErr } = await supabaseClient.storage
          .from('family-banners')
          .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: true });

        logger.info('ProfilesScreen', `upload result: ${upErr ? upErr.message : 'ok'}`);

        if (upErr) {
          logger.error('ProfilesScreen', 'banner upload failed', upErr);
        } else {
          const { data } = supabaseClient.storage.from('family-banners').getPublicUrl(storagePath);
          bannerUrl = data.publicUrl + '?t=' + Date.now();
          logger.info('ProfilesScreen', `bannerUrl: ${bannerUrl}`);
        }
      }

      // Update family via Supabase
      logger.info('ProfilesScreen', `updating family: name=${name}, banner_url=${bannerUrl}`);
      const { error } = await supabaseClient
        .from('families')
        .update({ name, banner_url: bannerUrl, updated_at: new Date().toISOString() })
        .eq('id', family.id);

      logger.info('ProfilesScreen', `family update result: ${error ? error.message : 'ok'}`);
      if (error) throw error;

      setFamilyEditVisible(false);
      await loadData();
    } catch (err) {
      logger.error('ProfilesScreen', 'handleSaveFamily failed', err);
    } finally {
      setIsSavingFamily(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void loadData(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );


  // ── Bottom sheet openers ──────────────────────────────────────────────────

  function openCreate() {
    setEditingProfile(null);
    setFormName('');
    setFormEmail('');
    setFormRole('child');
    setPendingAvatarUri(null);
    setCurrentAvatarUrl(null);
    setError(null);
    setBottomSheetVisible(true);
  }

  function openEdit(profile: Profile) {
    setEditingProfile(profile);
    setFormName(profile.displayName);
    setFormEmail(profile.email ?? '');
    setFormRole(profile.role);
    setPendingAvatarUri(null);
    setCurrentAvatarUrl(profile.avatarUrl ?? null);
    setError(null);
    setBottomSheetVisible(true);
  }

  // ── Avatar picker ─────────────────────────────────────────────────────────

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permissão para aceder à galeria negada.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setPendingAvatarUri(result.assets[0].uri);
    }
  }

  // ── Save (create or edit) ─────────────────────────────────────────────────

  async function handleSave() {
    const name = formName.trim();
    const email = formEmail.trim() || null;
    if (!name) {
      setError('O nome é obrigatório.');
      return;
    }

    // Email uniqueness within family
    if (email) {
      const duplicate = profiles.find(
        (p) => p.email?.toLowerCase() === email.toLowerCase() && p.id !== editingProfile?.id
      );
      if (duplicate) {
        setError(`O email "${email}" já está atribuído a "${duplicate.displayName}".`);
        return;
      }
    }

    setError(null);
    setIsSaving(true);
    try {
      let avatarUrl = currentAvatarUrl;

      if (pendingAvatarUri) {
        const compressedUri = await compressAvatar(pendingAvatarUri);
        const profileId = editingProfile?.id ?? crypto.randomUUID();
        avatarUrl = await profileRepository.uploadAvatar(
          profileId,
          userAccount!.familyId,
          compressedUri
        );
      }

      if (editingProfile) {
        const isInvitedOrEnrolled =
          editingProfile.status === 'invited' || editingProfile.status === 'enrolled';
        const emailChanged = email !== (editingProfile.email ?? null);
        const emailCleared = !email && !!editingProfile.email;

        if (isInvitedOrEnrolled && emailCleared) {
          // Email removed → auto-transition to active (revokes auth if enrolled)
          await profileRepository.setProfileStatus(editingProfile.id, 'active');
          const updates: Partial<Pick<Profile, 'displayName' | 'avatarUrl' | 'email' | 'role'>> = {
            displayName: name,
            email: null,
            role: formRole,
          };
          if (pendingAvatarUri) updates.avatarUrl = avatarUrl;
          await profileRepository.updateProfile(editingProfile.id, updates);
        } else if (editingProfile.status === 'enrolled' && emailChanged && email) {
          // Enrolled + email changed → revoke auth, update email, set to invited
          await profileRepository.setProfileStatus(editingProfile.id, 'active');
          const updates: Partial<Pick<Profile, 'displayName' | 'avatarUrl' | 'email' | 'role'>> = {
            displayName: name,
            email,
            role: formRole,
          };
          if (pendingAvatarUri) updates.avatarUrl = avatarUrl;
          await profileRepository.updateProfile(editingProfile.id, updates);
          await profileRepository.setProfileStatus(editingProfile.id, 'invited');
        } else {
          // Normal update
          const updates: Partial<Pick<Profile, 'displayName' | 'avatarUrl' | 'email' | 'role'>> = {
            displayName: name,
            role: formRole,
          };
          if (pendingAvatarUri) updates.avatarUrl = avatarUrl;
          if (editingProfile.status !== 'enrolled') {
            updates.email = email;
          }
          await profileRepository.updateProfile(editingProfile.id, updates);
        }
      } else {
        await profileRepository.createProfile(
          name,
          avatarUrl,
          userAccount!.familyId,
          email,
          formRole
        );
      }

      setBottomSheetVisible(false);
      await loadData();
    } catch (err) {
      logger.error('ProfilesScreen', 'handleSave failed', err);
      setError(err instanceof Error ? err.message : 'Erro ao guardar perfil.');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Status change (from list badge tap → picker modal) ─────────────────

  function handleBadgeTap(profile: Profile) {
    setStatusPickerProfile(profile);
  }

  function handleStatusPick(newStatus: ProfileStatus) {
    const profile = statusPickerProfile;
    if (!profile) return;

    if (newStatus === 'invited' && !profile.email) {
      // No email → prompt for one before changing status
      setStatusPickerProfile(null);
      setEmailPromptValue('');
      setEmailPromptRole('child');
      setEmailPromptProfile(profile);
      return;
    }

    const isRevoke = newStatus === 'active' && profile.status === 'enrolled';

    setStatusPickerProfile(null);
    setTimeout(() => {
      const title = isRevoke ? 'Revogar acesso' : `Alterar para ${STATUS_LABEL[newStatus]}`;
      const message = isRevoke
        ? `O acesso de "${profile.displayName}" será revogado. Terá de ser convidado novamente para aceder à aplicação.`
        : `Alterar estado de "${profile.displayName}" para "${STATUS_LABEL[newStatus]}"?`;

      Alert.alert(title, message, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => void doStatusChange(profile.id, newStatus) },
      ]);
    }, 300);
  }

  async function handleEmailPromptConfirm() {
    const profile = emailPromptProfile;
    if (!profile) return;

    const email = emailPromptValue.trim();
    if (!email) {
      setError('Email é obrigatório para convidar.');
      return;
    }

    const duplicate = profiles.find(
      (p) => p.email?.toLowerCase() === email.toLowerCase() && p.id !== profile.id
    );
    if (duplicate) {
      setError(`O email "${email}" já está atribuído a "${duplicate.displayName}".`);
      return;
    }

    setError(null);
    setEmailPromptProfile(null);
    try {
      await profileRepository.updateProfile(profile.id, { email, role: emailPromptRole });
      await profileRepository.setProfileStatus(profile.id, 'invited');
      await loadData();
    } catch (err) {
      logger.error('ProfilesScreen', 'handleEmailPromptConfirm failed', err);
      setError(err instanceof Error ? err.message : 'Erro ao convidar.');
    }
  }

  async function doStatusChange(id: string, status: ProfileStatus) {
    try {
      await profileRepository.setProfileStatus(id, status);
      await loadData();
    } catch (err) {
      logger.error('ProfilesScreen', 'doStatusChange failed', err);
      setError(err instanceof Error ? err.message : 'Erro ao alterar estado.');
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function confirmDelete(profile: Profile) {
    Alert.alert('Eliminar', `Eliminar o perfil "${profile.displayName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: 'destructive',
        onPress: () => void handleDelete(profile.id),
      },
    ]);
  }

  async function handleDelete(id: string) {
    try {
      await profileRepository.deleteProfile(id);
      await loadData();
    } catch (err) {
      logger.error('ProfilesScreen', 'handleDelete failed', err);
      setError(err instanceof Error ? err.message : 'Erro ao eliminar perfil.');
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const sheetAvatarUri = pendingAvatarUri ?? currentAvatarUrl;

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  function renderProfileItem({ item: profile, drag, isActive }: RenderItemParams<Profile>) {
    return (
      <ScaleDecorator>
        <View style={[styles.row, isActive && { backgroundColor: '#F5F5F5' }]}>
          <TouchableOpacity onLongPress={drag} delayLongPress={150} style={styles.dragHandle}>
            <Text style={styles.dragHandleText}>☰</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowContent} onPress={() => openEdit(profile)}>
            <View style={styles.avatarCircle}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitial}>
                  {profile.displayName[0]?.toUpperCase() ?? '?'}
                </Text>
              )}
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowName, profile.status === 'inactive' && styles.rowNameInactive]}>
                {profile.displayName}
              </Text>
              {profile.email && <Text style={styles.rowEmail}>{profile.email}</Text>}
              <Text style={styles.rowRole}>{ROLE_LABEL[profile.role]}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.badge, { backgroundColor: STATUS_COLOR[profile.status] }]}
            onPress={() => handleBadgeTap(profile)}
          >
            <Text style={styles.badgeText}>{STATUS_LABEL[profile.status]}</Text>
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <PageHeader title="Família" subtitle={family?.name} imageUri={family?.bannerUrl} showBack onEdit={openFamilyEdit} />

      <View style={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <DraggableFlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          renderItem={renderProfileItem}
          onDragEnd={({ data }) => handleReorder(data)}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum perfil encontrado.</Text>}
          ListFooterComponent={
            <TouchableOpacity style={styles.addButton} onPress={openCreate}>
              <Text style={styles.addButtonText}>Adicionar perfil</Text>
            </TouchableOpacity>
          }
        />
      </View>

      {/* ── Bottom sheet (create / edit) ────────────────────────────────── */}
      <Modal
        visible={bottomSheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBottomSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editingProfile ? 'Editar perfil' : 'Novo perfil'}
            </Text>

            {/* Avatar picker */}
            <TouchableOpacity
              style={styles.avatarPicker}
              onPress={handlePickImage}
              disabled={isSaving}
            >
              {sheetAvatarUri ? (
                <Image source={{ uri: sheetAvatarUri }} style={styles.avatarPickerImage} />
              ) : (
                <Text style={styles.avatarPickerInitial}>{formName[0]?.toUpperCase() ?? '?'}</Text>
              )}
              <View style={styles.avatarPickerBadge}>
                <Text style={styles.avatarPickerBadgeText}>foto</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              value={formName}
              onChangeText={setFormName}
              placeholder="ex: Aurora"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isSaving}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formEmail}
              onChangeText={setFormEmail}
              placeholder="email@exemplo.com (opcional)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSaving}
            />

            <Text style={styles.label}>Função</Text>
            <View style={styles.roleRow}>
              {(['admin', 'maid', 'child'] as UserRole[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleOption, formRole === r && styles.roleOptionSelected]}
                  onPress={() => setFormRole(r)}
                  disabled={isSaving}
                >
                  <Text
                    style={[styles.roleOptionText, formRole === r && styles.roleOptionTextSelected]}
                  >
                    {ROLE_LABEL[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.sheetButtons}>
              {editingProfile && editingProfile.status !== 'enrolled' && (
                <TouchableOpacity
                  style={styles.deleteSheetButton}
                  onPress={() => {
                    const p = editingProfile;
                    setBottomSheetVisible(false);
                    setTimeout(() => confirmDelete(p), 400);
                  }}
                  disabled={isSaving}
                >
                  <Text style={styles.deleteSheetText}>Eliminar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setBottomSheetVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
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

      {/* ── Status picker modal ──────────────────────────────────────── */}
      <Modal
        visible={statusPickerProfile !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setStatusPickerProfile(null)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setStatusPickerProfile(null)}
        >
          <View style={styles.pickerCard}>
            {statusPickerProfile && (
              <>
                <Text style={styles.pickerName}>{statusPickerProfile.displayName}</Text>

                {/* Current status */}
                <View
                  style={[
                    styles.pickerCurrent,
                    { backgroundColor: STATUS_COLOR[statusPickerProfile.status] + '18' },
                  ]}
                >
                  <View
                    style={[
                      styles.pickerDot,
                      { backgroundColor: STATUS_COLOR[statusPickerProfile.status] },
                    ]}
                  />
                  <Text
                    style={[
                      styles.pickerCurrentText,
                      { color: STATUS_COLOR[statusPickerProfile.status] },
                    ]}
                  >
                    {STATUS_LABEL[statusPickerProfile.status]}
                  </Text>
                </View>

                {/* Valid transitions */}
                <Text style={styles.pickerHint}>Alterar para:</Text>
                <View style={styles.pickerOptions}>
                  {validNextStatuses(statusPickerProfile.status).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.pickerOption,
                        { borderColor: STATUS_COLOR[s], backgroundColor: STATUS_COLOR[s] + '10' },
                      ]}
                      onPress={() => handleStatusPick(s)}
                    >
                      <View style={[styles.pickerDot, { backgroundColor: STATUS_COLOR[s] }]} />
                      <Text style={[styles.pickerOptionText, { color: STATUS_COLOR[s] }]}>
                        {STATUS_LABEL[s]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Email prompt modal (for status→invited without email) ────── */}
      <Modal
        visible={emailPromptProfile !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setEmailPromptProfile(null)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setEmailPromptProfile(null)}
        >
          <View style={styles.pickerCard} onStartShouldSetResponder={() => true}>
            {emailPromptProfile && (
              <>
                <Text style={styles.pickerName}>Convidar {emailPromptProfile.displayName}</Text>

                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={emailPromptValue}
                  onChangeText={setEmailPromptValue}
                  placeholder="email@exemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.label}>Função</Text>
                <View style={styles.roleRow}>
                  {(['admin', 'maid', 'child'] as UserRole[]).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.roleOption,
                        emailPromptRole === r && styles.roleOptionSelected,
                      ]}
                      onPress={() => setEmailPromptRole(r)}
                    >
                      <Text
                        style={[
                          styles.roleOptionText,
                          emailPromptRole === r && styles.roleOptionTextSelected,
                        ]}
                      >
                        {ROLE_LABEL[r]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={styles.sheetButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setEmailPromptProfile(null)}
                  >
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleEmailPromptConfirm}>
                    <Text style={styles.saveButtonText}>Convidar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Family edit modal ────────────────────────────────────────── */}
      <Modal visible={familyEditVisible} animationType="slide" transparent onRequestClose={() => setFamilyEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Editar família</Text>

            <Text style={styles.label}>Nome *</Text>
            <TextInput style={[styles.input, familyNameError ? styles.inputError : null]} value={familyName}
              onChangeText={(t) => { setFamilyName(t); setFamilyNameError(''); }} placeholder="ex: Morais" editable={!isSavingFamily} />
            {familyNameError ? <Text style={styles.fieldError}>{familyNameError}</Text> : null}

            <Text style={styles.label}>Foto de capa</Text>
            <TouchableOpacity style={styles.coverBtn} onPress={pickBanner} disabled={isSavingFamily}>
              <Text style={styles.coverBtnText}>
                {pendingBannerUri
                  ? 'Imagem selecionada ✓'
                  : family?.bannerUrl
                    ? 'Alterar imagem'
                    : 'Escolher imagem'}
              </Text>
            </TouchableOpacity>

            <View style={styles.sheetButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setFamilyEditVisible(false)} disabled={isSavingFamily}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, isSavingFamily && { opacity: 0.6 }]} onPress={handleSaveFamily} disabled={isSavingFamily}>
                {isSavingFamily ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },
  backText: {
    color: '#B5451B',
    fontSize: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    color: '#1A1A1A',
  },
  error: {
    color: '#D32F2F',
    marginBottom: 12,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#B5451B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  rowNameInactive: {
    color: '#AAAAAA',
    textDecorationLine: 'line-through',
  },
  rowEmail: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  rowRole: {
    fontSize: 11,
    color: '#AAAAAA',
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  empty: {
    color: '#888888',
    textAlign: 'center',
    marginVertical: 16,
  },
  addButton: {
    marginTop: 24,
    backgroundColor: '#B5451B',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
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
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  avatarPicker: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#B5451B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  avatarPickerImage: {
    width: 88,
    height: 88,
  },
  avatarPickerInitial: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
  },
  avatarPickerBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  avatarPickerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
    width: '100%',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
  },
  roleOptionSelected: {
    borderColor: '#B5451B',
    backgroundColor: '#FFF0EB',
  },
  roleOptionText: {
    fontSize: 14,
    color: '#555555',
  },
  roleOptionTextSelected: {
    color: '#B5451B',
    fontWeight: '600',
  },
  sheetButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  deleteSheetButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D32F2F',
    alignItems: 'center',
  },
  deleteSheetText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
  },
  cancelText: {
    color: '#1A1A1A',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  pickerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerCurrent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  pickerCurrentText: {
    fontSize: 15,
    fontWeight: '700',
  },
  pickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  pickerHint: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 10,
    textAlign: 'center',
  },
  pickerOptions: {
    gap: 10,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  pickerOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dragHandle: { paddingHorizontal: 8, paddingVertical: 12, justifyContent: 'center' },
  dragHandleText: { fontSize: 18, color: '#CCCCCC' },
  editFamilyBtn: {
    position: 'absolute',
    top: 44,
    right: 12,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editFamilyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  inputError: { borderColor: '#D32F2F' },
  fieldError: { color: '#D32F2F', fontSize: 12, marginBottom: 8 },
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
});
