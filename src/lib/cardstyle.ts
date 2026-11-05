import { Platform } from 'react-native';

// One stroke drawn by the user. d = SVG path text like "M10 20 L12 25 ..." in card units (300 x 400).
export type Stroke = { c: string; w: number; d: string };

// One movable thing on the card: a text box or an emoji sticker. Positions are in card units (the card is 300 x 400).
export type Item = {
  id: string;
  kind: 'text' | 'sticker';
  x: number; // left edge
  y: number; // top edge
  size: number; // font size of the text, or size of the emoji
  text?: string; // text boxes
  w?: number; // text box width
  emoji?: string; // stickers
  font?: string; // sans | serif | mono | fancy
  color?: string; // '' or undefined = automatic (white on dark/photo, dark on light)
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
};

// Everything about how the card LOOKS beyond bg/photo/effect. Saved as JSON text in the "extra" column.
export type CardStyle = {
  // --- old cards (made before movable boxes) use these ---
  font: string;
  tSize: number;
  mSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  pos: 'top' | 'center' | 'bottom';
  // --- all cards ---
  scrim: number; // 0..0.6, dark layer on top of a background photo so the text is readable
  frame: 'none' | 'line' | 'double'; // decorative border
  strokes: Stroke[]; // the drawing
  items?: Item[]; // movable text boxes and stickers. Missing = an old card, drawn with the old layout
};

export const DEFAULT_STYLE: CardStyle = {
  font: 'sans', tSize: 26, mSize: 16, color: '', align: 'center', bold: true, italic: false, pos: 'center', scrim: 0, frame: 'none', strokes: [],
};

export const newItemId = () => Math.random().toString(36).slice(2, 9);

// reads the saved JSON; old cards with nothing saved get the defaults
export function parseStyle(s?: string | null): CardStyle {
  try {
    if (s) return { ...DEFAULT_STYLE, ...JSON.parse(s) };
  } catch {}
  return { ...DEFAULT_STYLE };
}

// Turns an OLD card (title + message + one sticker) into movable boxes, so it can be edited with the new editor.
export function legacyToItems(card: { title: string; message: string; sticker: string }, st: CardStyle): Item[] {
  const W = 252;
  const lines = (txt: string, size: number) =>
    txt.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil((l.length * size * 0.55) / W)), 0);
  const sSize = 60;
  const tH = lines(card.title, st.tSize) * st.tSize * 1.35;
  const mH = lines(card.message, st.mSize) * st.mSize * 1.6;
  const total = (card.sticker ? sSize * 1.35 + 8 : 0) + tH + 8 + mH;
  let y = st.pos === 'top' ? 24 : st.pos === 'bottom' ? 400 - 24 - total : (400 - total) / 2;
  y = Math.max(16, y);
  const items: Item[] = [];
  const color = st.color || undefined;
  if (card.sticker) {
    const x = st.align === 'left' ? 24 : st.align === 'right' ? 276 - sSize * 1.2 : 150 - sSize * 0.6;
    items.push({ id: newItemId(), kind: 'sticker', emoji: card.sticker, x: Math.round(x), y: Math.round(y), size: sSize });
    y += sSize * 1.35 + 8;
  }
  items.push({ id: newItemId(), kind: 'text', text: card.title, x: 24, y: Math.round(y), w: W, size: st.tSize, font: st.font, color, bold: st.bold, italic: st.italic, align: st.align });
  y += tH + 8;
  if (card.message.trim()) {
    items.push({ id: newItemId(), kind: 'text', text: card.message, x: 24, y: Math.round(y), w: W, size: st.mSize, font: st.font, color, bold: false, italic: st.italic, align: st.align });
  }
  return items;
}

export const FONTS = [
  { key: 'sans', label: 'Clean' },
  { key: 'serif', label: 'Serif' },
  { key: 'mono', label: 'Typewriter' },
  { key: 'fancy', label: 'Fancy' },
];
// these fonts already exist on the phone, so no font files are needed (they look a little different on each phone)
const MAP: Record<string, { ios?: string; android?: string }> = {
  serif: { ios: 'Georgia', android: 'serif' },
  mono: { ios: 'Courier', android: 'monospace' },
  fancy: { ios: 'Snell Roundhand', android: 'cursive' },
};
export function fontFamily(f?: string) {
  const m = f ? MAP[f] : undefined;
  if (!m) return undefined;
  return Platform.OS === 'ios' ? m.ios : m.android;
}

export const TEXT_COLORS = ['#2B2340', '#FFFFFF', '#000000', '#E03C31', '#F28C28', '#FFD23F', '#2E9E4F', '#1E6FD9', '#8B1E2D'];
export const PEN_COLORS = ['#2B2340', '#FFFFFF', '#E03C31', '#F28C28', '#FFD23F', '#2E9E4F', '#1E6FD9', '#C77DFF'];
