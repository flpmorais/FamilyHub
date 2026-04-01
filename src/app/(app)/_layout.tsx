import { Tabs } from 'expo-router';
import { Icon } from 'react-native-paper';
import { useAuthGuard } from '../../hooks/use-auth-guard';

export default function AppLayout() {
  useAuthGuard();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#B5451B',
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: { paddingBottom: 12, height: 68 },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Icon source="home" size={size} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('(home)', { screen: 'index' });
          },
        })}
      />
      <Tabs.Screen
        name="(vacations)"
        options={{
          title: 'Viagens',
          tabBarIcon: ({ color, size }) => <Icon source="airplane" size={size} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('(vacations)', { screen: 'index' });
          },
        })}
      />
      <Tabs.Screen
        name="(leftovers)"
        options={{
          title: 'Restos',
          tabBarIcon: ({ color, size }) => <Icon source="fridge-outline" size={size} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('(leftovers)', { screen: 'index' });
          },
        })}
      />
      <Tabs.Screen
        name="(shopping)"
        options={{
          title: 'Compras',
          tabBarIcon: ({ color, size }) => <Icon source="cart-outline" size={size} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('(shopping)', { screen: 'index' });
          },
        })}
      />
      <Tabs.Screen
        name="(settings)"
        options={{
          title: 'Definições',
          tabBarIcon: ({ color, size }) => <Icon source="cog" size={size} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('(settings)', { screen: 'index' });
          },
        })}
      />
    </Tabs>
  );
}
