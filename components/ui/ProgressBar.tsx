import { useEffect, useRef } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface ProgressBarProps {
  /** Between 0 and 1; values outside are clamped */
  progress: number;
  fillColor: string;
  trackColor: string;
  height?: number;
  borderRadius?: number;
  /**
   * Duration of the linear animation to a lower progress value, in ms. The
   * default matches `useTimestamp`'s one-second tick, so a countdown updated
   * every second drains continuously.
   */
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A horizontal bar that fills its container's width to `progress`. Decreases
 * animate; increases (e.g. a countdown restarting) jump, rather than visibly
 * running backwards.
 */
export default function ProgressBar({
  progress,
  fillColor,
  trackColor,
  height = 4,
  borderRadius = height / 2,
  duration = 1000,
  style,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const fill = useSharedValue(clamped);
  const previous = useRef(clamped);

  useEffect(() => {
    if (clamped > previous.current) {
      fill.set(clamped);
    } else {
      fill.set(withTiming(clamped, { duration, easing: Easing.linear }));
    }
    previous.current = clamped;
  }, [clamped, duration, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <View style={[{ height, borderRadius, backgroundColor: trackColor, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ height: '100%', borderRadius, backgroundColor: fillColor }, fillStyle]} />
    </View>
  );
}
