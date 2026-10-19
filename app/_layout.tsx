import AppLockGate from "@/components/AppLockGate";
import { SettingsProvider } from "@/context/SettingsContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider>
          <AppLockGate>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="pin-setup"
                options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
              />
            </Stack>
          </AppLockGate>
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
