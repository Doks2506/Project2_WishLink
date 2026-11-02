import { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../lib/theme';

// Top bar that stays below the phone's status bar / notch.
export function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 10, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: C.bg, flexDirection: 'row', alignItems: 'center' }}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ fontSize: 26, color: C.primary, marginTop: -3 }}>‹</Text>
        </Pressable>
      )}
      <Text style={{ flex: 1, fontSize: 24, fontWeight: '800', color: C.text }}>{title}</Text>
      {right}
    </View>
  );
}
