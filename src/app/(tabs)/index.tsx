import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { listCards } from '../../lib/db';
import { Card } from '../../lib/types';
import { ScaledCard } from '../../components/CardView';
import { PRESETS, PRESET_KEYS, BHUTAN_KEYS, MORE_KEYS } from '../../lib/presets';
import { isDark } from '../../lib/color';
import { Btn } from '../../components/Btn';
import { Header } from '../../components/Header';
import { C, shadow } from '../../lib/theme';

// HOME: search bar + 2x2 grid of occasion tiles + a row of Bhutanese templates.
// A tile opens the editor with a preset.
export default function Home() {
  const { session } = useAuth();
  const name = (session!.user.user_metadata?.name as string) || (session!.user.email ?? '').split('@')[0];
  const [recent, setRecent] = useState<Card[]>([]);
  useFocusEffect(useCallback(() => { listCards(session!.user.id).then((c) => setRecent(c.slice(0, 8))); }, [session]));
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [q, setQ] = useState('');

  const GAP = 14;
  const tileW = (width - 16 * 2 - GAP) / 2;
  const match = (k: string) => PRESETS[k].label.toLowerCase().includes(q.trim().toLowerCase());
  const keys = PRESET_KEYS.filter(match);
  const bhutan = BHUTAN_KEYS.filter(match);
  const more = MORE_KEYS.filter(match);
  const open = (k: string) => router.push({ pathname: '/editor', params: { preset: k } });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={`Hi ${name}`} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 24 }}>
        <TextInput
          style={{ height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 16, fontSize: 16, color: C.text, marginBottom: 18 }}
          placeholder="🔍  Search occasions"
          placeholderTextColor={C.muted}
          value={q}
          onChangeText={setQ}
        />

        {/* quick actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1 }}><Btn full label="＋  New card" onPress={() => router.push('/editor')} /></View>
          <View style={{ flex: 1 }}><Btn full kind="soft" label="📷  Scan QR" onPress={() => router.push('/scan')} /></View>
        </View>

        {/* your latest cards */}
        {recent.length > 0 && !q && (
          <View style={{ marginBottom: 22 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 12 }}>Recent cards</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 8 }}>
              {recent.map((c) => (
                <Pressable key={c.id} onPress={() => router.push({ pathname: '/editor', params: { id: c.id } })} style={[{ borderRadius: 16 }, shadow]}>
                  <ScaledCard card={c} frame={3} width={96} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {keys.length > 0 && <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 12 }}>Choose an occasion</Text>}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {keys.map((k) => {
            const p = PRESETS[k];
            return (
              <Pressable
                key={k}
                onPress={() => open(k)}
                style={({ pressed }) => [
                  { width: tileW, height: tileW, borderRadius: 22, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 },
                  shadow,
                ]}
              >
                <Text style={{ fontSize: 54 }}>{p.emoji}</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, marginTop: 8 }}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {bhutan.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>Bhutanese cards</Text>
            <Text style={{ color: C.muted, marginBottom: 12, marginTop: 2 }}>Festival and greeting cards with prayer flags and Dzongkha</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 8 }}>
              {bhutan.map((k) => {
                const p = PRESETS[k];
                const ink = isDark(p.bg) ? '#FFFFFF' : '#2B2340';
                return (
                  <Pressable
                    key={k}
                    onPress={() => open(k)}
                    style={({ pressed }) => [
                      { width: 130, height: 120, borderRadius: 20, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 },
                      shadow,
                    ]}
                  >
                    <Text style={{ fontSize: 40 }}>{p.emoji}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: ink, marginTop: 6 }}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {more.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 12 }}>More templates</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {more.map((k) => {
                const p = PRESETS[k];
                return (
                  <Pressable key={k} onPress={() => open(k)} style={({ pressed }) => [{ width: 130, height: 120, borderRadius: 20, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 }, shadow]}>
                    <Text style={{ fontSize: 40 }}>{p.emoji}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: C.text, marginTop: 6 }}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {keys.length === 0 && bhutan.length === 0 && more.length === 0 && (
          <Text style={{ color: C.muted, textAlign: 'center', marginVertical: 20 }}>No occasion found. You can still make a blank card.</Text>
        )}

      </ScrollView>
    </View>
  );
}
