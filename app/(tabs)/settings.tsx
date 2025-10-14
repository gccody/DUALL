import PinAuthView from '@/components/PinAuthView';
import SettingCategory from '@/components/SettingCategory';
import SettingItem from '@/components/SettingItem';
import SubText from '@/components/SubText';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { useOtpData } from '@/hooks/useOtpData';
import { providerRegistry } from '@/parsers/registry';
import { convertToService } from '@/parsers/utils';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import pkg from '../../package.json';

export default function SettingsScreen() {
    const { theme, isDark } = useTheme();
    const { settings, updateSetting, isLoading } = useSettings();
    const { data, updateServices } = useOtpData();
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [pinSetupKey, setPinSetupKey] = useState(0);
    const navigation = useNavigation();

    // Hide tab bar when PIN setup is shown
    useEffect(() => {
        if (showPinSetup) {
            // Hide tab bar by setting the parent route options
            navigation.setOptions({
                tabBarStyle: { display: 'none' }
            });

            // Return cleanup function
            return () => {
                navigation.setOptions({
                    tabBarStyle: {
                        display: 'flex',
                        backgroundColor: theme.tabBarBackground
                    }
                });
            };
        }
    }, [showPinSetup, navigation, theme.tabBarBackground]);

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
                            await SecureStore.deleteItemAsync('user_pin');
                            Alert.alert("PIN Reset", "Your PIN has been reset successfully. Please set up a new PIN.");
                            setPinSetupKey(prev => prev + 1); // Force re-render with new key
                            setShowPinSetup(true);
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

    const importCodes = async () => {
        // Get all available providers
        const providers = providerRegistry.getAllProviders();

        // Create provider selection options
        const providerOptions = providers.map(provider => ({
            text: provider.displayName,
            onPress: () => importFromProvider(provider.name)
        }));

        // Show provider selection dialog
        Alert.alert(
            "Import Codes",
            "Select the app you're importing from:",
            [
                ...providerOptions,
                {
                    text: 'Cancel',
                    style: 'cancel',
                    isPreferred: true
                }
            ]
        );
    }

    const importFromProvider = async (providerName: string | null) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/json', 'text/plain', 'text/csv', 'com.2fas.auth'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const file = result.assets[0];

            // Read the file content
            const response = await fetch(file.uri);
            const content = await response.text();

            let parseResult;

            if (providerName) {
                // Parse with specific provider
                const provider = providerRegistry.getProvider(providerName);
                if (!provider) {
                    Alert.alert("Error", `Provider ${providerName} not found`);
                    return;
                }

                try {
                    const data = provider.parse(content);
                    parseResult = {
                        provider: provider.displayName,
                        data
                    };
                } catch (error) {
                    console.error(`Failed to parse with ${providerName}:`, error);
                    Alert.alert("Parse Error", `Failed to parse the file with ${provider.displayName}. Please make sure you selected the correct provider.`);
                    return;
                }
            } else {
                // Auto-detect provider
                try {
                    parseResult = providerRegistry.parseAuto(content);
                } catch (error) {
                    console.error('Auto-detection failed:', error);
                    Alert.alert("Detection Error", "Could not detect the format of the selected file. Please try selecting the specific app you're importing from.");
                    return;
                }
            }

            // Convert to Service format
            const newServices = parseResult.data.map((otpData: any, index: number) =>
                convertToService(otpData, index)
            );

            // Get existing services
            const existingServices = data?.services || [];

            // Show confirmation dialog
            Alert.alert(
                `Import from ${parseResult.provider}`,
                `Found ${newServices.length} codes to import. Do you want to add them to your existing codes?`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        isPreferred: true
                    },
                    {
                        text: 'Import',
                        onPress: async () => {
                            try {
                                // Combine existing and new services
                                const updatedServices = [...existingServices, ...newServices];
                                await updateServices(updatedServices);
                                Alert.alert("Success", `Successfully imported ${newServices.length} codes from ${parseResult.provider}`);
                            } catch (error) {
                                console.error('Failed to import codes:', error);
                                Alert.alert("Error", "Failed to import codes. Please try again.");
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Import error:', error);
            Alert.alert("Import Error", "Failed to read or parse the selected file. Please make sure it's a valid export file.");
        }
    }

    // If PIN setup is shown, render PIN setup view
    if (showPinSetup) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
                <PinAuthView
                    key={pinSetupKey}
                    onPinSuccess={() => setShowPinSetup(false)}
                    onPinFailure={(error) => {
                        console.error('PIN setup failed:', error);
                        setShowPinSetup(false);
                    }}
                />
            </SafeAreaView>
        );
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
                    <SettingItem iconName='user' text='Use Biometrics'>
                        <Switch
                            value={settings.useBiometrics}
                            onValueChange={(value) => updateSetting('useBiometrics', value)}
                            trackColor={{ false: '#767577', true: '#6C63FF' }}
                            thumbColor={'#f4f3f4'}
                        />
                    </SettingItem>
                    <SettingItem iconName='search' text='Search On Startup'>
                        <Switch
                            value={settings.searchOnStartup}
                            onValueChange={(value) => updateSetting('searchOnStartup', value)}
                            trackColor={{ false: '#767577', true: '#6C63FF' }}
                            thumbColor={'#f4f3f4'}
                        />
                    </SettingItem>
                    <TouchableOpacity onPress={importCodes}>
                        <SettingItem iconName='download' text='Import Codes' />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={resetPin}>
                        <SettingItem iconName='refresh' text='Reset PIN' color={theme.danger} />
                    </TouchableOpacity>
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
                        <SettingItem iconName='exclamation-triangle' text='Delete Codes' color={theme.danger} />
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
