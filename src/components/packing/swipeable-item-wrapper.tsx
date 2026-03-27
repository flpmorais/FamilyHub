import { ReactNode, useCallback } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const THRESHOLD = 0.4;

interface SwipeableItemWrapperProps {
  children: ReactNode;
  leftColor: string;
  leftLabel: string;
  rightColor?: string;
  rightLabel?: string;
  onSwipeLeft: () => void;
  onSwipeRight?: () => void;
}

export function SwipeableItemWrapper({
  children,
  leftColor,
  leftLabel,
  rightColor,
  rightLabel,
  onSwipeLeft,
  onSwipeRight,
}: SwipeableItemWrapperProps) {
  const translateX = useSharedValue(0);

  const fireLeft = useCallback(() => onSwipeLeft(), [onSwipeLeft]);
  const fireRight = useCallback(() => onSwipeRight?.(), [onSwipeRight]);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      // Allow right swipe only if handler exists
      if (e.translationX > 0 && !onSwipeRight) {
        translateX.value = 0;
        return;
      }
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      const threshold = SCREEN_WIDTH * THRESHOLD;
      if (e.translationX < -threshold) {
        // Swiped left past threshold
        runOnJS(fireLeft)();
      } else if (e.translationX > threshold && onSwipeRight) {
        // Swiped right past threshold
        runOnJS(fireRight)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Left reveal (shown when swiping right) */}
      {onSwipeRight && rightColor && (
        <View style={[styles.reveal, styles.revealLeft, { backgroundColor: rightColor }]}>
          <Text style={styles.revealLabel}>{rightLabel}</Text>
        </View>
      )}
      {/* Right reveal (shown when swiping left) */}
      <View style={[styles.reveal, styles.revealRight, { backgroundColor: leftColor }]}>
        <Text style={styles.revealLabel}>{leftLabel}</Text>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, cardStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  reveal: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  revealLeft: {
    alignItems: 'flex-start',
  },
  revealRight: {
    alignItems: 'flex-end',
  },
  revealLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
  },
});
