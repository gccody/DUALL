import { useStackScreenOptions } from '@/hooks/useStackScreenOptions';
import { Stack } from 'expo-router';

export default function SettingsLayout() {
    const screenOptions = useStackScreenOptions();

    return (
        <Stack screenOptions={screenOptions}>
            <Stack.Screen name="index" options={{ title: 'Settings' }} />
        </Stack>
    );
}
