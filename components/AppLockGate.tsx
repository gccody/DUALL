import PinAuthView from '@/components/PinAuthView';
import PrivacyCover from '@/components/PrivacyCover';
import CenteredMessage from '@/components/ui/CenteredMessage';
import { useSettings } from '@/context/SettingsContext';
import { useAppLock } from '@/hooks/useAppLock';
import { useEffect, type ReactNode } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

/**
 * Covers the whole app, including natively presented modals (which on iOS sit
 * above the React root view, so they need a separate window to be covered).
 */
function LockOverlay({ children }: { children: ReactNode }) {
    if (Platform.OS === 'ios') {
        return (
            <FullWindowOverlay unstable_accessibilityContainerViewIsModal>
                {children}
            </FullWindowOverlay>
        );
    }
    return <View style={StyleSheet.absoluteFill}>{children}</View>;
}

/**
 * Shows the app only after biometric/PIN authentication, covers it again when it
 * re-locks, and hides it while the app is not in the foreground.
 */
export default function AppLockGate({ children }: { children: ReactNode }) {
    const { settings, isLoading } = useSettings();
    const { status, hasUnlockedOnce, isCovered, unlock, resetSession } = useAppLock({
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

    const lockScreen = status === 'pin'
        ? (
            <PinAuthView
                onPinSuccess={unlock}
                onPinFailure={(error) => console.error('PIN authentication failed:', error)}
                onDataErased={resetSession}
            />
        )
        : <CenteredMessage spinner message="Loading..." />;

    return (
        <>
            {/* Keep the navigation tree mounted when re-locking so its state survives. */}
            {hasUnlockedOnce && children}
            {isLocked && (hasUnlockedOnce ? <LockOverlay>{lockScreen}</LockOverlay> : lockScreen)}
            {/*
              Hides the codes from the app switcher snapshot. On Android the recents
              thumbnail may be captured before this renders; only FLAG_SECURE (e.g. via
              expo-screen-capture) prevents that reliably, but it also blocks screenshots.
            */}
            {isCovered && <LockOverlay><PrivacyCover /></LockOverlay>}
        </>
    );
}
