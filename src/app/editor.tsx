import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, useWindowDimensions, PanResponder } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useAuth } from '../lib/auth';
import { getCard, saveCard, newId } from '../lib/db';
import { BG_COLORS, STICKERS, EFFECTS, FRAMES } from '../lib/types';
import { CardStyle, DEFAULT_STYLE, parseStyle, Stroke, FONTS, TEXT_COLORS, PEN_COLORS } from '../lib/cardstyle';
import { PRESETS } from '../lib/presets';
import { ScaledCard, CARD_W } from '../components/CardView';
import { Btn } from '../components/Btn';
import { Header } from '../components/Header';
import { C, shadow } from '../lib/theme';

const EFFECT_LABEL: Record<string, string> = { sparkle: '✨ Sparkle', hearts: '❤️ Hearts', confetti: '🎊 Confetti', flags: '🏳️ Prayer flags', none: '🚫 None' };

type Tool = 'text' | 'bg' | 'sticker' | 'draw' | 'animate';
const TOOLS: { key: Tool; icon: string; label: string }[] = [
  { key: 'text', icon: 'Aa', label: 'Text' },
  { key: 'bg', icon: '🖼️', label: 'Background' },
  { key: 'sticker', icon: '😀', label: 'Sticker' },
  { key: 'draw', icon: '✏️', label: 'Draw' },
  { key: 'animate', icon: '✨', label: 'Animate' },
];

function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 14, height: 40, borderRadius: 20, backgroundColor: on ? C.primary : C.soft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontWeight: '700', color: on ? '#fff' : C.primary }}>{label}</Text>
    </Pressable>
  );
}
const Label = ({ t }: { t: string }) => <Text style={{ fontWeight: '800', color: C.text, marginTop: 14, marginBottom: 8 }}>{t}</Text>;
const Row = ({ children }: { children: any }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>{children}</View>;

function Swatch({ color, on, onPress, size = 38 }: { color: string; on: boolean; onPress: () => void; size?: number }) {
  return (
    <Pressable onPress={onPress} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 3, borderColor: on ? C.primary : C.border }} />
  );
}

