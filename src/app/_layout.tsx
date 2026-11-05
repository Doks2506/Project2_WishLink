import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth';
import { C, Mode, applyMode, loadMode, saveMode } from '../lib/theme';
import { ThemeCtx } from '../lib/themeContext';

// Shows the app screens only when logged in, otherwise only the login screen.
// "(tabs)" is the group with the bottom bar (Home, My Cards, Profile).
// editor, share, scan, view and reminders are OUTSIDE the tabs, so they open full screen.
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
        <Stack.Screen name="reminders" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [mode, setModeState] = useState<Mode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadMode().then((m) => { applyMode(m); setModeState(m); setReady(true); });
  }, []);

  function setMode(m: Mode) {
    applyMode(m);      // change the shared colours first
    saveMode(m);       // remember the choice
    setModeState(m);   // then re-draw (the key below rebuilds all screens)
  }

  if (!ready) return null;
  return (
    <ThemeCtx.Provider value={{ mode, setMode }}>
      <AuthProvider key={mode}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <Gate />
      </AuthProvider>
    </ThemeCtx.Provider>
  );
}
