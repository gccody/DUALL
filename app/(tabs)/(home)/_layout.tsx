import { useTheme } from '@/context/ThemeContext';
import { useStackScreenOptions } from '@/hooks/useStackScreenOptions';
import { Stack } from 'expo-router';

// Keep the account list underneath an account screen opened from a deep link.
export const unstable_settings = { anchor: 'index' };

export default function HomeLayout() {
    const screenOptions = useStackScreenOptions();
    const { theme } = useTheme();

    return (
        <Stack screenOptions={screenOptions}>
            <Stack.Screen name="index" options={{ title: 'Accounts' }} />
            {/* A short form: a sheet sized to its content, with its own header row. */}
            <Stack.Screen
                name="account/[uid]/index"
                options={{
                    presentation: 'formSheet',
                    sheetAllowedDetents: 'fitToContents',
                    sheetGrabberVisible: true,
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.cardBackground },
                }}
            />
            {/* A searchable grid: a full-height modal, so it can use the native
                header search bar and scroll without fighting sheet detents. */}
            <Stack.Screen
                name="account/[uid]/icon"
                options={{
                    presentation: 'modal',
                    title: 'Choose Icon',
                    headerLargeTitle: false,
                }}
            />
        </Stack>
    );
}
