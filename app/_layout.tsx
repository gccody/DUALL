import CenteredMessage from "@/components/ui/CenteredMessage";
import PinAuthView from "@/components/PinAuthView";
import { SettingsProvider, useSettings } from "@/context/SettingsContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { useAppLock } from "@/hooks/useAppLock";
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useEffect } from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";

/**
 * Covers the whole app, including natively presented modals (which on iOS sit
 * above the React root view, so they need a separate window to be covered).
 */
function LockOverlay({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'ios') {
    return (
      <FullWindowOverlay unstable_accessibilityContainerViewIsModal>
        {children}
      </FullWindowOverlay>
    );
  }
  return <View style={StyleSheet.absoluteFill}>{children}</View>;
}

function AuthenticationWrapper({ children }: { children: React.ReactNode }) {
  const { settings, isLoading } = useSettings();
  const { isDark } = useTheme();
  const { status, hasUnlockedOnce, unlock, resetSession } = useAppLock({
    ready: !isLoading,
    useBiometrics: settings.useBiometrics,
  });
  const isLocked = status !== 'unlocked';

  // While the lock screen covers the app, don't let the Android back button
  // navigate the screens underneath it.
  useEffect(() => {
    if (!isLocked || !hasUnlockedOnce) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [isLocked, hasUnlockedOnce]);

  const handlePinFailure = (error: string) => {
    console.error('PIN authentication failed:', error);
  };

  const lockScreen = status === 'pin'
    ? (
      <PinAuthView
        onPinSuccess={unlock}
        onPinFailure={handlePinFailure}
        onDataErased={resetSession}
      />
    )
    : <CenteredMessage spinner message="Loading..." />;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Keep the navigation tree mounted when re-locking so its state survives. */}
      {hasUnlockedOnce && children}
      {isLocked && (hasUnlockedOnce ? <LockOverlay>{lockScreen}</LockOverlay> : lockScreen)}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider>
          <AuthenticationWrapper>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="pin-setup"
                options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
              />
            </Stack>
          </AuthenticationWrapper>
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
