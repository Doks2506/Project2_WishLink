import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Btn } from '../components/Btn';
import { Header } from '../components/Header';
import { C } from '../lib/theme';

// SCAN QR: the camera reads a WishLink QR code, then opens the card inside the app (view.tsx).
export default function Scan() {
  const router = useRouter();
  const [perm, askPerm] = useCameraPermissions();
  const [done, setDone] = useState(false); // stops reading after the first good scan

  function onScan(data: string) {
    if (done) return;
    // a WishLink link looks like  https://site/?id=<card id>
    const m = data.match(/[?&]id=([0-9a-fA-F-]{36})/);
    if (!m) {
      setDone(true);
      Alert.alert('Not a WishLink card', 'This QR code is not from WishLink.', [{ text: 'Scan again', onPress: () => setDone(false) }]);
      return;
    }
    setDone(true);
    router.replace({ pathname: '/view', params: { id: m[1] } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Scan QR" onBack={() => router.back()} />
      {!perm ? null : !perm.granted ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 48 }}>📷</Text>
          <Text style={{ color: C.text, textAlign: 'center', fontSize: 16, marginVertical: 14 }}>WishLink needs the camera to scan a QR code.</Text>
          <Btn label="Allow camera" onPress={askPerm} />
        </View>
      ) : (
        <View style={{ flex: 1, margin: 16, borderRadius: 24, overflow: 'hidden' }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={done ? undefined : ({ data }) => onScan(data)}
          />
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 230, height: 230, borderRadius: 24, borderWidth: 4, borderColor: '#fff' }} />
            <Text style={{ color: '#fff', marginTop: 16, fontWeight: '700' }}>Point the camera at a WishLink QR code</Text>
          </View>
        </View>
      )}
    </View>
  );
}
