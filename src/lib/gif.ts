import { RefObject } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import UPNG from 'upng-js';
import { File, Paths } from 'expo-file-system';
import { FRAMES } from './types';
import { CARD_W, CARD_H } from '../components/CardView';

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * For each frame: 1) show frame i on the card  2) take a picture of the card (PNG)
 * 3) turn the PNG into pixels  4) add the pixels to the GIF.
 * Returns the file path of the finished GIF.
 */
export async function exportGif(
  cardRef: RefObject<View | null>,
  setFrame: (n: number) => void,
  onProgress: (p: number) => void
) {
  const gif = GIFEncoder();

  for (let i = 0; i < FRAMES; i++) {
    setFrame(i);
    await wait(i === 0 ? 450 : 120); // give React time to draw the frame (the first one also loads the photo)

    const b64 = await captureRef(cardRef, { format: 'png', result: 'base64', width: CARD_W, height: CARD_H });
    const png = UPNG.decode(base64ToBytes(b64).buffer);
    const rgba = new Uint8Array(UPNG.toRGBA8(png)[0]);

    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, png.width, png.height, { palette, delay: 150 });

    onProgress((i + 1) / FRAMES);
  }

  gif.finish();
  const file = new File(Paths.cache, `wishlink-${Date.now()}.gif`);
  file.write(gif.bytes());
  return file.uri;
}
