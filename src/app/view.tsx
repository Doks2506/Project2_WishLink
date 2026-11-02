import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, Alert, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { saveCard, newId } from '../lib/db';
import { saveToGallery } from '../lib/media';
import { FRAMES } from '../lib/types';
import CardView from '../components/CardView';
import { Btn } from '../components/Btn';
import { Header } from '../components/Header';
import { C, shadow } from '../lib/theme';

const VIEWER = (process.env.EXPO_PUBLIC_VIEWER_URL ?? '').trim().replace(/\/+$/, '');

// A card received by scanning a QR code. The user can save a copy, save it as a picture, or share it.
export default function ViewCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [card, setCard] = useState<any>(null);
  const [error, setError] = useState('');
  const [frame, setFrame] = useState(0);
  const [still, setStill] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef<View>(null);

  useEffect(() => {
    // RLS lets everyone read a card that is shared
    supabase.from('cards').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
      if (error) setError(error.message);
      else if (!data) setError('This card was not found, or its owner has not shared it.');
      else setCard(data);
    });
  }, [id]);

  useEffect(() => {
    if (still) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % FRAMES), 150);
    return () => clearInterval(t);
  }, [still]);

  // keep my own copy: a NEW id and my user id, so it appears in My Cards
  async function saveCopy() {
    await saveCard({
      id: newId(), user_id: session!.user.id, title: card.title, message: card.message, bg: card.bg,
      sticker: card.sticker, effect: card.effect, image: card.image ?? '', extra: card.extra ?? '', shared: 0,
    });
    setSaved(true);
    Alert.alert('Saved', 'A copy of this card is now in My Cards. You can edit it.');
  }

  async function saveImage() {
    try {
      setStill(true);
      setFrame(3);
      await new Promise((r) => setTimeout(r, 400));
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      const how = await saveToGallery(uri);
      if (how === 'gallery' || how === 'folder') Alert.alert('Saved', 'The card image was saved. Open your gallery or Files app to see it.');
    } catch (e: any) {
      Alert.alert('Could not save the image', String(e?.message ?? e));
    }
    setStill(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Received card" onBack={() => router.replace('/')} />
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: 'center', paddingBottom: insets.bottom + 40 }}>
        {error ? (
          <View style={{ alignItems: 'center', padding: 24 }}>
            <Text style={{ fontSize: 48 }}>😕</Text>
            <Text style={{ color: C.text, textAlign: 'center', marginVertical: 12 }}>{error}</Text>
            <Btn label="Scan again" onPress={() => router.replace('/scan')} />
          </View>
        ) : !card ? (
          <Text style={{ color: C.muted, marginTop: 40 }}>Loading the card...</Text>
        ) : (
          <>
            <View style={[{ borderRadius: 20 }, shadow]}>
              <View ref={ref} collapsable={false}>
                <CardView card={card} frame={frame} />
              </View>
            </View>
            <View style={{ alignSelf: 'stretch', marginTop: 20 }}>
              <Btn full label={saved ? '✓ Saved in My Cards' : 'Save a copy to My Cards'} onPress={saveCopy} disabled={saved} />
              <Btn full kind="soft" label="Save as image" onPress={saveImage} style={{ marginTop: 10 }} />
              {!!VIEWER && <Btn full kind="outline" label="Share link" onPress={() => Share.share({ message: `Look at this card: ${VIEWER}/?id=${id}` })} style={{ marginTop: 10 }} />}
              <Btn full kind="outline" label="Scan another" onPress={() => router.replace('/scan')} style={{ marginTop: 10 }} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
