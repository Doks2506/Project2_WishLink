import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FS from 'expo-file-system/legacy';

// Saves a picture/GIF file so the user can find it in the gallery.
// 1) direct to the gallery (works in a built APK / on iPhone)
// 2) Android + Expo Go blocks (1), so the user picks a folder (e.g. Pictures) and we write the file there
// 3) last resort: the share sheet
export async function saveToGallery(uri: string): Promise<'gallery' | 'folder' | 'share' | 'none'> {
  try {
    const p = await MediaLibrary.requestPermissionsAsync(true); // true = only permission to add files
    if (p.granted) {
      await MediaLibrary.saveToLibraryAsync(uri);
      return 'gallery';
    }
  } catch {}

  if (Platform.OS === 'android') {
    try {
      const isGif = uri.toLowerCase().endsWith('.gif');
      const perm = await FS.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (perm.granted) {
        const b64 = await FS.readAsStringAsync(uri, { encoding: FS.EncodingType.Base64 });
        const dest = await FS.StorageAccessFramework.createFileAsync(perm.directoryUri, `wishlink-${Date.now()}`, isGif ? 'image/gif' : 'image/png');
        await FS.writeAsStringAsync(dest, b64, { encoding: FS.EncodingType.Base64 });
        return 'folder';
      }
    } catch {}
  }

  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
      return 'share';
    }
  } catch {}
  return 'none';
}
