import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Icon } from "react-native-paper";
import { useModalKeyboardScroll } from "../hooks/use-modal-keyboard-scroll";
import type { IconEntry } from "../types/packing.types";

interface IconPickerProps {
  visible: boolean;
  icons: IconEntry[];
  selectedIconId: string;
  onSelect: (iconId: string) => void;
  onClose: () => void;
}

const NUM_COLUMNS = 5;

export function IconPicker({
  visible,
  icons,
  selectedIconId,
  onSelect,
  onClose,
}: IconPickerProps) {
  const [search, setSearch] = useState("");

  const { keyboardHeight, scrollViewRef, getInputProps } =
    useModalKeyboardScroll({
      inputKeys: ["search"],
    });

  const filtered = useMemo(() => {
    if (!search.trim()) return icons;
    const q = search.toLowerCase().trim();
    return icons.filter(
      (icon) =>
        icon.name.toLowerCase().includes(q) ||
        icon.tags.toLowerCase().includes(q),
    );
  }, [icons, search]);

  function handleSelect(iconId: string) {
    onSelect(iconId);
    onClose();
    setSearch("");
  }

  function handleClose() {
    onClose();
    setSearch("");
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Selecionar ícone</Text>
          <TouchableOpacity onPress={handleClose}>
            <Text style={s.closeText}>Fechar</Text>
          </TouchableOpacity>
        </View>

        <View style={s.searchWrap}>
          <Icon source="magnify" size={18} color="#888888" />
          <TextInput
            {...getInputProps("search")}
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar ícone..."
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Icon source="close-circle" size={18} color="#AAAAAA" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={s.grid}
          columnWrapperStyle={s.gridRow}
          renderItem={({ item: icon }) => {
            const isSelected = icon.id === selectedIconId;
            return (
              <TouchableOpacity
                style={[s.cell, isSelected && s.cellSelected]}
                onPress={() => handleSelect(icon.id)}
              >
                <Icon
                  source={icon.name}
                  size={28}
                  color={isSelected ? "#B5451B" : "#555555"}
                />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={s.empty}>Nenhum ícone encontrado.</Text>
          }
        />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", paddingTop: 48 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },
  closeText: { fontSize: 16, color: "#B5451B", fontWeight: "600" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  grid: { padding: 16 },
  gridRow: { gap: 8, marginBottom: 8 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 64,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  cellSelected: {
    backgroundColor: "#FFF0EB",
    borderWidth: 2,
    borderColor: "#B5451B",
  },
  empty: { color: "#888888", textAlign: "center", marginTop: 32 },
});
