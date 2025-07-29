import SettingCategory from '@/components/SettingCategory';
import SettingItem from '@/components/SettingItem';
import SubText from '@/components/SubText';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { useOtpData } from '@/hooks/useOtpData';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import pkg from '../../package.json';

export default function SettingsScreen() {
    const { theme, isDark } = useTheme();
    const { settings, updateSetting, isLoading } = useSettings();
    const { updateServices } = useOtpData();

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
                <ActivityIndicator size="large" color={theme.accent} />
            </SafeAreaView>
        );
    }

    const deleteCodes = async () => {
        Alert.prompt(
            "Danger!",
            "Are you sure you want to delete everything? Type: Delete Codes",
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
                        await updateServices([]);
                        return Alert.alert("Codes are deleted");
                    }
                }
            ],
        )
    }

    const openGithub = async () => {
        await WebBrowser.openBrowserAsync(pkg.homepage);
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <SettingCategory name='Appearance'>
                    <SettingItem iconName={isDark ? "moon-o" : "sun-o"} text='Dark Mode'>
                        <Switch
                            value={isDark}
                            onValueChange={() => updateSetting('darkMode', !settings.darkMode)}
                            trackColor={{ false: '#767577', true: '#6C63FF' }}
                            thumbColor={'#f4f3f4'}
                        />
                    </SettingItem>
                </SettingCategory>

                <SettingCategory name='Tokens'>
                    <SettingItem iconName='eye-slash' text='Hide Tokens'>
                        <Switch
                            value={settings.hideTokens}
                            onValueChange={(value) => updateSetting('hideTokens', value)}
                            trackColor={{ false: '#767577', true: '#6C63FF' }}
                            thumbColor={'#f4f3f4'}
                        />
                    </SettingItem>
                    <SettingItem iconName='forward' text='Show Next Token'>
                        <Switch
                            value={settings.showNextToken}
                            onValueChange={(value) => updateSetting('showNextToken', value)}
                            trackColor={{ false: '#767577', true: '#6C63FF' }}
                            thumbColor={'#f4f3f4'}
                        />
                    </SettingItem>
                    <SettingItem iconName='bell' text='Notify When Token Copied'>
                        <Switch
                            value={settings.notifyWhenTokenCopied}
                            onValueChange={(value) => updateSetting('notifyWhenTokenCopied', value)}
                            trackColor={{ false: '#767577', true: '#6C63FF' }}
                            thumbColor={'#f4f3f4'}
                        />
                    </SettingItem>
                </SettingCategory>

                <SettingCategory name='Application'>
                    <SettingItem iconName='search' text='Search On Startup'>
                        <Switch
                            value={settings.searchOnStartup}
                            onValueChange={(value) => updateSetting('searchOnStartup', value)}
                            trackColor={{ false: '#767577', true: '#6C63FF' }}
                            thumbColor={'#f4f3f4'}
                        />
                    </SettingItem>
                </SettingCategory>

                <SettingCategory name='About'>
                    <SettingItem iconName='info-circle' text='App Version'>
                        <SubText text={Constants.expoConfig?.version?.toString() ?? "1.0.0"} />
                    </SettingItem>
                    <TouchableOpacity onPress={openGithub}>
                        <SettingItem iconName='github' text='Github Repo'>
                            <SubText text={pkg.homepage.replace("https://github.com/", "")} />
                        </SettingItem>
                    </TouchableOpacity>
                </SettingCategory>

                <SettingCategory name='Danger!!!'>
                    <TouchableOpacity onPress={deleteCodes}>
                        <SettingItem iconName='exclamation-triangle' text='Delete Codes' />
                    </TouchableOpacity>
                </SettingCategory>
            </ScrollView>
        </SafeAreaView>
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
