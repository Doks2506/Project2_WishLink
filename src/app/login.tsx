import { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Btn } from '../components/Btn';
import { C, shadow } from '../lib/theme';

type Mode = 'login' | 'signup' | 'reset';

export default function Login() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  // forgot-password steps: first we send a code to the email, then the user types the code + a new password
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');

  function go(m: Mode) {
    setMode(m);
    setMsg(null);
    setCodeSent(false);
    setCode('');
  }

  async function submit() {
    setMsg(null);
    if (!email.trim() || !password) return setMsg({ text: 'Enter your email and password.', bad: true });
    if (mode === 'signup' && password.length < 6) return setMsg({ text: 'Password must be at least 6 characters.', bad: true });
    setBusy(true);
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMsg({ text: error.message, bad: true });
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) setMsg({ text: error.message, bad: true });
      else if (!data.session) setMsg({ text: 'Account created. Check your email to confirm it, then log in.', bad: false });
    }
    setBusy(false);
  }

  // FORGOT PASSWORD step 1: Supabase emails a code to the user
  async function sendCode() {
    setMsg(null);
    if (!email.trim()) return setMsg({ text: 'Enter your email first.', bad: true });
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) setMsg({ text: error.message, bad: true });
    else {
      setCodeSent(true);
      setMsg({ text: 'We sent a code to your email. Type it below with your new password.', bad: false });
    }
    setBusy(false);
  }

  // FORGOT PASSWORD step 2: the code proves it is the owner of the email, then we save the new password
  async function changePassword() {
    setMsg(null);
    if (!code.trim()) return setMsg({ text: 'Type the code from your email.', bad: true });
    if (password.length < 6) return setMsg({ text: 'New password must be at least 6 characters.', bad: true });
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' });
    if (error) {
      setMsg({ text: error.message, bad: true });
      setBusy(false);
      return;
    }
    // the code was right, so the user is now logged in; set the new password
    const { error: e2 } = await supabase.auth.updateUser({ password });
    if (e2) setMsg({ text: e2.message, bad: true });
    setBusy(false);
  }

  const input = { borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, height: 50, backgroundColor: C.card, color: C.text, fontSize: 16 } as const;
  const tab = (on: boolean) => ({ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: on ? C.primary : 'transparent' }) as const;
  const label = { fontWeight: '600', color: C.text, marginBottom: 6 } as const;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Image source={require('../components/logo.png')} style={{ width: 110, height: 110 }} contentFit="contain" />
          <Text style={{ fontSize: 34, fontWeight: '800', color: C.primary, marginTop: 4 }}>WishLink</Text>
          <Text style={{ color: C.muted, marginTop: 4, textAlign: 'center' }}>Create and share personal greeting cards</Text>
        </View>

        <View style={[{ backgroundColor: C.card, borderRadius: 24, padding: 18 }, shadow]}>
          {mode !== 'reset' ? (
            <>
              <View style={{ flexDirection: 'row', backgroundColor: C.soft, borderRadius: 14, padding: 4, marginBottom: 16 }}>
                <Pressable style={tab(mode === 'login')} onPress={() => go('login')}>
                  <Text style={{ fontWeight: '700', color: mode === 'login' ? '#fff' : C.primary }}>Log in</Text>
                </Pressable>
                <Pressable style={tab(mode === 'signup')} onPress={() => go('signup')}>
                  <Text style={{ fontWeight: '700', color: mode === 'signup' ? '#fff' : C.primary }}>Sign up</Text>
                </Pressable>
              </View>

              <Text style={label}>Email</Text>
              <TextInput style={[input, { marginBottom: 14 }]} placeholder="you@example.com" placeholderTextColor={C.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />

              <Text style={label}>Password</Text>
              <View style={{ justifyContent: 'center', marginBottom: 8 }}>
                <TextInput style={[input, { paddingRight: 64 }]} placeholder="At least 6 characters" placeholderTextColor={C.muted} secureTextEntry={!show} value={password} onChangeText={setPassword} />
                <Pressable onPress={() => setShow(!show)} style={{ position: 'absolute', right: 14 }}>
                  <Text style={{ color: C.primary, fontWeight: '700' }}>{show ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>

              {mode === 'login' && (
                <Pressable onPress={() => go('reset')} style={{ alignSelf: 'flex-end', paddingVertical: 6, marginBottom: 8 }}>
                  <Text style={{ color: C.primary, fontWeight: '700' }}>Forgot password?</Text>
                </Pressable>
              )}

              {msg && <Text style={{ color: msg.bad ? C.danger : C.ok, marginBottom: 12 }}>{msg.text}</Text>}
              <Btn full label={mode === 'login' ? 'Log in' : 'Create account'} onPress={submit} loading={busy} />
            </>
          ) : (
            <>
              <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 4 }}>Reset your password</Text>
              <Text style={{ color: C.muted, marginBottom: 16 }}>We will email you a code. Use it to choose a new password.</Text>

              <Text style={label}>Email</Text>
              <TextInput style={[input, { marginBottom: 14 }]} placeholder="you@example.com" placeholderTextColor={C.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} editable={!codeSent} />

              {codeSent && (
                <>
                  <Text style={label}>Code from your email</Text>
                  <TextInput style={[input, { marginBottom: 14 }]} placeholder="Code" placeholderTextColor={C.muted} autoCapitalize="none" keyboardType="number-pad" value={code} onChangeText={setCode} />
                  <Text style={label}>New password</Text>
                  <TextInput style={[input, { marginBottom: 14 }]} placeholder="At least 6 characters" placeholderTextColor={C.muted} secureTextEntry value={password} onChangeText={setPassword} />
                </>
              )}

              {msg && <Text style={{ color: msg.bad ? C.danger : C.ok, marginBottom: 12 }}>{msg.text}</Text>}
              <Btn full label={codeSent ? 'Change password' : 'Send code'} onPress={codeSent ? changePassword : sendCode} loading={busy} />
              <Pressable onPress={() => go('login')} style={{ alignSelf: 'center', paddingVertical: 12 }}>
                <Text style={{ color: C.primary, fontWeight: '700' }}>Back to log in</Text>
              </Pressable>
            </>
          )}
        </View>

        <Text style={{ textAlign: 'center', color: C.muted, marginTop: 20, fontSize: 12 }}>Your cards stay on your phone, so the app also works offline.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
