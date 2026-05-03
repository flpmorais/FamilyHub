import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useRepository } from "../../hooks/use-repository";
import { logger } from "../../utils/logger";
import { useModalKeyboardScroll } from "../../hooks/use-modal-keyboard-scroll";
import type { LlmModel } from "../../repositories/interfaces/recipe-import.repository.interface";

type Step = "choose" | "url" | "photo" | "text";

const YOUTUBE_REGEX =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

const MODEL_OPTIONS: { key: LlmModel; label: string; desc: string }[] = [
  { key: "haiku", label: "Haiku", desc: "Rápido" },
  { key: "sonnet", label: "Sonnet", desc: "Melhor qualidade" },
];

interface RecipeAddModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RecipeAddModal({ visible, onClose }: RecipeAddModalProps) {
  const recipeImportRepo = useRepository("recipeImport");

  const [step, setStep] = useState<Step>("choose");
  const [model, setModel] = useState<LlmModel>("haiku");
  const [url, setUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { keyboardHeight, scrollViewRef, getInputProps } =
    useModalKeyboardScroll({
      inputKeys: ["url", "rawText"],
    });

  function reset() {
    setStep("choose");
    setModel("haiku");
    setUrl("");
    setRawText("");
    setImageUri(null);
    setImageBase64(null);
    setErrorMsg("");
    setIsExtracting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  // ── URL flow ──────────────────────────────────────────────────────────

  async function handleExtractUrl() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setIsExtracting(true);
    setErrorMsg("");
    try {
      const videoId = trimmedUrl.match(YOUTUBE_REGEX)?.[1] ?? null;
      const extracted = videoId
        ? await recipeImportRepo.extractFromYoutube(videoId, model)
        : await recipeImportRepo.extractFromUrl(trimmedUrl, model);

      handleClose();
      router.push({
        pathname: "/(app)/(recipes)/new",
        params: {
          extractedJson: JSON.stringify(extracted),
          sourceUrl: trimmedUrl,
        },
      } as any);
    } catch (err) {
      logger.error("RecipeAddModal", "URL extraction failed", err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Não foi possível extrair a receita.",
      );
    } finally {
      setIsExtracting(false);
    }
  }

  // ── Photo flow ────────────────────────────────────────────────────────

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
      setImageMimeType(result.assets[0].mimeType ?? "image/jpeg");
    }
  }

  async function captureFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setErrorMsg("Permissão da câmara necessária para tirar fotos");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
      setImageMimeType(result.assets[0].mimeType ?? "image/jpeg");
    }
  }

  async function handleExtractPhoto() {
    if (!imageBase64) return;

    setIsExtracting(true);
    setErrorMsg("");
    try {
      const extracted = await recipeImportRepo.extractFromPhoto(
        imageBase64,
        imageMimeType,
        model,
      );

      handleClose();
      router.push({
        pathname: "/(app)/(recipes)/new",
        params: {
          extractedJson: JSON.stringify(extracted),
          sourceUrl: "",
          importMethod: "ocr",
        },
      } as any);
    } catch (err) {
      logger.error("RecipeAddModal", "Photo extraction failed", err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Não foi possível extrair a receita da foto.",
      );
    } finally {
      setIsExtracting(false);
    }
  }

  // ── Text flow ─────────────────────────────────────────────────────────

  async function handleExtractText() {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    setIsExtracting(true);
    setErrorMsg("");
    try {
      const extracted = await recipeImportRepo.extractFromText(trimmed, model);

      handleClose();
      router.push({
        pathname: "/(app)/(recipes)/new",
        params: {
          extractedJson: JSON.stringify(extracted),
          sourceUrl: "",
          importMethod: "text",
        },
      } as any);
    } catch (err) {
      logger.error("RecipeAddModal", "Text extraction failed", err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Não foi possível extrair a receita do texto.",
      );
    } finally {
      setIsExtracting(false);
    }
  }

  // ── Model picker (shared) ────────────────────────────────────────────

  function renderModelPicker() {
    return (
      <View style={s.modelSection}>
        <Text style={s.modelLabel}>Modelo de IA</Text>
        <View style={s.modelRow}>
          {MODEL_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[s.modelChip, model === opt.key && s.modelChipActive]}
              onPress={() => setModel(opt.key)}
              disabled={isExtracting}
            >
              <Text
                style={[
                  s.modelChipText,
                  model === opt.key && s.modelChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
              <Text
                style={[
                  s.modelChipDesc,
                  model === opt.key && s.modelChipDescActive,
                ]}
              >
                {opt.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  function renderChooseStep() {
    return (
      <>
        <Text style={s.sheetTitle}>Adicionar Receita</Text>

        <TouchableOpacity
          style={s.optionBtn}
          onPress={() => {
            handleClose();
            router.push("/(app)/(recipes)/new" as any);
          }}
        >
          <Text style={s.optionBtnText}>Entrada Manual</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.optionBtn} onPress={() => setStep("url")}>
          <Text style={s.optionBtnText}>Importar de URL</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.optionBtn} onPress={() => setStep("photo")}>
          <Text style={s.optionBtnText}>Importar de Foto</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.optionBtn} onPress={() => setStep("text")}>
          <Text style={s.optionBtnText}>Importar de Texto</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
          <Text style={s.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </>
    );
  }

  function renderUrlStep() {
    const isYoutube = !!url.trim().match(YOUTUBE_REGEX);

    return (
      <ScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: keyboardHeight + 8 }}
      >
        <Text style={s.sheetTitle}>Importar de URL</Text>

        <Text style={s.fieldLabel}>URL da Receita</Text>
        <TextInput
          {...getInputProps("url")}
          style={s.input}
          value={url}
          onChangeText={setUrl}
          placeholder="Cole o URL da receita ou do YouTube"
          placeholderTextColor="#CCCCCC"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!isExtracting}
        />

        {isYoutube && <Text style={s.youtubeHint}>YouTube detetado</Text>}

        {renderModelPicker()}

        {errorMsg ? <Text style={s.errorText}>{errorMsg}</Text> : null}

        <TouchableOpacity
          style={[
            s.extractBtn,
            (!url.trim() || isExtracting) && s.extractBtnDisabled,
          ]}
          onPress={handleExtractUrl}
          disabled={!url.trim() || isExtracting}
        >
          {isExtracting ? (
            <View style={s.loadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={s.extractBtnText}>
                {"  "}
                {isYoutube ? "A extrair do YouTube..." : "A extrair..."}
              </Text>
            </View>
          ) : (
            <Text style={s.extractBtnText}>Extrair Receita</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.cancelBtn}
          onPress={handleClose}
          disabled={isExtracting}
        >
          <Text style={s.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderPhotoStep() {
    return (
      <ScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: keyboardHeight + 8 }}
      >
        <Text style={s.sheetTitle}>Importar de Foto</Text>

        {imageUri ? (
          <View style={s.previewContainer}>
            <Image source={{ uri: imageUri }} style={s.previewImage} />
            {!isExtracting && (
              <TouchableOpacity
                style={s.changePhotoBtn}
                onPress={() => {
                  setImageUri(null);
                  setImageBase64(null);
                  setErrorMsg("");
                }}
              >
                <Text style={s.changePhotoBtnText}>Escolher outra foto</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={s.photoButtons}>
            <TouchableOpacity style={s.photoBtn} onPress={captureFromCamera}>
              <Text style={s.photoBtnText}>Tirar Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.photoBtn} onPress={pickFromGallery}>
              <Text style={s.photoBtnText}>Galeria</Text>
            </TouchableOpacity>
          </View>
        )}

        {renderModelPicker()}

        {errorMsg ? <Text style={s.errorText}>{errorMsg}</Text> : null}

        {imageBase64 && (
          <TouchableOpacity
            style={[s.extractBtn, isExtracting && s.extractBtnDisabled]}
            onPress={handleExtractPhoto}
            disabled={isExtracting}
          >
            {isExtracting ? (
              <View style={s.loadingRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={s.extractBtnText}> A extrair da foto...</Text>
              </View>
            ) : (
              <Text style={s.extractBtnText}>Extrair Receita</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={s.cancelBtn}
          onPress={handleClose}
          disabled={isExtracting}
        >
          <Text style={s.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderTextStep() {
    return (
      <ScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: keyboardHeight + 8 }}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.sheetTitle}>Importar de Texto</Text>

        <Text style={s.fieldLabel}>Texto da Receita</Text>
        <TextInput
          {...getInputProps("rawText")}
          style={[s.input, s.textArea]}
          value={rawText}
          onChangeText={setRawText}
          placeholder="Cole ou escreva o texto da receita"
          placeholderTextColor="#CCCCCC"
          multiline
          textAlignVertical="top"
          editable={!isExtracting}
        />

        {renderModelPicker()}

        {errorMsg ? <Text style={s.errorText}>{errorMsg}</Text> : null}

        <TouchableOpacity
          style={[
            s.extractBtn,
            (!rawText.trim() || isExtracting) && s.extractBtnDisabled,
          ]}
          onPress={handleExtractText}
          disabled={!rawText.trim() || isExtracting}
        >
          {isExtracting ? (
            <View style={s.loadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={s.extractBtnText}> A extrair...</Text>
            </View>
          ) : (
            <Text style={s.extractBtnText}>Extrair Receita</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.cancelBtn}
          onPress={handleClose}
          disabled={isExtracting}
        >
          <Text style={s.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          {step === "choose" && renderChooseStep()}
          {step === "url" && renderUrlStep()}
          {step === "photo" && renderPhotoStep()}
          {step === "text" && renderTextStep()}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 20,
    textAlign: "center",
  },
  optionBtn: {
    backgroundColor: "#B5451B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  optionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
  cancelBtnText: {
    color: "#1A1A1A",
    fontSize: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A1A",
    marginBottom: 8,
  },
  textArea: {
    height: 150,
  },
  youtubeHint: {
    fontSize: 12,
    color: "#D32F2F",
    fontWeight: "600",
    marginBottom: 8,
  },
  modelSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  modelLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 8,
  },
  modelRow: {
    flexDirection: "row",
    gap: 8,
  },
  modelChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  modelChipActive: {
    backgroundColor: "#B5451B",
    borderColor: "#B5451B",
  },
  modelChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  modelChipTextActive: {
    color: "#FFFFFF",
  },
  modelChipDesc: {
    fontSize: 10,
    color: "#888888",
    marginTop: 2,
  },
  modelChipDescActive: {
    color: "rgba(255,255,255,0.8)",
  },
  extractBtn: {
    backgroundColor: "#B5451B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  extractBtnDisabled: {
    opacity: 0.5,
  },
  extractBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  photoButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  photoBtn: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  photoBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  previewContainer: {
    marginBottom: 8,
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    resizeMode: "cover",
    backgroundColor: "#F5F5F5",
  },
  changePhotoBtn: {
    marginTop: 8,
    alignItems: "center",
  },
  changePhotoBtnText: {
    fontSize: 13,
    color: "#B5451B",
    fontWeight: "600",
  },
});
