import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncAll } from './db';

// Syncs by itself when the phone gets internet again (and once when the app opens with internet).
// Cards edited offline are pushed to Supabase without the user pressing Sync.
export function useAutoSync(userId: string | undefined) {
  const wasOnline = useRef<boolean | null>(null);
  useEffect(() => {
    if (!userId) return;
    const stop = NetInfo.addEventListener((s) => {
      const online = !!s.isConnected && s.isInternetReachable !== false;
      if (online && wasOnline.current !== true) syncAll(userId).catch(() => {}); // stays quiet if it fails
      wasOnline.current = online;
    });
    return stop;
  }, [userId]);
}
