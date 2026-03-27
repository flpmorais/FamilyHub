import { Stack } from 'expo-router';
import { useAuthGuard } from '../../hooks/use-auth-guard';

export default function AppLayout() {
  useAuthGuard();
  return <Stack screenOptions={{ headerShown: false }} />;
}
