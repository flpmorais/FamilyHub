import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Snackbar } from 'react-native-paper';
import { router } from 'expo-router';
import { useRepository } from '../../../hooks/use-repository';
import { logger } from '../../../utils/logger';

const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

function extractYoutubeVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
}

export default function ImportUrlScreen() {
  const recipeImportRepo = useRepository('recipeImport');

  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isYoutube, setIsYoutube] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  function showError(msg: string) {
    setErrorMsg(msg);
    setErrorVisible(true);
  }

  function handleUrlChange(text: string) {
    setUrl(text);
    setIsYoutube(!!extractYoutubeVideoId(text.trim()));
  }

  async function handleImport() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setIsImporting(true);
    try {
      const videoId = extractYoutubeVideoId(trimmedUrl);
      const extracted = videoId
        ? await recipeImportRepo.extractFromYoutube(videoId)
        : await recipeImportRepo.extractFromUrl(trimmedUrl);

      router.push({
        pathname: '/(app)/(recipes)/import-review',
        params: {
          extractedJson: JSON.stringify(extracted),
          sourceUrl: trimmedUrl,
        },
      } as any);
    } catch (err) {
      logger.error('ImportUrlScreen', 'import failed', err);
      showError(err instanceof Error ? err.message : 'Não foi possível extrair a receita.');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.headerBack}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Importar Receita</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.content}>
        <Text style={s.label}>URL da Receita</Text>
        <TextInput
          style={s.input}
          value={url}
          onChangeText={handleUrlChange}
          placeholder="Cole o URL da receita ou do YouTube"
          placeholderTextColor="#CCCCCC"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!isImporting}
        />

        <TouchableOpacity
          style={[s.importBtn, (!url.trim() || isImporting) && s.importBtnDisabled]}
          onPress={handleImport}
          disabled={!url.trim() || isImporting}
        >
          {isImporting ? (
            <View style={s.loadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={s.importBtnText}>  {isYoutube ? 'A extrair receita do YouTube...' : 'A extrair receita...'}</Text>
            </View>
          ) : (
            <Text style={s.importBtnText}>Importar</Text>
          )}
        </TouchableOpacity>

        {!isImporting && (
          <View style={s.altActions}>
            <Text style={s.altText}>ou</Text>
            <TouchableOpacity
              onPress={() => router.replace('/(app)/(recipes)/new' as any)}
            >
              <Text style={s.altLink}>Entrada manual</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Snackbar
        visible={errorVisible}
        onDismiss={() => setErrorVisible(false)}
        duration={4000}
        style={s.snackbar}
        theme={{
          colors: {
            inverseSurface: '#D32F2F',
            inverseOnSurface: '#FFFFFF',
          },
        }}
      >
        {errorMsg}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
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
  content: {
    padding: 16,
    paddingTop: 32,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 20,
  },
  importBtn: {
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  importBtnDisabled: {
    opacity: 0.5,
  },
  importBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  altActions: {
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  altText: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  altLink: {
    fontSize: 14,
    color: '#B5451B',
    fontWeight: '600',
  },
  snackbar: {
    position: 'absolute',
    top: 48,
  },
});
