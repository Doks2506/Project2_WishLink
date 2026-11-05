import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, useWindowDimensions, PanResponder } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useAuth } from '../lib/auth';
import { getCard, saveCard, newId } from '../lib/db';
import { BG_COLORS, STICKERS, EFFECTS, FRAMES } from '../lib/types';
import { CardStyle, DEFAULT_STYLE, parseStyle, Stroke, Item, FONTS, TEXT_COLORS, PEN_COLORS, newItemId, legacyToItems } from '../lib/cardstyle';
import { PRESETS, presetItems, blankItems } from '../lib/presets';
import { ScaledCard, CARD_W, CARD_H } from '../components/CardView';
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
  return <Pressable onPress={onPress} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 3, borderColor: on ? C.primary : C.border }} />;
}

// An invisible box laid over one text or sticker on the card. Touch it to select it, drag it to move it.
// We move it by (finger movement / scale), so it follows the finger exactly on any screen size.
function DragBox(p: {
  id: string; x: number; y: number; w: number; h: number; s: number; selected: boolean;
  onSelect: (id: string) => void; onMove: (id: string, x: number, y: number) => void; onDrag: (on: boolean) => void;
}) {
  const live = useRef(p);
  live.current = p;
  const start = useRef({ x: 0, y: 0 });
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start.current = { x: live.current.x, y: live.current.y };
        live.current.onSelect(live.current.id);
        live.current.onDrag(true);
      },
      onPanResponderMove: (_, g) => live.current.onMove(live.current.id, start.current.x + g.dx / live.current.s, start.current.y + g.dy / live.current.s),
      onPanResponderRelease: () => live.current.onDrag(false),
      onPanResponderTerminate: () => live.current.onDrag(false),
    })
  ).current;
  const pad = 5;
  return (
    <View
      {...pan.panHandlers}
      style={{
        position: 'absolute', left: p.x * p.s - pad, top: p.y * p.s - pad,
        width: Math.max(p.w * p.s + pad * 2, 32), height: Math.max(p.h * p.s + pad * 2, 32),
        borderWidth: p.selected ? 1.5 : 0, borderStyle: 'dashed', borderColor: C.primary, borderRadius: 6,
        backgroundColor: p.selected ? 'rgba(91,62,150,0.08)' : 'transparent',
      }}
    />
  );
}

