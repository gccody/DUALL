import { NativeEventEmitter, Platform, TurboModuleRegistry, type TurboModule } from 'react-native';

interface AnimatedModule extends TurboModule {
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

/**
 * Keeps one permanent `onAnimatedValueUpdate` listener on iOS's native animated
 * module.
 *
 * react-native-screens drives each native-stack screen's transition progress
 * through a native `Animated.event`, which makes React Native observe those
 * values natively. When the JS listeners are torn down, `removeListeners`
 * reaches native immediately but `stopListeningToAnimatedNodeValue` is queued,
 * so for a few frames native has observed values and a listener count of zero.
 * `RCTEventEmitter` then logs "Sending `onAnimatedValueUpdate` with no listeners
 * registered." once per frame. Holding a listener keeps the count above zero;
 * the stray updates are ignored on the JS side, which filters them by tag.
 */
export function installAnimatedListenerGuard(): void {
  if (Platform.OS !== 'ios') return;

  // Same module React Native's Animated picks (see shouldUseTurboAnimatedModule).
  const moduleName = (globalThis as { RN$Bridgeless?: boolean }).RN$Bridgeless
    ? 'NativeAnimatedTurboModule'
    : 'NativeAnimatedModule';
  const animatedModule = TurboModuleRegistry.get<AnimatedModule>(moduleName);
  if (!animatedModule) return;

  new NativeEventEmitter(animatedModule).addListener('onAnimatedValueUpdate', () => {});
}
