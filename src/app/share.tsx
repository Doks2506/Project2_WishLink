import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, Alert, Share, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import * as Clipboard from 'expo-clipboard';
import { File } from 'expo-file-system';
import { saveToGallery } from '../lib/media';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../lib/auth';
import { getCard, saveCard, syncAll } from '../lib/db';
import { Card, FRAMES } from '../lib/types';
import { exportGif } from '../lib/gif';
import CardView from '../components/CardView';
import { Btn } from '../components/Btn';
import { Header } from '../components/Header';
import { C, shadow } from '../lib/theme';

// the address of your hosted viewer page (from .env), without a "/" at the end
const VIEWER = (process.env.EXPO_PUBLIC_VIEWER_URL ?? '').trim().replace(/\/+$/, '');
const viewerOk = VIEWER.startsWith('http') && !VIEWER.includes('YOUR-');
const linkFor = (cardId: string) => `${VIEWER}/?id=${cardId}`;

// SHARE & DOWNLOAD: QR code at the top, primary button = GIF, secondary button = Link.
export default function SharePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [card, setCard] = useState<Card | null>(null);
  const [frame, setFrame] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [gifUri, setGifUri] = useState<string | null>(null);
  const [gifInfo, setGifInfo] = useState(''); // e.g. "0.42 MB, 1.5 seconds"
  const [link, setLink] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const cardRef = useRef<View>(null);
  const qrRef = useRef<View>(null);
  const [still, setStill] = useState(false); // pauses the animation while a picture of the card is taken
  const [imgBusy, setImgBusy] = useState(false);

  useEffect(() => {
    getCard(id).then((c) => {
      setCard(c);
      if (c && c.shared && c.synced && viewerOk) setLink(linkFor(c.id));
    });
  }, [id]);

  // animate the preview (paused while the GIF is being made)
  useEffect(() => {
    if (exporting || still) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % FRAMES), 150);
    return () => clearInterval(t);
  }, [exporting, still]);

  // 1) check the viewer address  2) mark the card as shared  3) upload it to Supabase  4) build the link for the QR
  async function createLink() {
    if (!card) return;
    if (!viewerOk) {
      return Alert.alert(
        'Viewer address is missing',
        'Open your .env file and set\nEXPO_PUBLIC_VIEWER_URL=https://your-site.netlify.app\n(no "/" at the end). Save it, then restart Expo with: npx expo start -c'
      );
    }
    setLinkBusy(true);
    try {
      await saveCard({ ...card, shared: 1 });
      await syncAll(session!.user.id);
      setLink(linkFor(card.id));
    } catch (e: any) {
      // show the REAL reason (before, every error was shown as "offline")
      const m = String(e?.message ?? e);
      const offline = /network|fetch|internet|timeout|failed to connect/i.test(m);
      Alert.alert(offline ? 'No internet' : 'Could not upload the card', offline ? 'Connect to the internet and try again.' : m);
    }
    setLinkBusy(false);
  }

  async function makeGif() {
    setExporting(true);
    setProgress(0);
    try {
      const uri = await exportGif(cardRef, setFrame, setProgress);
      setGifUri(uri);
      try {
        const bytes = new File(uri).size; // the proposal asks for a GIF under 5 MB and up to 3 seconds
        setGifInfo(bytes ? `${(bytes / 1048576).toFixed(2)} MB, ${(FRAMES * 0.15).toFixed(1)} seconds` : '');
      } catch {}
    } catch (e: any) {
      Alert.alert('GIF failed', String(e?.message ?? e));
    }
    setExporting(false);
  }

  function told(how: 'gallery' | 'folder' | 'share' | 'none', what: string) {
    if (how === 'gallery') Alert.alert('Saved', `${what} was saved to your gallery.`);
    else if (how === 'folder') Alert.alert('Saved', `${what} was saved in the folder you chose. Open your gallery or Files app to see it.`);
    else if (how === 'none') Alert.alert('Could not save', 'Saving is not available on this phone.');
  }

  // save the card as a PNG picture (a still of the card, not the animation)
  async function saveImage() {
    setImgBusy(true);
    try {
      setStill(true);
      setFrame(3);
      await new Promise((r) => setTimeout(r, 400)); // let the card draw frame 3
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      told(await saveToGallery(uri), 'The card image');
    } catch (e: any) {
      Alert.alert('Could not save the image', String(e?.message ?? e));
    }
    setStill(false);
    setImgBusy(false);
  }

  async function saveQr() {
    try {
      const uri = await captureRef(qrRef, { format: 'png', quality: 1, result: 'tmpfile' });
      told(await saveToGallery(uri), 'The QR code');
    } catch (e: any) {
      Alert.alert('Could not save the QR code', String(e?.message ?? e));
    }
  }

  async function shareGif() {
    if (gifUri && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(gifUri, { mimeType: 'image/gif', dialogTitle: 'Share your WishLink GIF' });
    }
  }

  if (!card) return null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Share & Download" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: 'center', paddingBottom: insets.bottom + 40 }}>
        {/* 1. QR code at the top */}
        <View style={[{ backgroundColor: C.card, borderRadius: 22, padding: 18, alignItems: 'center', alignSelf: 'stretch', marginBottom: 16 }, shadow]}>
          {link ? (
            <>
              <View ref={qrRef} collapsable={false} style={{ backgroundColor: '#fff', padding: 10 }}>
                <QRCode value={link} size={200} />
              </View>
              <Text selectable style={{ fontSize: 12, color: C.muted, marginTop: 12, textAlign: 'center' }}>{link}</Text>
            </>
          ) : (
            <View style={{ width: 200, height: 200, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: C.border, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <Text style={{ fontSize: 40 }}>🔗</Text>
              <Text style={{ color: C.muted, textAlign: 'center', marginTop: 8 }}>Press "Create link" to make your QR code. Needs internet once.</Text>
            </View>
          )}
        </View>

        {/* 2. primary button: GIF */}
        <View style={{ alignSelf: 'stretch' }}>
          {exporting && (
            <View style={{ height: 8, backgroundColor: C.soft, borderRadius: 4, marginBottom: 10, overflow: 'hidden' }}>
              <View style={{ height: 8, width: `${Math.round(progress * 100)}%`, backgroundColor: C.primary }} />
            </View>
          )}
          <Btn full label={exporting ? `Making GIF... ${Math.round(progress * 100)}%` : gifUri ? 'Create GIF again' : 'Download GIF'} onPress={makeGif} disabled={exporting} />
          {!!gifUri && !!gifInfo && <Text style={{ color: C.muted, textAlign: 'center', marginTop: 8 }}>GIF ready: {gifInfo}</Text>}
          {gifUri && <Btn full kind="soft" label="Save GIF to gallery" onPress={async () => told(await saveToGallery(gifUri), 'The GIF')} style={{ marginTop: 10 }} />}
          {gifUri && <Btn full kind="soft" label="Share GIF (WhatsApp, etc.)" onPress={shareGif} style={{ marginTop: 10 }} />}

          {/* the card as a normal picture */}
          <Btn full kind="outline" label="Save card as image (PNG)" loading={imgBusy} onPress={saveImage} style={{ marginTop: 10 }} />

          {/* 3. secondary button: Link */}
          <Btn
            full
            kind="outline"
            label={link ? 'Share link' : 'Create link'}
            loading={linkBusy}
            onPress={link ? () => Share.share({ message: `I made you a card: ${link}` }) : createLink}
            style={{ marginTop: 10 }}
          />
          {/* test button: opens the link in this phone's browser, so you can see if the viewer page works */}
          {link && <Btn full kind="soft" label="Copy link" onPress={async () => { await Clipboard.setStringAsync(link); Alert.alert('Copied', 'The link is copied. Paste it in any chat.'); }} style={{ marginTop: 10 }} />}
          {link && <Btn full kind="soft" label="Save QR code as image" onPress={saveQr} style={{ marginTop: 10 }} />}
          {link && <Btn full kind="soft" label="Test: open link in browser" onPress={() => Linking.openURL(link)} style={{ marginTop: 10 }} />}
        </View>

        {gifUri && (
          <Image source={{ uri: gifUri }} style={{ width: 150, height: 200, borderRadius: 14, marginTop: 18 }} />
        )}

        {/* the card the GIF is made from (the GIF takes a picture of this view) */}
        <Text style={{ color: C.muted, marginTop: 22, marginBottom: 10 }}>Your card</Text>
        <View style={[{ borderRadius: 20 }, shadow]}>
          <View ref={cardRef} collapsable={false}>
            <CardView card={card} frame={frame} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