// CARD EDITOR: the card on top, a tool panel, and a bottom toolbar with 5 tools.
export default function Editor() {
  const { id, preset } = useLocalSearchParams<{ id?: string; preset?: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [tool, setTool] = useState<Tool>('text');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [bg, setBg] = useState(BG_COLORS[0]);
  const [sticker, setSticker] = useState(STICKERS[0]);
  const [effect, setEffect] = useState(EFFECTS[0]);
  const [image, setImage] = useState(''); // BACKGROUND photo ('' = none)
  const [style, setStyle] = useState<CardStyle>(DEFAULT_STYLE);
  const [picking, setPicking] = useState(false);
  const [shared, setShared] = useState(0);
  const [frame, setFrame] = useState(0);

  // drawing
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penW, setPenW] = useState(5);
  const [live, setLive] = useState<Stroke | null>(null);

  const set = (p: Partial<CardStyle>) => setStyle((s) => ({ ...s, ...p }));

  // open an existing card
  useEffect(() => {
    if (!id) return;
    getCard(id).then((c) => {
      if (!c) return;
      setTitle(c.title); setMessage(c.message); setBg(c.bg);
      setSticker(c.sticker); setEffect(c.effect); setImage(c.image ?? ''); setStyle(parseStyle(c.extra)); setShared(c.shared);
    });
  }, [id]);

  // new card started from a tile on the Home screen
  useEffect(() => {
    if (id || !preset || !PRESETS[preset]) return;
    const p = PRESETS[preset];
    setTitle(p.title); setMessage(p.message); setBg(p.bg); setSticker(p.sticker); setEffect(p.effect); setImage(''); setStyle(DEFAULT_STYLE);
  }, [id, preset]);

  // animate the live preview
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % FRAMES), 150);
    return () => clearInterval(t);
  }, []);

  // BACKGROUND PHOTO: from the gallery or the camera.
  // 1) pick/take the photo and crop it to the card shape (3:4)
  // 2) shrink to 540 px wide and compress, so it stays small (about 100 KB)
  // 3) keep it as text ("data:image/jpeg;base64,...") so it saves in SQLite, syncs to Supabase and shows in the viewer
  async function getPhoto(from: 'gallery' | 'camera') {
    try {
      let res;
      if (from === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert('Camera permission needed', 'Please allow the camera for this app in your phone settings.');
        res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 4], quality: 1 });
      } else {
        res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 1 });
      }
      if (res.canceled) return;
      setPicking(true);
      const ctx = ImageManipulator.manipulate(res.assets[0].uri);
      ctx.resize({ width: 540 });
      const ref = await ctx.renderAsync();
      const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
      if (out.base64) {
        setImage(`data:image/jpeg;base64,${out.base64}`);
        if (style.scrim === 0) set({ scrim: 0.3 }); // a little dark layer so the text is easy to read
      }
    } catch (e: any) {
      Alert.alert('Could not use this picture', String(e?.message ?? e));
    }
    setPicking(false);
  }

  // DRAWING: a finger drag on the card becomes an SVG path. Coordinates are divided by the scale so they match the 300x400 card.
  const W = Math.max(Math.min(230, width - 100, (height - 420) * 0.75), 150);
  const scale = W / CARD_W;
  const dr = useRef({ s: 1, c: PEN_COLORS[0], w: 5, d: '' });
  dr.current.s = scale; dr.current.c = penColor; dr.current.w = penW;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const x = Math.round(e.nativeEvent.locationX / dr.current.s);
        const y = Math.round(e.nativeEvent.locationY / dr.current.s);
        dr.current.d = `M${x} ${y}`;
        setLive({ c: dr.current.c, w: dr.current.w, d: `${dr.current.d} L${x} ${y + 0.1}` });
      },
      onPanResponderMove: (e) => {
        const x = Math.round(e.nativeEvent.locationX / dr.current.s);
        const y = Math.round(e.nativeEvent.locationY / dr.current.s);
        dr.current.d += ` L${x} ${y}`;
        setLive({ c: dr.current.c, w: dr.current.w, d: dr.current.d });
      },
      onPanResponderRelease: () => {
        const stroke: Stroke = { c: dr.current.c, w: dr.current.w, d: dr.current.d || '' };
        if (stroke.d) setStyle((s) => ({ ...s, strokes: [...s.strokes, stroke] }));
        dr.current.d = '';
        setLive(null);
      },
    })
  ).current;

  async function save() {
    if (!title.trim()) {
      setTool('text');
      return Alert.alert('Add a title first');
    }
    await saveCard({ id: id ?? newId(), user_id: session!.user.id, title: title.trim(), message: message.trim(), bg, sticker, effect, image, extra: JSON.stringify(style), shared });
    router.replace('/cards');
  }

  const input = { borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, backgroundColor: '#fff', color: C.text, fontSize: 16 } as const;
  const shown: CardStyle = live ? { ...style, strokes: [...style.strokes, live] } : style;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={id ? 'Edit card' : 'New card'} onBack={() => router.back()} right={<Btn small label="Save" onPress={save} />} />

      <ScrollView scrollEnabled={tool !== 'draw'} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 4 }}>
        {/* the card (a see-through layer on top catches the finger while the Draw tool is open) */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View style={[{ width: W, height: (W * CARD_H_RATIO), borderRadius: 24 }, shadow]}>
            <ScaledCard card={{ title, message, bg, sticker, effect, image, style: shown }} frame={frame} width={W} />
            {tool === 'draw' && <View {...pan.panHandlers} style={{ position: 'absolute', left: 0, top: 0, width: W, height: W * CARD_H_RATIO }} />}
          </View>
        </View>

        {/* tool panel: shows the controls of the selected tool */}
        <View style={[{ backgroundColor: C.card, borderRadius: 20, padding: 16 }, shadow]}>
          {tool === 'text' && (
            <View>
              <TextInput style={[input, { height: 50, marginBottom: 12 }]} placeholder="Title (e.g. Happy Birthday!)" placeholderTextColor={C.muted} value={title} onChangeText={setTitle} />
              <TextInput style={[input, { height: 90, paddingTop: 12, textAlignVertical: 'top' }]} placeholder="Write your message" placeholderTextColor={C.muted} multiline value={message} onChangeText={setMessage} />

              <Label t="Font" />
              <Row>{FONTS.map((f) => <Chip key={f.key} on={style.font === f.key} label={f.label} onPress={() => set({ font: f.key })} />)}</Row>

              <Label t={`Title size  ${style.tSize}`} />
              <Row>
                <Chip on={false} label="A−" onPress={() => set({ tSize: Math.max(16, style.tSize - 2) })} />
                <Chip on={false} label="A+" onPress={() => set({ tSize: Math.min(44, style.tSize + 2) })} />
              </Row>
              <Label t={`Message size  ${style.mSize}`} />
              <Row>
                <Chip on={false} label="A−" onPress={() => set({ mSize: Math.max(11, style.mSize - 1) })} />
                <Chip on={false} label="A+" onPress={() => set({ mSize: Math.min(28, style.mSize + 1) })} />
              </Row>

              <Label t="Style" />
              <Row>
                <Chip on={style.bold} label="Bold title" onPress={() => set({ bold: !style.bold })} />
                <Chip on={style.italic} label="Italic" onPress={() => set({ italic: !style.italic })} />
              </Row>

              <Label t="Align" />
              <Row>
                <Chip on={style.align === 'left'} label="Left" onPress={() => set({ align: 'left' })} />
                <Chip on={style.align === 'center'} label="Centre" onPress={() => set({ align: 'center' })} />
                <Chip on={style.align === 'right'} label="Right" onPress={() => set({ align: 'right' })} />
              </Row>

              <Label t="Position on card" />
              <Row>
                <Chip on={style.pos === 'top'} label="Top" onPress={() => set({ pos: 'top' })} />
                <Chip on={style.pos === 'center'} label="Middle" onPress={() => set({ pos: 'center' })} />
                <Chip on={style.pos === 'bottom'} label="Bottom" onPress={() => set({ pos: 'bottom' })} />
              </Row>

              <Label t="Text colour" />
              <Row>
                <Chip on={style.color === ''} label="Auto" onPress={() => set({ color: '' })} />
                {TEXT_COLORS.map((c) => <Swatch key={c} color={c} on={style.color === c} onPress={() => set({ color: c })} />)}
              </Row>
            </View>
          )}

          {tool === 'bg' && (
            <View>
              <Text style={{ fontWeight: '800', color: C.text, marginBottom: 8 }}>Background photo</Text>
              <Btn full label="🖼️  Choose from gallery" onPress={() => getPhoto('gallery')} loading={picking} />
              <Btn full kind="soft" label="📷  Take a photo" onPress={() => getPhoto('camera')} style={{ marginTop: 10 }} />
              {!!image && (
                <>
                  <Btn full kind="outline" label="Remove photo" onPress={() => setImage('')} style={{ marginTop: 10 }} />
                  <Label t="Dark layer (makes text easier to read)" />
                  <Row>
                    <Chip on={style.scrim === 0} label="None" onPress={() => set({ scrim: 0 })} />
                    <Chip on={style.scrim === 0.3} label="Light" onPress={() => set({ scrim: 0.3 })} />
                    <Chip on={style.scrim === 0.55} label="Dark" onPress={() => set({ scrim: 0.55 })} />
                  </Row>
                </>
              )}
              <Label t="Or a plain colour" />
              <Row>
                {BG_COLORS.map((c) => <Swatch key={c} color={c} on={bg === c} onPress={() => setBg(c)} size={42} />)}
              </Row>
            </View>
          )}

          {tool === 'sticker' && (
            <View>
              <Row>
                <Pressable onPress={() => setSticker('')} style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: sticker === '' ? C.soft : '#fff', borderWidth: 2, borderColor: sticker === '' ? C.primary : C.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontWeight: '700', color: C.muted }}>None</Text>
                </Pressable>
                {STICKERS.map((s) => (
                  <Pressable key={s} onPress={() => setSticker(s)} style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: sticker === s ? C.soft : '#fff', borderWidth: 2, borderColor: sticker === s ? C.primary : C.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 28 }}>{s}</Text>
                  </Pressable>
                ))}
              </Row>
            </View>
          )}

          {tool === 'draw' && (
            <View>
              <Text style={{ color: C.muted, marginBottom: 4 }}>Draw with your finger on the card above.</Text>
              <Label t="Pen colour" />
              <Row>{PEN_COLORS.map((c) => <Swatch key={c} color={c} on={penColor === c} onPress={() => setPenColor(c)} />)}</Row>
              <Label t="Pen size" />
              <Row>
                <Chip on={penW === 3} label="Thin" onPress={() => setPenW(3)} />
                <Chip on={penW === 5} label="Medium" onPress={() => setPenW(5)} />
                <Chip on={penW === 10} label="Thick" onPress={() => setPenW(10)} />
              </Row>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <View style={{ flex: 1 }}><Btn full kind="soft" label="↩ Undo" onPress={() => set({ strokes: style.strokes.slice(0, -1) })} /></View>
                <View style={{ flex: 1 }}><Btn full kind="outline" label="Clear all" onPress={() => set({ strokes: [] })} /></View>
              </View>
            </View>
          )}

          {tool === 'animate' && (
            <Row>{EFFECTS.map((e) => <Chip key={e} on={effect === e} label={EFFECT_LABEL[e] ?? e} onPress={() => setEffect(e)} />)}</Row>
          )}
        </View>
      </ScrollView>

      {/* bottom toolbar: 5 tool buttons */}
      <View style={{ flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, paddingBottom: insets.bottom + 8, paddingHorizontal: 4 }}>
        {TOOLS.map((t) => {
          const on = tool === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTool(t.key)} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 2, borderRadius: 14, backgroundColor: on ? C.soft : 'transparent' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: C.primary }}>{t.icon}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', marginTop: 2, color: on ? C.primary : C.muted }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </KeyboardAvoidingView>
  );
}

const CARD_H_RATIO = 4 / 3;
