import { Pressable, Text, ActivityIndicator, ViewStyle } from 'react-native';
import { C } from '../lib/theme';

type Kind = 'primary' | 'soft' | 'danger' | 'outline';

export function Btn({
  label,
  onPress,
  kind = 'primary',
  disabled = false,
  loading = false,
  full = false,
  small = false,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: Kind;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  small?: boolean;
  style?: ViewStyle;
}) {
  const bg = kind === 'primary' ? C.primary : kind === 'danger' ? C.danger : kind === 'soft' ? C.soft : 'transparent';
  const color = kind === 'soft' ? C.primary : kind === 'outline' ? C.primary : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderWidth: kind === 'outline' ? 1.5 : 0,
          borderColor: C.primary,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          height: small ? 40 : 50,
          paddingHorizontal: small ? 16 : 22,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          alignSelf: full ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={{ color, fontWeight: '700', fontSize: small ? 14 : 16 }}>{label}</Text>
      )}
    </Pressable>
  );
}
