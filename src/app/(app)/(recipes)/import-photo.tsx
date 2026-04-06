import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Snackbar } from 'react-native-paper';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useRepository } from '../../../hooks/use-repository';
import { logger } from '../../../utils/logger';

export default function ImportPhotoScreen() {
  const recipeImportRepo = useRepository('recipeImport');

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  function showError(msg: string) {
    setErrorMsg(msg);
    setErrorVisible(true);
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      await processImage(result.assets[0].uri, result.assets[0].mimeType ?? 'image/jpeg');
    }
  }

  async function captureFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showError('Permissão da câmara necessária para tirar fotos');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled) {
      await processImage(result.assets[0].uri, result.assets[0].mimeType ?? 'image/jpeg');
    }
  }

  async function processImage(uri: string, mimeType: string) {
    setImageUri(uri);
    setIsExtracting(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const extracted = await recipeImportRepo.extractFromPhoto(base64, mimeType);

      router.push({
        pathname: '/(app)/(recipes)/import-review',
        params: {
          extractedJson: JSON.stringify(extracted),
          sourceUrl: '',
          importMethod: 'ocr',
        },
      } as any);
    } catch (err) {
      logger.error('ImportPhotoScreen', 'extraction failed', err);
      showError(err instanceof Error ? err.message : 'Não foi possível extrair a receita da foto.');
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleRetry() {
    setImageUri(null);
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.headerBack}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Importar de Foto</Text>
        <View style={{ width: 60 }} />
      </View>

      {isExtracting && imageUri ? (
        <View style={s.extractingContainer}>
          <Image source={{ uri: imageUri }} style={s.previewImage} />
          <View style={s.extractingOverlay}>
            <ActivityIndicator color="#FFFFFF" size="large" />
            <Text style={s.extractingText}>A extrair receita da foto...</Text>
          </View>
        </View>
      ) : imageUri ? (
        <View style={s.extractingContainer}>
          <Image source={{ uri: imageUri }} style={s.previewImage} />
          <View style={s.retryActions}>
            <TouchableOpacity style={s.retryBtn} onPress={handleRetry}>
              <Text style={s.retryBtnText}>Escolher outra foto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.manualBtn}
              onPress={() => router.replace('/(app)/(recipes)/new' as any)}
            >
              <Text style={s.manualBtnText}>Entrada manual</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={s.pickerContainer}>
          <Text style={s.pickerTitle}>Escolha a origem da foto</Text>
          <Text style={s.pickerSubtitle}>
            Tire uma foto de uma receita impressa ou manuscrita, ou selecione da galeria.
          </Text>

          <TouchableOpacity style={s.pickerBtn} onPress={captureFromCamera}>
            <Text style={s.pickerBtnText}>📸 Tirar Foto</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.pickerBtn} onPress={pickFromGallery}>
            <Text style={s.pickerBtnText}>📷 Galeria</Text>
          </TouchableOpacity>

          <View style={s.altActions}>
            <Text style={s.altText}>ou</Text>
            <TouchableOpacity
              onPress={() => router.replace('/(app)/(recipes)/new' as any)}
            >
              <Text style={s.altLink}>Entrada manual</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
    </View>
  );
}

const s = StyleSheet.create({
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
  pickerContainer: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  pickerSubtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  pickerBtn: {
    width: '100%',
    backgroundColor: '#B5451B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  extractingContainer: {
    flex: 1,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    backgroundColor: '#F5F5F5',
  },
  extractingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extractingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  retryActions: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    gap: 12,
  },
  retryBtn: {
    backgroundColor: '#B5451B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  manualBtn: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  manualBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
