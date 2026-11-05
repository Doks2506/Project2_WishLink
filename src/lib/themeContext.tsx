import { createContext, useContext } from 'react';
import { Mode } from './theme';

// Lets the Profile screen read the current mode and switch it.
export const ThemeCtx = createContext<{ mode: Mode; setMode: (m: Mode) => void }>({ mode: 'light', setMode: () => {} });
export const useThemeMode = () => useContext(ThemeCtx);
