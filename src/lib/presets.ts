// Ready-made templates. Each one is a set of movable text boxes and small stickers, a background colour,
// an animation and a frame. Dzongkha lines use the phone's own Tibetan-script font, so no font file is needed.
import { Item, newItemId } from './cardstyle';

type Seed = Omit<Item, 'id'>;
type Frame = 'none' | 'line' | 'double';

export type Preset = {
  label: string;
  emoji: string; // shown on the Home tile
  title: string; // first text of the card (used as the card name)
  message: string;
  sticker: string;
  bg: string;
  effect: string; // sparkle | hearts | confetti | flags
  frame: Frame;
  items: Seed[];
};

// helpers to write the layouts: T = text box, S = sticker centred on x = cx
const T = (y: number, text: string, size: number, o: Partial<Seed> = {}): Seed =>
  ({ kind: 'text', x: 24, y, w: 252, text, size, align: 'center', bold: false, ...o });
const S = (cx: number, y: number, size: number, emoji: string): Seed =>
  ({ kind: 'sticker', emoji, x: Math.round(cx - size * 0.6), y, size });

function make(label: string, emoji: string, bg: string, effect: string, frame: Frame, items: Seed[]): Preset {
  const texts = items.filter((i) => i.kind === 'text');
  const st = items.find((i) => i.kind === 'sticker');
  return {
    label, emoji, bg, effect, frame, items,
    title: texts[0]?.text ?? '',
    message: texts.slice(1).map((t) => t.text).join('\n'),
    sticker: st?.emoji ?? emoji,
  };
}

export const PRESETS: Record<string, Preset> = {
  // ---- the 4 occasion tiles ----
  birthday: make('Birthday', '🎂', '#FFE4EC', 'confetti', 'line', [
    S(150, 66, 54, '🎂'), T(142, 'Happy Birthday!', 34, { font: 'fancy' }),
    T(236, 'Wishing you a day full of joy and cake.', 16, { x: 40, w: 220 }),
    S(38, 36, 26, '🎈'), S(262, 340, 26, '🎈'),
  ]),
  festival: make('Festival', '🎉', '#FFF6D6', 'sparkle', 'double', [
    S(150, 64, 50, '🎉'), T(140, 'Happy Festival!', 32, { bold: true, font: 'serif' }),
    T(215, 'May this festival bring you peace and happiness.', 16, { x: 35, w: 230, font: 'serif' }),
  ]),
  anniversary: make('Anniversary', '💌', '#EAD9FF', 'hearts', 'line', [
    S(150, 64, 50, '💌'), T(140, 'Happy Anniversary', 34, { font: 'fancy' }),
    T(225, 'Thank you for every moment we shared.', 16, { x: 35, w: 230, italic: true, font: 'serif' }),
  ]),
  letter: make('Letter', '🌸', '#E6F0FF', 'sparkle', 'none', [
    T(48, 'Dear friend,', 28, { x: 28, w: 244, align: 'left', font: 'serif', bold: true }),
    T(100, 'I am thinking of you and wanted to say hello.', 17, { x: 28, w: 244, align: 'left', font: 'serif' }),
    T(318, 'With love,', 16, { x: 28, w: 244, align: 'left', italic: true, font: 'fancy' }),
    S(250, 336, 30, '🌸'),
  ]),

  // ---- more templates ----
  congrats: make('Congrats', '🏆', '#E8FFE6', 'confetti', 'line', [
    S(150, 64, 54, '🏆'), T(140, 'Congratulations!', 30, { bold: true }),
    T(210, 'So proud of you. You did it!', 16, { x: 35, w: 230 }),
  ]),
  thanks: make('Thank you', '💐', '#FFF6D6', 'hearts', 'line', [
    S(150, 64, 50, '💐'), T(138, 'Thank you!', 42, { font: 'fancy' }),
    T(210, 'Your kindness means a lot to me.', 16, { x: 35, w: 230 }),
  ]),

  // ---- Bhutanese pack (prayer flags run along the top and bottom, so no frame) ----
  losar: make('Losar', '🏔️', '#FFC94D', 'flags', 'none', [
    S(150, 78, 40, '🏔️'), T(135, 'Losar Tashi Delek!', 28, { bold: true, font: 'serif' }),
    T(200, 'ལོ་གསར་བཀྲ་ཤིས་བདེ་ལེགས།', 22),
    T(248, 'May the new year bring you peace and joy.', 15, { x: 35, w: 230 }),
  ]),
  kuzu: make('Kuzuzangpo', '🙏', '#F28C28', 'sparkle', 'line', [
    S(150, 64, 46, '🙏'), T(130, 'Kuzuzangpo la!', 32, { bold: true }),
    T(190, 'ཀུ་ཟུ་ཟང་པོ་ལགས།', 22),
    T(240, 'Sending you warm wishes from Bhutan.', 16, { x: 35, w: 230 }),
  ]),
  nationalday: make('National Day', '🐉', '#8B1E2D', 'flags', 'none', [
    S(150, 84, 44, '🐉'), T(145, 'Happy National Day!', 28, { bold: true, font: 'serif' }),
    T(215, 'Wishing you a proud and happy 17 December.', 16, { x: 35, w: 230 }),
  ]),
  tashidelek: make('Tashi Delek', '🏯', '#FFC94D', 'confetti', 'line', [
    S(150, 64, 46, '🏯'), T(130, 'Happy Birthday!', 32, { bold: true }),
    T(190, 'བཀྲ་ཤིས་བདེ་ལེགས།', 22),
    T(240, 'Tashi Delek on your special day.', 16, { x: 35, w: 230 }),
  ]),
};

export const PRESET_KEYS = ['birthday', 'festival', 'anniversary', 'letter'];
export const BHUTAN_KEYS = ['losar', 'kuzu', 'nationalday', 'tashidelek'];
export const MORE_KEYS = ['congrats', 'thanks'];

// fresh copies with new ids (so two cards never share an item id)
export const presetItems = (key: string): Item[] => PRESETS[key].items.map((s) => ({ ...s, id: newItemId() }));

// a blank card starts with a title and a message box
export const blankItems = (): Item[] => [
  { id: newItemId(), kind: 'text', text: 'Your title', x: 24, y: 150, w: 252, size: 30, bold: true, align: 'center' },
  { id: newItemId(), kind: 'text', text: 'Write your message here', x: 35, y: 215, w: 230, size: 16, align: 'center' },
];
