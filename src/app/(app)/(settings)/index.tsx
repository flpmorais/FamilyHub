import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { supabaseClient } from '../../../repositories/supabase/supabase.client';
import { useAuthStore } from '../../../stores/auth.store';
import { PageHeader } from '../../../components/page-header';
import type { Family } from '../../../types/profile.types';

const FAMILY_ITEMS = [
  { label: 'Família', icon: 'account-group', route: '/(app)/(settings)/profiles' },
] as const;

const VACATION_ITEMS = [
  { label: 'Modelos de Items', icon: 'content-copy', route: '/(app)/(settings)/templates' },
  { label: 'Modelos de Malas', icon: 'bag-suitcase', route: '/(app)/(settings)/bag-templates' },
  { label: 'Modelos de Viagens', icon: 'airplane', route: '/(app)/(settings)/vacation-templates' },
  { label: 'Tarefas', icon: 'clipboard-check-outline', route: '/(app)/(settings)/tasks' },
  { label: 'Etiquetas', icon: 'tag', route: '/(app)/(settings)/tags' },
  { label: 'Categorias', icon: 'shape', route: '/(app)/(settings)/categories' },
] as const;

const SHOPPING_ITEMS = [
  { label: 'Categorias de Compras', icon: 'cart', route: '/(app)/(settings)/shopping-categories' },
] as const;

export default function SettingsHubScreen() {
  const { userAccount } = useAuthStore();
  const [family, setFamily] = useState<Family | null>(null);

  useFocusEffect(
    useCallback(() => {
      void loadFamily();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function loadFamily() {
    if (!userAccount?.familyId) return;
    try {
      const { data } = await supabaseClient.from('families').select('*').eq('id', userAccount.familyId).single();
      if (data) {
        setFamily({ id: data.id, name: data.name, bannerUrl: data.banner_url ?? null, createdAt: data.created_at, updatedAt: data.updated_at });
      }
    } catch {
      // Silently fail
    }
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <PageHeader title="Definições" familyBannerUri={family?.bannerUrl} />

      <View style={s.body}>
        <Text style={s.sectionTitle}>Família</Text>
        {FAMILY_ITEMS.map((item) => (
          <TouchableOpacity key={item.route} style={s.row} onPress={() => router.push(item.route as any)}>
            <View style={s.iconWrap}>
              <Icon source={item.icon} size={22} color="#B5451B" />
            </View>
            <Text style={s.label}>{item.label}</Text>
            <Icon source="chevron-right" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        ))}

        <Text style={[s.sectionTitle, { marginTop: 24 }]}>Viagens</Text>
        {VACATION_ITEMS.map((item) => (
          <TouchableOpacity key={item.route} style={s.row} onPress={() => router.push(item.route as any)}>
            <View style={s.iconWrap}>
              <Icon source={item.icon} size={22} color="#B5451B" />
            </View>
            <Text style={s.label}>{item.label}</Text>
            <Icon source="chevron-right" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        ))}

        <Text style={[s.sectionTitle, { marginTop: 24 }]}>Compras</Text>
        {SHOPPING_ITEMS.map((item) => (
          <TouchableOpacity key={item.route} style={s.row} onPress={() => router.push(item.route as any)}>
            <View style={s.iconWrap}>
              <Icon source={item.icon} size={22} color="#B5451B" />
            </View>
            <Text style={s.label}>{item.label}</Text>
            <Icon source="chevron-right" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        ))}

      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1 },
  body: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  iconWrap: { width: 36, alignItems: 'center', marginRight: 12 },
  label: { flex: 1, fontSize: 16, color: '#1A1A1A' },
});
