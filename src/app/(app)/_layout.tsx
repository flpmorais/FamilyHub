import { View } from "react-native";
import { Tabs } from "expo-router";
import { Icon } from "react-native-paper";
import { useAuthGuard } from "../../hooks/use-auth-guard";
import { useDishTypes } from "../../hooks/use-dish-types";
import { useUiStore } from "../../stores/ui.store";
import { SidebarMenu } from "../../components/sidebar-menu";

export default function AppLayout() {
  useAuthGuard();
  useDishTypes(); // hydrate dish_types store for downstream consumers
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#B5451B",
          tabBarInactiveTintColor: "#888888",
          tabBarStyle: { paddingBottom: 12, height: 68 },
          tabBarLabelStyle: { fontSize: 11 },
        }}
      >
        <Tabs.Screen
          name="(home)"
          options={{
            title: "Início",
            tabBarIcon: ({ color, size }) => (
              <Icon source="home" size={size} color={color} />
            ),
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate("(home)", { screen: "index" });
            },
          })}
        />
        <Tabs.Screen
          name="(meal-plan)"
          options={{
            title: "Ementa",
            tabBarIcon: ({ color, size }) => (
              <Icon source="silverware-fork-knife" size={size} color={color} />
            ),
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate("(meal-plan)", { screen: "index" });
            },
          })}
        />
        <Tabs.Screen
          name="(shopping)"
          options={{
            title: "Compras",
            tabBarIcon: ({ color, size }) => (
              <Icon source="cart-outline" size={size} color={color} />
            ),
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate("(shopping)", { screen: "index" });
            },
          })}
        />
        <Tabs.Screen
          name="(leftovers)"
          options={{
            title: "Restos",
            tabBarIcon: ({ color, size }) => (
              <Icon source="recycle-variant" size={size} color={color} />
            ),
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate("(leftovers)", { screen: "index" });
            },
          })}
        />
        <Tabs.Screen
          name="(recipes)"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="(vacations)"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="(suggestions)"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="(language-learning)"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="(settings)"
          options={{
            title: "Menu",
            tabBarIcon: ({ color, size }) => (
              <Icon source="dots-horizontal" size={size} color={color} />
            ),
          }}
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              toggleSidebar();
            },
          })}
        />
      </Tabs>
      <SidebarMenu />
    </View>
  );
}
