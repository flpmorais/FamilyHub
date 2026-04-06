import { useContext, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Pressable,
  Alert,
  BackHandler,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from 'react-native-paper';
import { router } from 'expo-router';
import { useUiStore } from '../stores/ui.store';
import { useAuthStore } from '../stores/auth.store';
import { useCurrentProfile } from '../hooks/use-current-profile';
import { RepositoryContext } from '../repositories/repository.context';

const SIDEBAR_WIDTH = 280;
const ANIMATION_DURATION = 250;

const MENU_ITEMS = [
  { label: 'Início', icon: 'home', route: '/(app)/(home)' },
  { label: 'Ementa Semanal', icon: 'silverware-fork-knife', route: '/(app)/(meal-plan)' },
  { label: 'Compras', icon: 'cart-outline', route: '/(app)/(shopping)' },
  { label: 'Restos', icon: 'recycle-variant', route: '/(app)/(leftovers)' },
  { label: 'Receitas', icon: 'book-open-variant', route: '/(app)/(recipes)' },
  { label: 'Viagens', icon: 'airplane', route: '/(app)/(vacations)' },
  { label: 'Definições', icon: 'cog', route: '/(app)/(settings)' },
] as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SidebarMenu() {
  const { isSidebarOpen, setSidebarOpen } = useUiStore();
  const { setUserAccount } = useAuthStore();
  const repositories = useContext(RepositoryContext);
  const profile = useCurrentProfile();
  const insets = useSafeAreaInsets();

  const translateX = useSharedValue(SIDEBAR_WIDTH);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(isSidebarOpen ? 0 : SIDEBAR_WIDTH, {
      duration: ANIMATION_DURATION,
    });
    backdropOpacity.value = withTiming(isSidebarOpen ? 1 : 0, {
      duration: ANIMATION_DURATION,
    });
  }, [isSidebarOpen, translateX, backdropOpacity]);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      setSidebarOpen(false);
      return true;
    });

    return () => handler.remove();
  }, [isSidebarOpen, setSidebarOpen]);

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  function handleNavigate(route: string) {
    setSidebarOpen(false);
    router.push(route as any);
  }

  function handleLogout() {
    Alert.alert('Terminar sessão', 'Tens a certeza que queres sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          setSidebarOpen(false);
          try {
            await repositories!.auth.signOut();
          } finally {
            setUserAccount(null);
          }
        },
      },
    ]);
  }

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents={isSidebarOpen ? 'auto' : 'none'}>
      {/* Backdrop */}
      <AnimatedPressable
        style={[styles.backdrop, backdropStyle]}
        onPress={() => setSidebarOpen(false)}
      />

      {/* Sidebar panel */}
      <Animated.View style={[styles.sidebar, sidebarStyle]}>
        {/* Profile section */}
        <View style={[styles.profileSection, { paddingTop: insets.top + 24 }]}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {profile?.displayName?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <Text style={styles.profileName}>
            {profile?.displayName ?? ''}
          </Text>
        </View>

        <View style={styles.separator} />

        {/* Menu entries */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.menuRow}
              onPress={() => handleNavigate(item.route)}
            >
              <View style={styles.iconWrap}>
                <Icon source={item.icon} size={22} color="#B5451B" />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Logout section */}
        <View style={styles.separator} />
        <TouchableOpacity
          style={[styles.menuRow, { paddingBottom: insets.bottom + 16 }]}
          onPress={handleLogout}
        >
          <View style={styles.iconWrap}>
            <Icon source="logout" size={22} color="#D32F2F" />
          </View>
          <Text style={[styles.menuLabel, { color: '#D32F2F' }]}>Terminar sessão</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 8,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#B5451B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  menuSection: {
    paddingTop: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 36,
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 16,
    color: '#1A1A1A',
  },
});
