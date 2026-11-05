import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Occasion reminders: a local notification that repeats every year on the chosen day at 9:00.
// Works offline because the phone itself schedules it (no server needed).
export type Reminder = { id: string; title: string; month: number; day: number; notifId: string };
const KEY = 'wishlink_reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function listReminders(): Promise<Reminder[]> {
  try { return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]'); } catch { return []; }
}
async function store(r: Reminder[]) { await AsyncStorage.setItem(KEY, JSON.stringify(r)); }

export async function addReminder(title: string, month: number, day: number): Promise<Reminder> {
  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) throw new Error('Notifications are not allowed. Turn them on in the phone settings for Expo Go.');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const notifId = await Notifications.scheduleNotificationAsync({
    content: { title: `🎉 ${title}`, body: 'Make a WishLink card and send your wishes!' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.YEARLY, month: month - 1, day, hour: 9, minute: 0 },
  });
  const r: Reminder = { id: String(Date.now()), title, month, day, notifId };
  await store([...(await listReminders()), r]);
  return r;
}

export async function removeReminder(id: string) {
  const all = await listReminders();
  const r = all.find((x) => x.id === id);
  if (r) { try { await Notifications.cancelScheduledNotificationAsync(r.notifId); } catch {} }
  await store(all.filter((x) => x.id !== id));
}
