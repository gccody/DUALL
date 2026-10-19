import { useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface ProgressBarProps {
  /** Between 0 and 1; values outside are clamped */
  progress: number;
  fillColor: string;
  trackColor: string;
  height?: number;
  borderRadius?: number;
  /** Duration of the animation to a new progress value, in ms */
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/** A horizontal bar that fills its container's width to `progress`, animating changes. */
export default function ProgressBar({
  progress,
  fillColor,
  trackColor,
  height = 4,
  borderRadius = height / 2,
  duration = 300,
  style,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const fill = useSharedValue(clamped);

  useEffect(() => {
    fill.set(withTiming(clamped, { duration, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }));
  }, [clamped, duration, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <View style={[{ height, borderRadius, backgroundColor: trackColor, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ height: '100%', borderRadius, backgroundColor: fillColor }, fillStyle]} />
    </View>
  );
}
