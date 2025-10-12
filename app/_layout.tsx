import LoadingView from "@/components/LoadingView";
import PinAuthView from "@/components/PinAuthView";
import { SettingsProvider, useSettings } from "@/context/SettingsContext";
import { ThemeProvider } from "@/context/ThemeContext";
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

function AuthenticationWrapper({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [pinExists, setPinExists] = useState<null | boolean>(null);
  const [showPinAuth, setShowPinAuth] = useState(false);
  const { settings, isLoading } = useSettings();

  useEffect(() => {
    const checkPinAndAuthenticate = async () => {
      // await SecureStore.deleteItemAsync('user_pin');     // Un-comment in order to reset the pin during dev
      // Check if PIN exists
      const storedPin = await SecureStore.getItemAsync('user_pin');
      setPinExists(!!storedPin);

      if (!storedPin) {
        // No PIN exists, show PIN setup
        setShowPinAuth(true);
        return;
      }

      // PIN exists, check if biometrics is enabled
      if (settings.useBiometrics) {
        try {
          // Try biometric authentication first
          const biometricResult = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate with biometrics'
          });

          if (biometricResult.success) {
            setAuthenticated(true);
            setShowPinAuth(false);
          } else {
            // Biometric failed, show PIN auth as fallback
            setShowPinAuth(true);
          }
        } catch (error) {
          console.error('Biometric authentication error:', error);
          // Error with biometrics, show PIN auth as fallback
          setShowPinAuth(true);
        }
      } else {
        // Biometrics disabled, go directly to PIN auth
        setShowPinAuth(true);
      }
    };

    if (!isLoading) {
      checkPinAndAuthenticate();
    }
  }, [settings.useBiometrics, isLoading]);

  const handlePinSuccess = () => {
    setAuthenticated(true);
    setShowPinAuth(false);
  };

  const handlePinFailure = (error: string) => {
    console.error('PIN authentication failed:', error);
    // Could implement additional logic here like app lockout
  };

  if (isLoading || pinExists === null) {
    return <LoadingView />;
  }

  if (showPinAuth) {
    return (
      <PinAuthView
        onPinSuccess={handlePinSuccess}
        onPinFailure={handlePinFailure}
      />
    );
  }

  if (authenticated === true) {
    return <>{children}</>;
  }

  return <LoadingView />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider>
          <AuthenticationWrapper>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </AuthenticationWrapper>
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
