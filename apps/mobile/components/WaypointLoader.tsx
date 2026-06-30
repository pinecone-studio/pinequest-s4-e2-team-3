import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

// ─── Public API ───────────────────────────────────────────────────────────────

interface WaypointLoaderProps {
  variant?: 'fullscreen' | 'inline';
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const BLUE  = '#2f6bff';
const AMBER = '#f59e0b';
const SAND  = '#F3EEE6';

// ─── Component ───────────────────────────────────────────────────────────────

export function WaypointLoader({ variant = 'inline' }: WaypointLoaderProps) {
  const isFullscreen = variant === 'fullscreen';
  const reduced = useReducedMotion();

  const nodeSize = isFullscreen ? 14 : 10;
  const lineW    = isFullscreen ? 60 : 38;
  const lineH    = isFullscreen ? 2  : 1.5;
  const diamSize = isFullscreen ? 12 : 8;

  // ── Animated values — all use native driver ───────────────────────────────
  //
  // Node 1 starts fully visible (scale 1, opacity via container).
  // Everything else starts hidden and animates in sequentially.
  //
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const node1Scale       = useRef(new Animated.Value(1)).current;
  const line1Tx          = useRef(new Animated.Value(-lineW)).current;
  const node2Scale       = useRef(new Animated.Value(0)).current;
  const node2Opacity     = useRef(new Animated.Value(0)).current;
  const line2Tx          = useRef(new Animated.Value(-lineW)).current;
  const node3Scale       = useRef(new Animated.Value(0)).current;
  const node3Opacity     = useRef(new Animated.Value(0)).current;

  const anim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (reduced) return;

    const nd = { useNativeDriver: true };
    const eOut = Easing.out(Easing.cubic);
    const eIn  = Easing.in(Easing.cubic);
    const ePop = Easing.out(Easing.back(1.8));

    const reset = () => {
      // instant reset — happens at end of fade-out so it's invisible
      containerOpacity.setValue(0);
      node1Scale.setValue(0);
      line1Tx.setValue(-lineW);
      node2Scale.setValue(0);
      node2Opacity.setValue(0);
      line2Tx.setValue(-lineW);
      node3Scale.setValue(0);
      node3Opacity.setValue(0);
    };

    const run = () => {
      reset();

      anim.current = Animated.sequence([
        // ① Container fades in + node 1 pops — user sees something immediately
        Animated.parallel([
          Animated.timing(containerOpacity, { toValue: 1, duration: 220, ...nd }),
          Animated.timing(node1Scale, { toValue: 1, duration: 280, easing: ePop, ...nd }),
        ]),
        // ② Line 1 slides in from the left
        Animated.timing(line1Tx, { toValue: 0, duration: 580, easing: eOut, ...nd }),
        // ③ Center diamond pops
        Animated.parallel([
          Animated.timing(node2Opacity, { toValue: 1, duration: 180, ...nd }),
          Animated.timing(node2Scale,   { toValue: 1, duration: 260, easing: ePop, ...nd }),
        ]),
        // ④ Line 2 slides in from the left
        Animated.timing(line2Tx, { toValue: 0, duration: 580, easing: eOut, ...nd }),
        // ⑤ Right node pops
        Animated.parallel([
          Animated.timing(node3Opacity, { toValue: 1, duration: 180, ...nd }),
          Animated.timing(node3Scale,   { toValue: 1, duration: 260, easing: ePop, ...nd }),
        ]),
        // ⑥ Hold briefly so the user reads the completed route
        Animated.delay(480),
        // ⑦ Fade everything out
        Animated.timing(containerOpacity, { toValue: 0, duration: 380, easing: eIn, ...nd }),
        // ⑧ Pause before the next loop
        Animated.delay(240),
      ]);

      anim.current.start(({ finished }) => {
        if (finished) run();
      });
    };

    run();
    return () => anim.current?.stop();
  }, [reduced, lineW]);

  // ── Reduced-motion: static fully-drawn route ──────────────────────────────

  if (reduced) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading"
        style={[styles.wrap, isFullscreen && styles.fullscreen]}
      >
        <View style={styles.row}>
          <View style={[styles.circle, { width: nodeSize, height: nodeSize, borderRadius: nodeSize / 2, opacity: 0.5 }]} />
          <View style={{ width: lineW, height: lineH, backgroundColor: BLUE, opacity: 0.3 }} />
          <View style={{ width: diamSize, height: diamSize, backgroundColor: AMBER, opacity: 0.5, transform: [{ rotate: '45deg' }] }} />
          <View style={{ width: lineW, height: lineH, backgroundColor: BLUE, opacity: 0.3 }} />
          <View style={[styles.circle, { width: nodeSize, height: nodeSize, borderRadius: nodeSize / 2, opacity: 0.5 }]} />
        </View>
        {isFullscreen && <Text style={styles.wordmark}>Polaris</Text>}
      </View>
    );
  }

  // ── Full animation ─────────────────────────────────────────────────────────

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[styles.wrap, isFullscreen && styles.fullscreen]}
    >
      <Animated.View style={{ opacity: containerOpacity, alignItems: 'center', gap: isFullscreen ? 20 : 12 }}>
        <View style={styles.row}>

          {/* Node 1 — left blue circle, visible from frame 1 */}
          <Animated.View style={[
            styles.circle,
            { width: nodeSize, height: nodeSize, borderRadius: nodeSize / 2 },
            { transform: [{ scale: node1Scale }] },
          ]} />

          {/* Line 1 — clipped container hides the slide-in */}
          <View style={{ width: lineW, height: lineH, overflow: 'hidden' }}>
            <Animated.View style={[
              { width: lineW, height: lineH, backgroundColor: BLUE, opacity: 0.65 },
              { transform: [{ translateX: line1Tx }] },
            ]} />
          </View>

          {/* Node 2 — amber diamond */}
          <Animated.View style={{
            width: diamSize,
            height: diamSize,
            backgroundColor: AMBER,
            opacity: node2Opacity,
            transform: [{ rotate: '45deg' }, { scale: node2Scale }],
          }} />

          {/* Line 2 */}
          <View style={{ width: lineW, height: lineH, overflow: 'hidden' }}>
            <Animated.View style={[
              { width: lineW, height: lineH, backgroundColor: BLUE, opacity: 0.65 },
              { transform: [{ translateX: line2Tx }] },
            ]} />
          </View>

          {/* Node 3 — right blue circle */}
          <Animated.View style={[
            styles.circle,
            { width: nodeSize, height: nodeSize, borderRadius: nodeSize / 2 },
            { opacity: node3Opacity, transform: [{ scale: node3Scale }] },
          ]} />

        </View>

        {isFullscreen && <Text style={styles.wordmark}>Polaris</Text>}
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreen: {
    flex: 1,
    backgroundColor: SAND,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    backgroundColor: BLUE,
  },
  wordmark: {
    fontSize: 20,
    fontStyle: 'italic',
    color: '#1b2640',
    opacity: 0.65,
  },
});
