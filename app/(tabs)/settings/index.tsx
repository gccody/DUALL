import SettingCategory from '@/components/SettingCategory';
import SettingItem from '@/components/SettingItem';
import SubText from '@/components/SubText';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { useVault } from '@/context/VaultContext';
import { useCodeTransfer } from '@/hooks/useCodeTransfer';
import Constants from 'expo-constants';
import { clearPin } from '@/utils/pin';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import pkg from '../../../package.json';

export default function SettingsScreen() {
    const { theme, isDark } = useTheme();
    const { settings, updateSetting, isLoading } = useSettings();
    const { services, status, clear } = useVault();
    const { importCodes, exportCodes } = useCodeTransfer();
    const router = useRouter();

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    const deleteCodes = async () => {
        const count = status === 'ready' ? services.length : undefined;
        const target = count === undefined ? 'all codes' : `${count} code${count === 1 ? '' : 's'}`;

        const performDelete = async () => {
            try {
                await clear();
                Alert.alert("Codes are deleted");
            } catch (error) {
                console.error('Failed to delete codes:', error);
                Alert.alert("Error", "Failed to delete codes. Please try again.");
            }
        };

        if (Platform.OS === 'ios') {
            Alert.prompt(
                "Danger!",
                `Are you sure you want to delete everything (${target})? Type: Delete Codes`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        isPreferred: true
                    },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async (text?: string) => {
                            if (text !== "Delete Codes") return Alert.alert("Did not delete codes");
                            return performDelete();
                        }
                    }
                ],
            );
            return;
        }

        // Alert.prompt is iOS-only, so require two explicit confirmations elsewhere.
        Alert.alert(
            "Danger!",
            "Delete all codes?",
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Continue',
                    style: 'destructive',
                    onPress: () => Alert.alert(
                        "Are you absolutely sure?",
                        `This cannot be undone. Delete ${target}?`,
                        [
                            {
                                text: 'Cancel',
                                style: 'cancel'
                            },
                            {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: performDelete
                            }
                        ],
                    )
                }
            ],
        );
    }

    const resetPin = async () => {
        Alert.alert(
            "Reset PIN",
            "Are you sure you want to reset your PIN? You will need to set up a new PIN.",
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    isPreferred: true
                },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await clearPin();
                            Alert.alert("PIN Reset", "Your PIN has been reset successfully. Please set up a new PIN.");
                            router.push('/pin-setup');
                        } catch (error) {
                            console.error('Failed to reset PIN:', error);
                            Alert.alert("Error", "Failed to reset PIN. Please try again.");
                        }
                    }
                }
            ],
        )
    }

    const openGithub = async () => {
        await WebBrowser.openBrowserAsync(pkg.homepage);
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.background }]}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
        >
            <SettingCategory name='Appearance'>
                <SettingItem iconName={isDark ? "moon-o" : "sun-o"} text='Dark Mode'>
                    <Switch
                        value={isDark}
                        onValueChange={() => updateSetting('darkMode', !settings.darkMode)}
                        trackColor={{ true: theme.accent }}
                    />
                </SettingItem>
            </SettingCategory>

            <SettingCategory name='Tokens'>
                <SettingItem iconName='eye-slash' text='Hide Tokens'>
                    <Switch
                        value={settings.hideTokens}
                        onValueChange={(value) => updateSetting('hideTokens', value)}
                        trackColor={{ true: theme.accent }}
                    />
                </SettingItem>
                <SettingItem iconName='forward' text='Show Next Token'>
                    <Switch
                        value={settings.showNextToken}
                        onValueChange={(value) => updateSetting('showNextToken', value)}
                        trackColor={{ true: theme.accent }}
                    />
                </SettingItem>
                <SettingItem iconName='bell' text='Notify When Token Copied'>
                    <Switch
                        value={settings.notifyWhenTokenCopied}
                        onValueChange={(value) => updateSetting('notifyWhenTokenCopied', value)}
                        trackColor={{ true: theme.accent }}
                    />
                </SettingItem>
            </SettingCategory>

            <SettingCategory name='Application'>
                <SettingItem iconName='user' text='Use Biometrics'>
                    <Switch
                        value={settings.useBiometrics}
                        onValueChange={(value) => updateSetting('useBiometrics', value)}
                        trackColor={{ true: theme.accent }}
                    />
                </SettingItem>
                <SettingItem iconName='search' text='Search On Startup'>
                    <Switch
                        value={settings.searchOnStartup}
                        onValueChange={(value) => updateSetting('searchOnStartup', value)}
                        trackColor={{ true: theme.accent }}
                    />
                </SettingItem>
                <TouchableOpacity onPress={importCodes}>
                    <SettingItem iconName='download' text='Import Codes' />
                </TouchableOpacity>
                <TouchableOpacity onPress={exportCodes}>
                    <SettingItem iconName='upload' text='Export Codes' />
                </TouchableOpacity>
                <TouchableOpacity onPress={resetPin}>
                    <SettingItem iconName='refresh' text='Reset PIN' color={theme.danger} />
                </TouchableOpacity>
            </SettingCategory>

            <SettingCategory name='About'>
                <SettingItem iconName='info-circle' text='App Version'>
                    <SubText text={String(Constants.expoConfig?.extra?.displayVersion ?? Constants.expoConfig?.version ?? "1.0.0")} />
                </SettingItem>
                <TouchableOpacity onPress={openGithub}>
                    <SettingItem iconName='github' text='Github Repo'>
                        <SubText text={pkg.homepage.replace("https://github.com/", "")} />
                    </SettingItem>
                </TouchableOpacity>
            </SettingCategory>

            <SettingCategory name='Danger!!!'>
                <TouchableOpacity onPress={deleteCodes}>
                    <SettingItem iconName='exclamation-triangle' text='Delete Codes' color={theme.danger} />
                </TouchableOpacity>
            </SettingCategory>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
