import AsyncStorage from '@react-native-async-storage/async-storage';

// Two colour sets. C is ONE shared object: switching mode copies the other set into it,
// and the root layout re-draws every screen (see _layout.tsx), so all screens change together.
export type Mode = 'light' | 'dark';

const LIGHT = {
  primary: '#5B3E96',
  primaryDark: '#472F78',
  soft: '#EFEAF7',
  bg: '#F7F4FC',
  card: '#FFFFFF',
  text: '#2B2340',
  muted: '#7A7290',
  border: '#E3DDF0',
  danger: '#D64545',
  ok: '#2E9E6B',
  pink: '#FF6B9D',
};

const DARK: typeof LIGHT = {
  primary: '#9B7EE0',
  primaryDark: '#7F61C4',
  soft: '#2E2745',
  bg: '#15111F',
  card: '#221C33',
  text: '#F1ECFA',
  muted: '#A79FC0',
  border: '#3A3254',
  danger: '#E86A6A',
  ok: '#4CC38A',
  pink: '#FF6B9D',
};

export const C = { ...LIGHT };

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
} as const;

export function applyMode(mode: Mode) {
  Object.assign(C, mode === 'dark' ? DARK : LIGHT);
}

const KEY = 'wishlink_theme';
export async function loadMode(): Promise<Mode> {
  try { return (await AsyncStorage.getItem(KEY)) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
}
export async function saveMode(m: Mode) {
  try { await AsyncStorage.setItem(KEY, m); } catch {}
}
