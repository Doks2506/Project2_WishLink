import { useState } from 'react';
import { View, Text, TextInput, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeMode } from '../../lib/themeContext';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Btn } from '../../components/Btn';
import { Header } from '../../components/Header';
import { C, shadow } from '../../lib/theme';

// PROFILE / SETTINGS: your name (saved in your Supabase account), your email and Log out.
export default function Profile() {
  const { session } = useAuth();
  const router = useRouter();
  const { mode, setMode } = useThemeMode();
  const email = session!.user.email ?? '';
  const saved = (session!.user.user_metadata?.name as string) || '';
  const [name, setName] = useState(saved);
  const [busy, setBusy] = useState(false);
  const shownName = saved || email.split('@')[0];

  async function saveName() {
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ data: { name: name.trim() } });
    setBusy(false);
    if (error) Alert.alert('Could not save your name', error.message);
    else Alert.alert('Saved', 'Your name was updated.');
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Profile" />
      <View style={{ padding: 16 }}>
        <View style={[{ backgroundColor: C.card, borderRadius: 22, padding: 22, alignItems: 'center' }, shadow]}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800' }}>{(shownName[0] ?? '?').toUpperCase()}</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, marginTop: 12 }}>{shownName}</Text>
          <Text style={{ color: C.muted, marginTop: 2 }}>{email}</Text>
        </View>

        <View style={[{ backgroundColor: C.card, borderRadius: 22, padding: 18, marginTop: 14 }, shadow]}>
          <Text style={{ fontWeight: '800', color: C.text, marginBottom: 8 }}>Your name</Text>
          <TextInput
            style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, height: 50, backgroundColor: C.card, color: C.text, fontSize: 16 }}
            placeholder="Type your name" placeholderTextColor={C.muted} value={name} onChangeText={setName}
          />
          <View style={{ marginTop: 12 }}><Btn full label="Save name" onPress={saveName} loading={busy} disabled={name.trim() === saved} /></View>
          <Text style={{ color: C.muted, marginTop: 12, fontSize: 12 }}>Your cards are saved on this phone and synced to the cloud when internet is available.</Text>
        </View>

        <View style={[{ backgroundColor: C.card, borderRadius: 22, padding: 18, marginTop: 14 }, shadow]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: C.text }}>🌙 Dark mode</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Easier on the eyes at night. Remembered next time.</Text>
            </View>
            <Switch value={mode === 'dark'} onValueChange={(v) => setMode(v ? 'dark' : 'light')} trackColor={{ true: C.primary, false: C.border }} />
          </View>
          <View style={{ marginTop: 14 }}><Btn full kind="soft" label="🔔 Occasion reminders" onPress={() => router.push('/reminders')} /></View>
        </View>

        <View style={{ marginTop: 20 }}>
          <Btn full kind="danger" label="Log out" onPress={() => supabase.auth.signOut()} />
        </View>
        <Text style={{ textAlign: 'center', color: C.muted, marginTop: 24, fontSize: 12 }}>WishLink · CTE308 Project II</Text>
      </View>
    </View>
  );
}
