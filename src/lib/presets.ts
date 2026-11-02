// Ready-made starts for the occasion tiles on the Home screen.
// Dzongkha lines use the phone's own Tibetan-script font, so no font file is needed.
export type Preset = {
  label: string;
  emoji: string;
  title: string;
  message: string;
  sticker: string; // must be one of STICKERS in types.ts
  bg: string; // any colour; the first 6 + saffron/orange/maroon are in BG_COLORS
  effect: string; // sparkle | hearts | confetti | flags
};

export const PRESETS: Record<string, Preset> = {
  // ---- the 4 occasion tiles ----
  birthday: { label: 'Birthday', emoji: '🎂', title: 'Happy Birthday!', message: 'Wishing you a day full of joy and cake.', sticker: '🎂', bg: '#FFE4EC', effect: 'confetti' },
  festival: { label: 'Festival', emoji: '🎉', title: 'Happy Festival!', message: 'May this festival bring you peace and happiness.', sticker: '🎉', bg: '#FFF6D6', effect: 'sparkle' },
  anniversary: { label: 'Anniversary', emoji: '💌', title: 'Happy Anniversary!', message: 'Thank you for every moment we shared.', sticker: '💌', bg: '#EAD9FF', effect: 'hearts' },
  letter: { label: 'Letter', emoji: '🌸', title: 'Dear friend,', message: 'I am thinking of you and wanted to say hello.', sticker: '🌸', bg: '#E6F0FF', effect: 'sparkle' },

  // ---- more templates ----
  congrats: { label: 'Congrats', emoji: '🏆', title: 'Congratulations!', message: 'So proud of you. You did it!', sticker: '🏆', bg: '#E8FFE6', effect: 'confetti' },
  thanks: { label: 'Thank you', emoji: '💐', title: 'Thank you!', message: 'Your kindness means a lot to me.', sticker: '💐', bg: '#FFF6D6', effect: 'hearts' },

  // ---- Bhutanese pack ----
  losar: { label: 'Losar', emoji: '🏔️', title: 'Losar Tashi Delek!', message: 'ལོ་གསར་བཀྲ་ཤིས་བདེ་ལེགས།\nMay the new year bring you peace and joy.', sticker: '🏔️', bg: '#FFC94D', effect: 'flags' },
  kuzu: { label: 'Kuzuzangpo', emoji: '🙏', title: 'Kuzuzangpo la!', message: 'ཀུ་ཟུ་ཟང་པོ་ལགས།\nSending you warm wishes from Bhutan.', sticker: '🙏', bg: '#F28C28', effect: 'sparkle' },
  nationalday: { label: 'National Day', emoji: '🐉', title: 'Happy National Day!', message: 'Wishing you a proud and happy 17 December.', sticker: '🐉', bg: '#8B1E2D', effect: 'flags' },
  tashidelek: { label: 'Tashi Delek', emoji: '🏯', title: 'Happy Birthday!', message: 'བཀྲ་ཤིས་བདེ་ལེགས།\nTashi Delek on your special day.', sticker: '🏯', bg: '#FFC94D', effect: 'confetti' },
};

export const PRESET_KEYS = ['birthday', 'festival', 'anniversary', 'letter'];
export const BHUTAN_KEYS = ['losar', 'kuzu', 'nationalday', 'tashidelek'];
export const MORE_KEYS = ['congrats', 'thanks'];
