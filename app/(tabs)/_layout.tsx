import { OtpDataProvider } from '@/context/OtpDataContext';
import { useTheme } from '@/context/ThemeContext';
import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';

export default function TabLayout() {
    const { theme } = useTheme();

    return (
        <OtpDataProvider>
            <NativeTabs
                tintColor={theme.tabBarActive}
                iconColor={{ default: theme.tabBarInactive, selected: theme.tabBarActive }}
                labelStyle={{
                    default: { color: theme.tabBarInactive },
                    selected: { color: theme.tabBarActive },
                }}
                // iOS uses the system material / Liquid Glass bar; Android needs explicit colors
                backgroundColor={Platform.OS === 'android' ? theme.tabBarBackground : undefined}
                indicatorColor={Platform.OS === 'android' ? theme.iconBackground : undefined}
            >
                <NativeTabs.Trigger name="(home)">
                    <NativeTabs.Trigger.Label>Accounts</NativeTabs.Trigger.Label>
                    <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
                </NativeTabs.Trigger>
                <NativeTabs.Trigger name="add">
                    <NativeTabs.Trigger.Label>Add</NativeTabs.Trigger.Label>
                    <NativeTabs.Trigger.Icon sf="qrcode.viewfinder" md="qr_code_scanner" />
                </NativeTabs.Trigger>
                <NativeTabs.Trigger name="settings">
                    <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
                    <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
                </NativeTabs.Trigger>
            </NativeTabs>
        </OtpDataProvider>
    );
}
