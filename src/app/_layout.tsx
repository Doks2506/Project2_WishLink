import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth';
import { C } from '../lib/theme';

// Shows the app screens only when logged in, otherwise only the login screen.
// "(tabs)" is the group with the bottom bar (Home, My Cards, Profile).
// editor and share are OUTSIDE the tabs, so they open full screen without the bar.
function Gate() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="editor" />
        <Stack.Screen name="share" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="view" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Gate />
    </AuthProvider>
  );
}
