import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

// Create animated version of the SVG Rect component
const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface ProgressBarProps {
  progress: number; // Progress value between 0 and 1
  width?: number;
  height?: number;
  backgroundColor?: string;
  fillColor?: string;
  borderRadius?: number;
  duration?: number; // Animation duration in milliseconds
  style?: ViewStyle;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  width = 300,
  height = 4,
  backgroundColor = '#E0E0E0',
  fillColor = '#4CAF50',
  borderRadius = 2,
  duration = 300,
  style,
}) => {
  // Validate progress is between 0 and 1
  const validProgress = Math.min(Math.max(progress, 0), 1);

  // Shared value for animation
  const animatedWidth = useSharedValue(0);

  // Store previous progress to detect changes
  const prevProgressRef = useRef(validProgress);

  useEffect(() => {
    // Animate only if progress has changed
    if (prevProgressRef.current !== validProgress) {
      animatedWidth.value = withTiming(
        validProgress * width,
        {
          duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }
      );
      prevProgressRef.current = validProgress;
    }
  }, [validProgress, width, duration, animatedWidth]);

  // Create animated props for the rectangle
  const animatedProps = useAnimatedProps(() => {
    return {
      width: animatedWidth.value,
    };
  });

  return (
    <View style={[styles.container, style]}>
      <Svg width={width} height={height}>
        {/* Background rectangle */}
        <Rect
          width={width}
          height={height}
          fill={backgroundColor}
          rx={borderRadius}
          ry={borderRadius}
        />
        {/* Animated fill rectangle */}
        <AnimatedRect
          x={0}
          y={0}
          height={height}
          fill={fillColor}
          rx={borderRadius}
          ry={borderRadius}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
});

export default ProgressBar;