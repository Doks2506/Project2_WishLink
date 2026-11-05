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
  onItemLayout?: (id: string, w: number, h: number) => void; // the editor uses this to know the size of each box
};

export default function CardView({ card, frame, onItemLayout }: Props) {
  const st = card.style ?? parseStyle(card.extra);
  const t = (frame / FRAMES) * Math.PI * 2;
  const bounce = Math.sin(t) * 8;
  const step = CARD_H / FRAMES; // moves exactly one card-height per loop = seamless
  // automatic text colour: white on a photo or a dark colour
  const ink = st.color || (card.image || isDark(card.bg) ? '#FFFFFF' : '#2B2340');
  const family = fontFamily(st.font);
  const justify = st.pos === 'top' ? 'flex-start' : st.pos === 'bottom' ? 'flex-end' : 'center';
  // text fade-in: the writing starts faint and becomes clear during the first half of the loop
  const fade = card.effect === 'fade' ? (frame < 5 ? 0.1 + (0.9 * frame) / 4 : 1) : 1;
  const movable = Array.isArray(st.items); // new cards: every text and sticker is its own box

  return (
    <View collapsable={false} style={{ width: CARD_W, height: CARD_H, backgroundColor: card.bg, borderRadius: 20, overflow: 'hidden' }}>
      {/* background photo + dark layer */}
      {!!card.image && <Image source={{ uri: card.image }} style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_H }} resizeMode="cover" />}
      {!!card.image && st.scrim > 0 && <View style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_H, backgroundColor: '#000', opacity: st.scrim }} />}

      {/* decorative frame */}
      {st.frame !== 'none' && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 10, top: 10, width: CARD_W - 20, height: CARD_H - 20, borderRadius: 14, borderWidth: 2, borderColor: ink, opacity: 0.55 }} />
      )}
      {st.frame === 'double' && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 17, top: 17, width: CARD_W - 34, height: CARD_H - 34, borderRadius: 9, borderWidth: 1, borderColor: ink, opacity: 0.45 }} />
      )}

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

      {movable ? (
        // NEW cards: each box sits at its own x, y
        st.items!.map((it) =>
          it.kind === 'sticker' ? (
            <View
              key={it.id}
              onLayout={(e) => onItemLayout?.(it.id, e.nativeEvent.layout.width, e.nativeEvent.layout.height)}
              style={{ position: 'absolute', left: it.x, top: it.y }}
            >
              <Text style={{ fontSize: it.size, lineHeight: it.size * 1.25, transform: [{ translateY: bounce * (it.size / 60) }] }}>{it.emoji}</Text>
            </View>
          ) : (
            <View
              key={it.id}
              onLayout={(e) => onItemLayout?.(it.id, e.nativeEvent.layout.width, e.nativeEvent.layout.height)}
              style={{ position: 'absolute', left: it.x, top: it.y, width: it.w ?? 240, opacity: fade }}
            >
              <Text
                style={{
                  fontSize: it.size,
                  lineHeight: it.size * (it.size >= 26 ? 1.3 : 1.55), // a little more room for small text and Dzongkha
                  fontWeight: it.bold ? '800' : '400',
                  fontStyle: it.italic ? 'italic' : 'normal',
                  fontFamily: fontFamily(it.font),
                  color: it.color || ink,
                  textAlign: it.align ?? 'center',
                }}
              >
                {it.text}
              </Text>
            </View>
          )
        )
      ) : (
        // OLD cards (made before movable boxes): the original layout
        <View style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_H, padding: 24, justifyContent: justify, opacity: fade }}>
          {!!card.sticker && <Text style={{ fontSize: 70, textAlign: st.align, transform: [{ translateY: bounce }] }}>{card.sticker}</Text>}
          <Text style={{ fontSize: st.tSize, lineHeight: st.tSize * 1.35, fontWeight: st.bold ? '800' : '400', fontStyle: st.italic ? 'italic' : 'normal', fontFamily: family, color: ink, textAlign: st.align, marginTop: 8 }}>
            {card.title || 'Your title'}
          </Text>
          <Text style={{ fontSize: st.mSize, lineHeight: st.mSize * 1.6, fontStyle: st.italic ? 'italic' : 'normal', fontFamily: family, color: ink, textAlign: st.align, marginTop: 8 }}>
            {card.message || 'Your message goes here'}
          </Text>
        </View>
      )}

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
export function ScaledCard({ card, frame, width, onItemLayout }: Props & { width: number }) {
  const s = width / CARD_W;
  return (
    <View style={{ width, height: CARD_H * s, overflow: 'hidden', borderRadius: 20 * s }}>
      <View style={{ position: 'absolute', left: -(CARD_W * (1 - s)) / 2, top: -(CARD_H * (1 - s)) / 2, transform: [{ scale: s }] }}>
        <CardView card={card} frame={frame} onItemLayout={onItemLayout} />
      </View>
    </View>
  );
}
