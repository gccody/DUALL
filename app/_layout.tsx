import { SettingsProvider } from "@/context/SettingsContext";
import { ThemeProvider } from "@/context/ThemeContext";
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
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

  if (authenticated === false)
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>You are not authenticated!!!</Text></View>

  if (authenticated === null) {
    return <View style={{ flex: 1, justifyContent: 'center', alignContent: 'center' }}><Text>Please Authenticate!!!</Text></View>
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
