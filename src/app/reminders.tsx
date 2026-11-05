import { useCallback, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { Btn } from '../components/Btn';
import { C, shadow } from '../lib/theme';
import { Reminder, listReminders, addReminder, removeReminder } from '../lib/reminders';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// quick ideas (Losar and Bhutan's National Day are fixed-date here; Losar moves each year, so edit it)
const IDEAS = [
  { t: 'Bhutan National Day', m: 12, d: 17 },
  { t: 'Losar (check the date)', m: 2, d: 18 },
];

// Lets the user add yearly reminders ("Mum's birthday - 14 March") that notify at 9:00 every year.
export default function Reminders() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<Reminder[]>([]);
  const [title, setTitle] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [day, setDay] = useState(new Date().getDate());
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => { listReminders().then(setList); }, []);
  useFocusEffect(refresh);

  function changeMonth(step: number) {
    const m = ((month - 1 + step + 12) % 12) + 1;
    setMonth(m);
    setDay((d) => Math.min(d, DAYS_IN[m - 1]));
  }
  function changeDay(step: number) {
    const max = DAYS_IN[month - 1];
    setDay((d) => ((d - 1 + step + max) % max) + 1);
  }

  async function add() {
    if (!title.trim()) return Alert.alert('Add a name', 'For example: Mum\'s birthday');
    setBusy(true);
    try {
      await addReminder(title.trim(), month, day);
      setTitle('');
      refresh();
      Alert.alert('Reminder set', `You will be reminded every year on ${day} ${MONTHS[month - 1]} at 9:00.`);
    } catch (e: any) {
      Alert.alert('Could not set the reminder', e?.message ?? String(e));
    }
    setBusy(false);
  }

  const stepBtn = { width: 40, height: 40, borderRadius: 20, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' } as const;
  const Stepper = ({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) => (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={onMinus} style={stepBtn}><Text style={{ fontSize: 22, color: C.primary, fontWeight: '800' }}>−</Text></Pressable>
        <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, minWidth: 44, textAlign: 'center' }}>{label}</Text>
        <Pressable onPress={onPlus} style={stepBtn}><Text style={{ fontSize: 22, color: C.primary, fontWeight: '800' }}>+</Text></Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Reminders" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <View style={[{ backgroundColor: C.card, borderRadius: 22, padding: 18 }, shadow]}>
          <Text style={{ fontWeight: '800', color: C.text, marginBottom: 8 }}>New reminder</Text>
          <TextInput
            style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, height: 50, backgroundColor: C.card, color: C.text, fontSize: 16 }}
            placeholder="e.g. Mum's birthday" placeholderTextColor={C.muted} value={title} onChangeText={setTitle}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {IDEAS.map((i) => (
              <Pressable key={i.t} onPress={() => { setTitle(i.t); setMonth(i.m); setDay(i.d); }} style={{ backgroundColor: C.soft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 }}>
                <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>{i.t}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            <Stepper label={MONTHS[month - 1]} onMinus={() => changeMonth(-1)} onPlus={() => changeMonth(1)} />
            <Stepper label={String(day)} onMinus={() => changeDay(-1)} onPlus={() => changeDay(1)} />
          </View>
          <View style={{ marginTop: 16 }}><Btn full label="Set yearly reminder" onPress={add} loading={busy} /></View>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 10 }}>You get a notification at 9:00 every year on this day, even without internet.</Text>
        </View>

        <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginTop: 24, marginBottom: 10 }}>Your reminders</Text>
        {list.length === 0 && <Text style={{ color: C.muted }}>No reminders yet.</Text>}
        {list.map((r) => (
          <View key={r.id} style={[{ backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }, shadow]}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>🔔</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: C.text }}>{r.title}</Text>
              <Text style={{ color: C.muted, marginTop: 2 }}>Every year on {r.day} {MONTHS[r.month - 1]}, 9:00</Text>
            </View>
            <Pressable onPress={() => removeReminder(r.id).then(refresh)} hitSlop={10}><Text style={{ color: C.danger, fontWeight: '700' }}>Delete</Text></Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
