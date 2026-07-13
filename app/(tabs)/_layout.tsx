import { OtpDataProvider } from '@/context/OtpDataContext';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

export default function TabLayout() {
    const { theme } = useTheme();

    return (
        <OtpDataProvider>
            <Tabs screenOptions={{
                tabBarActiveTintColor: theme.tabBarActive,
                tabBarInactiveTintColor: theme.tabBarInactive,
                tabBarStyle: { backgroundColor: theme.tabBarBackground },
                headerShown: false,
            }}>
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'YOUR ACCOUNTS',
                        tabBarIcon: ({ color }) => <FontAwesome size={28} name="home" color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="add"
                    options={{
                        title: 'Add',
                        tabBarIcon: ({ color }) => <FontAwesome size={28} name="plus" color={color} />
                    }}
                />
                <Tabs.Screen
                    name="settings"
                    options={{
                        title: 'Settings',
                        tabBarIcon: ({ color }) => <FontAwesome size={28} name="cog" color={color} />,
                    }}
                />
            </Tabs>
        </OtpDataProvider>
    );
}
