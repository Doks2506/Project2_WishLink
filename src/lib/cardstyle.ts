import { Platform } from 'react-native';

// One stroke drawn by the user. d = SVG path text like "M10 20 L12 25 ..." in card units (300 x 400).
export type Stroke = { c: string; w: number; d: string };

// Everything about how the card LOOKS beyond title/message/bg. Saved as JSON text in the "extra" column.
export type CardStyle = {
  font: string; // sans | serif | mono | fancy
  tSize: number; // title size
  mSize: number; // message size
  color: string; // text colour, '' = automatic (white on dark/photo, dark on light)
  align: 'left' | 'center' | 'right';
  bold: boolean; // title bold
  italic: boolean;
  pos: 'top' | 'center' | 'bottom'; // where the text sits on the card
  scrim: number; // 0..0.6, dark layer on top of a background photo so the text is readable
  strokes: Stroke[]; // the drawing
};

export const DEFAULT_STYLE: CardStyle = {
  font: 'sans', tSize: 26, mSize: 16, color: '', align: 'center', bold: true, italic: false, pos: 'center', scrim: 0, strokes: [],
};

// reads the saved JSON; old cards with nothing saved get the defaults
export function parseStyle(s?: string | null): CardStyle {
  try {
    if (s) return { ...DEFAULT_STYLE, ...JSON.parse(s) };
  } catch {}
  return { ...DEFAULT_STYLE };
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
export function fontFamily(f: string) {
  const m = MAP[f];
  if (!m) return undefined;
  return Platform.OS === 'ios' ? m.ios : m.android;
}

export const TEXT_COLORS = ['#2B2340', '#FFFFFF', '#000000', '#E03C31', '#F28C28', '#FFD23F', '#2E9E4F', '#1E6FD9', '#8B1E2D'];
export const PEN_COLORS = ['#2B2340', '#FFFFFF', '#E03C31', '#F28C28', '#FFD23F', '#2E9E4F', '#1E6FD9', '#C77DFF'];
