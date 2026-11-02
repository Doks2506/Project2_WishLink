import { View, Text } from 'react-native';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Btn } from '../../components/Btn';
import { Header } from '../../components/Header';
import { C, shadow } from '../../lib/theme';

// PROFILE / SETTINGS: who is logged in + log out.
export default function Profile() {
  const { session } = useAuth();
  const email = session!.user.email ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Profile" />
      <View style={{ padding: 16 }}>
        <View style={[{ backgroundColor: C.card, borderRadius: 22, padding: 22, alignItems: 'center' }, shadow]}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800' }}>{(email[0] ?? '?').toUpperCase()}</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginTop: 12 }}>{email}</Text>
          <Text style={{ color: C.muted, marginTop: 4, textAlign: 'center' }}>Your cards are saved on this phone and synced to the cloud when you press Sync.</Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Btn full kind="danger" label="Log out" onPress={() => supabase.auth.signOut()} />
        </View>
        <Text style={{ textAlign: 'center', color: C.muted, marginTop: 24, fontSize: 12 }}>WishLink · CTE308 Project II</Text>
      </View>
    </View>
  );
}
