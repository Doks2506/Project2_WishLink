import { View, Text, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FRAMES } from '../lib/types';
import { isDark } from '../lib/color';
import { CardStyle, parseStyle, fontFamily } from '../lib/cardstyle';

export const CARD_W = 300;
export const CARD_H = 400;

// fixed positions so the animation is the same every time (needed for a clean GIF)
const SPOTS: [number, number][] = [
  [30, 40], [240, 60], [60, 220], [220, 260], [150, 100], [260, 180], [90, 330], [200, 350],
];
const CONFETTI = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9F1C'];
// Bhutanese prayer flag colours, in the traditional order: blue, white, red, green, yellow
const FLAGS = ['#1E6FD9', '#FFFFFF', '#E03C31', '#2E9E4F', '#FFD23F'];

type Props = {
  card: {
    title: string; message: string; bg: string; sticker: string; effect: string; image?: string;
    extra?: string; // saved style text (from the database)
    style?: CardStyle; // or a ready style object (used live in the editor)
  };
  frame: number; // 0 .. FRAMES-1  (the card is drawn differently for each frame)
};

export default function CardView({ card, frame }: Props) {
  const st = card.style ?? parseStyle(card.extra);
  const t = (frame / FRAMES) * Math.PI * 2;
  const bounce = Math.sin(t) * 8;
  const step = CARD_H / FRAMES; // moves exactly one card-height per loop = seamless
  // text colour: the user's choice, or automatic (white on a photo or dark colour)
  const ink = st.color || (card.image || isDark(card.bg) ? '#FFFFFF' : '#2B2340');
  const family = fontFamily(st.font);
  const justify = st.pos === 'top' ? 'flex-start' : st.pos === 'bottom' ? 'flex-end' : 'center';

  return (
    <View collapsable={false} style={{ width: CARD_W, height: CARD_H, backgroundColor: card.bg, borderRadius: 20, overflow: 'hidden' }}>
      {/* background photo + dark layer */}
      {!!card.image && <Image source={{ uri: card.image }} style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_H }} resizeMode="cover" />}
      {!!card.image && st.scrim > 0 && <View style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_H, backgroundColor: '#000', opacity: st.scrim }} />}

      {card.effect === 'sparkle' &&
        SPOTS.map(([x, y], i) => (
          <Text key={i} style={{ position: 'absolute', left: x, top: y, fontSize: 22, opacity: (frame + i) % 5 < 3 ? 1 : 0.2 }}>✨</Text>
        ))}

      {card.effect === 'hearts' &&
        SPOTS.map(([x], i) => (
          <Text key={i} style={{ position: 'absolute', left: x, top: CARD_H - ((frame * step + i * 50) % CARD_H), fontSize: 22 }}>❤️</Text>
        ))}

      {card.effect === 'confetti' &&
        Array.from({ length: 14 }).map((_, i) => (
          <View
            key={i}
            style={{ position: 'absolute', left: (i * 41) % (CARD_W - 10), top: (frame * step + i * 37) % CARD_H, width: 9, height: 14, backgroundColor: CONFETTI[i % CONFETTI.length], transform: [{ rotate: `${frame * 36 + i * 20}deg` }] }}
          />
        ))}

      {/* prayer flags: a string with 5 flags at the top and at the bottom, waving with the frame number */}
      {card.effect === 'flags' &&
        [0, 1].map((row) => (
          <View key={row} style={{ position: 'absolute', left: 0, top: row === 0 ? 14 : CARD_H - 60, width: CARD_W, height: 50 }}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 2, height: 2, backgroundColor: ink, opacity: 0.5 }} />
            {FLAGS.map((col, i) => {
              const w = Math.sin(t + i * 0.9 + row);
              return (
                <View
                  key={i}
                  style={{ position: 'absolute', left: 14 + i * 56, top: 4 + w * 3, width: 44, height: 34, backgroundColor: col, borderWidth: col === '#FFFFFF' ? 1 : 0, borderColor: '#DDD', transform: [{ rotate: `${w * 5}deg` }] }}
                />
              );
            })}
          </View>
        ))}

      {/* sticker + title + message. justifyContent = where the text sits (top / middle / bottom) */}
      <View style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_H, padding: 24, justifyContent: justify }}>
        {!!card.sticker && (
          <Text style={{ fontSize: 70, textAlign: st.align, transform: [{ translateY: bounce }] }}>{card.sticker}</Text>
        )}
        <Text style={{ fontSize: st.tSize, lineHeight: st.tSize * 1.35, fontWeight: st.bold ? '800' : '400', fontStyle: st.italic ? 'italic' : 'normal', fontFamily: family, color: ink, textAlign: st.align, marginTop: 8 }}>
          {card.title || 'Your title'}
        </Text>
        <Text style={{ fontSize: st.mSize, lineHeight: st.mSize * 1.6, fontStyle: st.italic ? 'italic' : 'normal', fontFamily: family, color: ink, textAlign: st.align, marginTop: 8 }}>
          {card.message || 'Your message goes here'}
        </Text>
      </View>

      {/* the user's drawing, on top of everything */}
      {st.strokes.length > 0 && (
        <Svg width={CARD_W} height={CARD_H} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          {st.strokes.map((s, i) => (
            <Path key={i} d={s.d} stroke={s.c} strokeWidth={s.w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
        </Svg>
      )}
    </View>
  );
}

// Smaller copy of the card (for the list and the editor preview).
export function ScaledCard({ card, frame, width }: Props & { width: number }) {
  const s = width / CARD_W;
  return (
    <View style={{ width, height: CARD_H * s, overflow: 'hidden', borderRadius: 20 * s }}>
      <View style={{ position: 'absolute', left: -(CARD_W * (1 - s)) / 2, top: -(CARD_H * (1 - s)) / 2, transform: [{ scale: s }] }}>
        <CardView card={card} frame={frame} />
      </View>
    </View>
  );
}
