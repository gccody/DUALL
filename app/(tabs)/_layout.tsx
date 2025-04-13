import { OtpDataProvider } from '@/context/OtpDataContext';
import { colors } from '@/global';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

export default function TabLayout() {
    return (
        <OtpDataProvider>
            <Tabs screenOptions={{
                tabBarActiveTintColor: colors.highlight,
                tabBarInactiveTintColor: colors.secondary,
                tabBarStyle: { backgroundColor: colors.black },
                headerStyle: { backgroundColor: colors.black, borderBottomColor: 'grey', borderBottomWidth: 1 },
                headerTitleStyle: { color: colors.white },
                headerTitleAlign: 'center'
            }}>
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Codes',
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
