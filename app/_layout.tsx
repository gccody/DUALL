import ErrorView from "@/components/ErrorView";
import LoadingView from "@/components/LoadingView";
import { SettingsProvider } from "@/context/SettingsContext";
import { ThemeProvider } from "@/context/ThemeContext";
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const [authenticated, setAuthenticated] = useState<null | boolean>(null);

  useEffect(() => {
    const authenticate = async () => {
      const res = await LocalAuthentication.authenticateAsync();
      setAuthenticated(res.success);
    };
    authenticate();
  }, []);

  if (authenticated === null) {
    return <LoadingView />;
  }

  if (authenticated === false) {
    return <ErrorView message={"You are not authenticated!!!"} />
  }

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