// CARD EDITOR: the card on top (touch a text or sticker to select it, drag to move it), a tool panel, and a bottom toolbar.
export default function Editor() {
  const { id, preset } = useLocalSearchParams<{ id?: string; preset?: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [tool, setTool] = useState<Tool>('text');
  const [items, setItems] = useState<Item[]>(() => blankItems()); // the movable text boxes and stickers
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({}); // measured size of every box
  const [dragging, setDragging] = useState(false);
  const [bg, setBg] = useState(BG_COLORS[0]);
  const [effect, setEffect] = useState(EFFECTS[0]);
  const [image, setImage] = useState(''); // BACKGROUND photo ('' = none)
  const [style, setStyle] = useState<CardStyle>(DEFAULT_STYLE);
  const [picking, setPicking] = useState(false);
  const [shared, setShared] = useState(0);
  const [tick, setTick] = useState(0); // animation frame

  // drawing
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penW, setPenW] = useState(5);
  const [live, setLive] = useState<Stroke | null>(null);

  const set = (p: Partial<CardStyle>) => setStyle((s) => ({ ...s, ...p }));
  const upd = (itemId: string, p: Partial<Item>) => setItems((a) => a.map((i) => (i.id === itemId ? { ...i, ...p } : i)));
  const sel = items.find((i) => i.id === selectedId) ?? null;

  // open an existing card (an old card is turned into movable boxes)
  useEffect(() => {
    if (!id) return;
    getCard(id).then((c) => {
      if (!c) return;
      const st = parseStyle(c.extra);
      setBg(c.bg); setEffect(c.effect); setImage(c.image ?? ''); setShared(c.shared); setStyle(st);
      setItems(Array.isArray(st.items) ? st.items : legacyToItems(c, st));
    });
  }, [id]);

  // new card started from a template on the Home screen
  useEffect(() => {
    if (id || !preset || !PRESETS[preset]) return;
    const p = PRESETS[preset];
    setItems(presetItems(preset)); setBg(p.bg); setEffect(p.effect); setImage(''); setStyle({ ...DEFAULT_STYLE, frame: p.frame });
  }, [id, preset]);

  // animate the live preview
  useEffect(() => {
    const t = setInterval(() => setTick((f) => (f + 1) % FRAMES), 150);
    return () => clearInterval(t);
  }, []);

  // ---------- the boxes ----------
  function onItemLayout(itemId: string, w: number, h: number) {
    setSizes((p) => {
      const o = p[itemId];
      if (o && Math.abs(o.w - w) < 0.5 && Math.abs(o.h - h) < 0.5) return p;
      return { ...p, [itemId]: { w, h } };
    });
  }

  function select(itemId: string) {
    setSelectedId(itemId);
    const it = items.find((i) => i.id === itemId);
    if (it) setTool(it.kind === 'sticker' ? 'sticker' : 'text');
  }

  // keep at least a corner of the box on the card, so it can never be lost off the edge
  function moveItem(itemId: string, x: number, y: number) {
    const sz = sizes[itemId] ?? { w: 60, h: 40 };
    const nx = Math.max(-(sz.w - 30), Math.min(CARD_W - 30, x));
    const ny = Math.max(-(sz.h - 20), Math.min(CARD_H - 20, y));
    upd(itemId, { x: Math.round(nx), y: Math.round(ny) });
  }

  function addText() {
    const it: Item = { id: newItemId(), kind: 'text', text: 'New text', x: 40, y: 170, w: 220, size: 22, align: 'center' };
    setItems((a) => [...a, it]);
    setSelectedId(it.id);
    setTool('text');
  }
  function addSticker(emoji: string) {
    const it: Item = { id: newItemId(), kind: 'sticker', emoji, x: 120, y: 170, size: 44 };
    setItems((a) => [...a, it]);
    setSelectedId(it.id);
    setTool('sticker');
  }
  function duplicate() {
    if (!sel) return;
    const copy: Item = { ...sel, id: newItemId(), x: sel.x + 16, y: sel.y + 16 };
    setItems((a) => [...a, copy]);
    setSelectedId(copy.id);
  }
  function remove() {
    if (!sel) return;
    setItems((a) => a.filter((i) => i.id !== sel.id));
    setSelectedId(null);
  }

  // ---------- background photo: gallery or camera ----------
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

  // ---------- drawing: a finger drag on the card becomes an SVG path ----------
  const W = Math.max(Math.min(230, width - 100, (height - 420) * 0.75), 150);
  const H = (W * CARD_H) / CARD_W;
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
    // empty text boxes are dropped; the first text is the card's name in My Cards, the others are its message
    const clean = items.filter((i) => i.kind === 'sticker' || (i.text ?? '').trim());
    const texts = clean.filter((i) => i.kind === 'text');
    const title = (texts[0]?.text ?? '').trim().split('\n')[0].slice(0, 60) || 'Untitled card';
    const message = texts.slice(1).map((t) => (t.text ?? '').trim()).join('\n');
    await saveCard({ id: id ?? newId(), user_id: session!.user.id, title, message, bg, sticker: '', effect, image, extra: JSON.stringify({ ...style, items: clean }), shared });
    router.replace('/cards');
  }

  const input = { borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, backgroundColor: '#fff', color: C.text, fontSize: 16 } as const;
  const shown: CardStyle = { ...style, items, strokes: live ? [...style.strokes, live] : style.strokes };
  const fallback = (it: Item) => sizes[it.id] ?? { w: it.w ?? it.size * 1.3, h: it.size * 1.4 };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={id ? 'Edit card' : 'New card'} onBack={() => router.back()} right={<Btn small label="Save" onPress={save} />} />

      <ScrollView scrollEnabled={tool !== 'draw' && !dragging} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 4 }}>
        {/* the card. On top of it: boxes you can touch and drag (or, in the Draw tool, a layer that catches the pen) */}
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <View style={[{ width: W, height: H, borderRadius: 24 }, shadow]}>
            <ScaledCard card={{ title: '', message: '', bg, sticker: '', effect, image, style: shown }} frame={tick} width={W} onItemLayout={onItemLayout} />
            {tool === 'draw' ? (
              <View {...pan.panHandlers} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} />
            ) : (
              <View style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
                <Pressable style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} onPress={() => setSelectedId(null)} />
                {items.map((it) => {
                  const sz = fallback(it);
                  return (
                    <DragBox key={it.id} id={it.id} x={it.x} y={it.y} w={sz.w} h={sz.h} s={scale} selected={it.id === selectedId}
                      onSelect={select} onMove={moveItem} onDrag={setDragging} />
                  );
                })}
              </View>
            )}
          </View>
        </View>
        <Text style={{ color: C.muted, textAlign: 'center', fontSize: 12, marginBottom: 12 }}>
          {tool === 'draw' ? 'Draw on the card with your finger' : 'Touch a text or sticker, then drag it where you like'}
        </Text>

        {/* tool panel: shows the controls of the selected tool */}
        <View style={[{ backgroundColor: C.card, borderRadius: 20, padding: 16 }, shadow]}>
          {tool === 'text' && (
            <View>
              <Btn full label="＋  Add text box" onPress={addText} />
              {sel && sel.kind === 'text' ? (
                <View>
                  <Label t="Text" />
                  <TextInput style={[input, { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' }]} multiline placeholder="Type here" placeholderTextColor={C.muted} value={sel.text ?? ''} onChangeText={(v) => upd(sel.id, { text: v })} />

                  <Label t="Font" />
                  <Row>{FONTS.map((f) => <Chip key={f.key} on={(sel.font ?? 'sans') === f.key} label={f.label} onPress={() => upd(sel.id, { font: f.key })} />)}</Row>

                  <Label t={`Size  ${sel.size}`} />
                  <Row>
                    <Chip on={false} label="A−" onPress={() => upd(sel.id, { size: Math.max(10, sel.size - 2) })} />
                    <Chip on={false} label="A+" onPress={() => upd(sel.id, { size: Math.min(64, sel.size + 2) })} />
                  </Row>

                  <Label t="Box width" />
                  <Row>
                    <Chip on={false} label="Narrower" onPress={() => upd(sel.id, { w: Math.max(80, (sel.w ?? 240) - 20) })} />
                    <Chip on={false} label="Wider" onPress={() => upd(sel.id, { w: Math.min(300, (sel.w ?? 240) + 20) })} />
                  </Row>

                  <Label t="Style" />
                  <Row>
                    <Chip on={!!sel.bold} label="Bold" onPress={() => upd(sel.id, { bold: !sel.bold })} />
                    <Chip on={!!sel.italic} label="Italic" onPress={() => upd(sel.id, { italic: !sel.italic })} />
                  </Row>

                  <Label t="Align" />
                  <Row>
                    <Chip on={(sel.align ?? 'center') === 'left'} label="Left" onPress={() => upd(sel.id, { align: 'left' })} />
                    <Chip on={(sel.align ?? 'center') === 'center'} label="Centre" onPress={() => upd(sel.id, { align: 'center' })} />
                    <Chip on={(sel.align ?? 'center') === 'right'} label="Right" onPress={() => upd(sel.id, { align: 'right' })} />
                  </Row>

                  <Label t="Colour" />
                  <Row>
                    <Chip on={!sel.color} label="Auto" onPress={() => upd(sel.id, { color: '' })} />
                    {TEXT_COLORS.map((c) => <Swatch key={c} color={c} on={sel.color === c} onPress={() => upd(sel.id, { color: c })} />)}
                  </Row>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                    <View style={{ flex: 1 }}><Btn full kind="soft" label="Duplicate" onPress={duplicate} /></View>
                    <View style={{ flex: 1 }}><Btn full kind="danger" label="Delete" onPress={remove} /></View>
                  </View>
                </View>
              ) : (
                <Text style={{ color: C.muted, marginTop: 12 }}>Touch any text on the card to edit it, or add a new text box.</Text>
              )}
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
              <Row>{BG_COLORS.map((c) => <Swatch key={c} color={c} on={bg === c} onPress={() => setBg(c)} size={42} />)}</Row>
              <Label t="Frame" />
              <Row>
                <Chip on={style.frame === 'none'} label="None" onPress={() => set({ frame: 'none' })} />
                <Chip on={style.frame === 'line'} label="Line" onPress={() => set({ frame: 'line' })} />
                <Chip on={style.frame === 'double'} label="Double" onPress={() => set({ frame: 'double' })} />
              </Row>
            </View>
          )}

          {tool === 'sticker' && (
            <View>
              <Text style={{ fontWeight: '800', color: C.text, marginBottom: 8 }}>Tap an emoji to add it to the card</Text>
              <Row>
                {STICKERS.map((s) => (
                  <Pressable key={s} onPress={() => addSticker(s)} style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: '#fff', borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 28 }}>{s}</Text>
                  </Pressable>
                ))}
              </Row>
              {sel && sel.kind === 'sticker' ? (
                <View>
                  <Label t={`Selected sticker  ${sel.emoji}   size ${sel.size}`} />
                  <Row>
                    <Chip on={false} label="Smaller" onPress={() => upd(sel.id, { size: Math.max(16, sel.size - 6) })} />
                    <Chip on={false} label="Bigger" onPress={() => upd(sel.id, { size: Math.min(140, sel.size + 6) })} />
                  </Row>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                    <View style={{ flex: 1 }}><Btn full kind="soft" label="Duplicate" onPress={duplicate} /></View>
                    <View style={{ flex: 1 }}><Btn full kind="danger" label="Delete" onPress={remove} /></View>
                  </View>
                </View>
              ) : (
                <Text style={{ color: C.muted, marginTop: 12 }}>Touch a sticker on the card to move it, resize it or delete it.</Text>
              )}
            </View>
          )}

          {tool === 'draw' && (
            <View>
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

          {tool === 'animate' && <Row>{EFFECTS.map((e) => <Chip key={e} on={effect === e} label={EFFECT_LABEL[e] ?? e} onPress={() => setEffect(e)} />)}</Row>}
        </View>
      </ScrollView>

      {/* bottom toolbar */}
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
