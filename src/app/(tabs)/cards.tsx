import { useCallback, useState } from 'react';
import { View, Text, TextInput, FlatList, Alert, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { listCards, removeCard, syncAll } from '../../lib/db';
import { Card } from '../../lib/types';
import { Btn } from '../../components/Btn';
import { Header } from '../../components/Header';
import { ScaledCard } from '../../components/CardView';
import { C, shadow } from '../../lib/theme';

// MY CARDS: search bar + list of rows (thumbnail, title, status, edit/share/delete).
export default function MyCards() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [q, setQ] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => setCards(await listCards(userId)), [userId]);
  useFocusEffect(useCallback(() => {
    load();
    // automatic sync in the background; if there is no internet it stays quiet
    syncAll(userId).then(load).catch(() => {});
  }, [load, userId]));

  async function sync() {
    setSyncing(true);
    setNote('');
    try {
      await syncAll(userId);
      await load();
      setNote('All cards are up to date');
    } catch {
      setNote('Offline: your cards are safe on this phone and will sync later');
    }
    setSyncing(false);
  }

  function confirmDelete(c: Card) {
    Alert.alert('Delete card?', c.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await removeCard(c.id); load(); } },
    ]);
  }

  const pending = cards.filter((c) => !c.synced).length;
  const text = q.trim().toLowerCase();
  const shown = text ? cards.filter((c) => c.title.toLowerCase().includes(text) || c.message.toLowerCase().includes(text)) : cards;

  const small = { width: 36, height: 36, borderRadius: 10, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginLeft: 6 } as const;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header
        title="My Cards"
        right={
          // status pill: cards sync by themselves; tap it to sync right now
          <Pressable onPress={sync} disabled={syncing} style={{ paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: pending === 0 ? '#E3F5EC' : '#FFF1D6', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
            {syncing ? <ActivityIndicator size="small" color={C.primary} /> : <Text style={{ fontWeight: '700', fontSize: 13, color: pending === 0 ? C.ok : '#9A6A00' }}>{pending === 0 ? '☁️ Synced' : `⏳ ${pending} waiting`}</Text>}
          </Pressable>
        }
      />

      <View style={{ paddingHorizontal: 16 }}>
        <TextInput
          style={{ height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 16, fontSize: 16, color: C.text }}
          placeholder="🔍  Search my cards"
          placeholderTextColor={C.muted}
          value={q}
          onChangeText={setQ}
        />
        {!!note && <Text style={{ color: C.muted, marginTop: 8 }}>{note}</Text>}
      </View>

      <FlatList
        data={shown}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ fontSize: 56 }}>💌</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginTop: 8 }}>{cards.length === 0 ? 'No cards yet' : 'No card matches your search'}</Text>
            {cards.length === 0 && (
              <View style={{ marginTop: 12 }}>
                <Btn label="Create your first card" onPress={() => router.push('/editor')} />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 18, padding: 10, marginBottom: 12 }, shadow]}>
            <Pressable onPress={() => router.push({ pathname: '/editor', params: { id: item.id } })}>
              <ScaledCard card={item} frame={3} width={60} />
            </Pressable>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 16, color: C.text }}>{item.title}</Text>
              <Text style={{ fontSize: 13, marginTop: 2, color: item.synced ? C.ok : C.muted }}>{item.synced ? '☁️ Synced' : '⏳ Waiting to sync'}</Text>
            </View>
            <Pressable style={small} onPress={() => router.push({ pathname: '/editor', params: { id: item.id } })}><Text>✏️</Text></Pressable>
            <Pressable style={small} onPress={() => router.push({ pathname: '/share', params: { id: item.id } })}><Text>📤</Text></Pressable>
            <Pressable style={small} onPress={() => confirmDelete(item)}><Text>🗑️</Text></Pressable>
          </View>
        )}
      />

      {cards.length > 0 && (
        <Pressable
          onPress={() => router.push('/editor')}
          style={[{ position: 'absolute', right: 20, bottom: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }, shadow]}
        >
          <Text style={{ color: '#fff', fontSize: 32, marginTop: -3 }}>+</Text>
        </Pressable>
      )}
    </View>
  );
}
