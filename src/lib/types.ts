export type Card = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  bg: string;
  sticker: string; // emoji, '' = none
  effect: string;
  image: string; // BACKGROUND photo (gallery or camera) as a small "data:image/jpeg;base64,..." text; '' = none
  extra: string; // JSON text: font, sizes, text colour, alignment, drawing (see cardstyle.ts)
  updated_at: number; // milliseconds
  synced: number; // 0 = waiting to upload, 1 = in cloud
  deleted: number; // 1 = deleted locally, waiting to delete in cloud
  shared: number; // 1 = has a public link
};

// colours 7-9 are Bhutanese: saffron yellow, orange, maroon
export const BG_COLORS = ['#FFE4EC', '#E6F0FF', '#E8FFE6', '#FFF6D6', '#EAD9FF', '#FFD9C7', '#FFC94D', '#F28C28', '#8B1E2D', '#FFFFFF', '#2B2340'];
export const STICKERS = ['🎂', '🎉', '💌', '🌸', '🎁', '🏔️', '🙏', '🐉', '🏯', '🌈', '🏆', '💐'];
// 'flags' = Bhutanese prayer flags (lungta) fluttering at the top and bottom
export const EFFECTS = ['sparkle', 'hearts', 'confetti', 'flags', 'none'];
export const FRAMES = 10; // frames in one animation loop (also used for the GIF)
