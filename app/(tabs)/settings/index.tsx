import SettingCategory from '@/components/SettingCategory';
import SettingItem from '@/components/SettingItem';
import SubText from '@/components/SubText';
import { useOtpData } from '@/context/OtpDataContext';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { importProviders, parseImport, type ImportProvider, type ImportResult } from '@/core/import';
import { createService, isDuplicateService, serviceToUri } from '@/core/service';
import type { Service } from '@/types';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { clearPin } from '@/utils/pin';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import pkg from '../../../package.json';

export default function SettingsScreen() {
    const { theme, isDark } = useTheme();
    const { settings, updateSetting, isLoading } = useSettings();
    const { data, loading, updateServices } = useOtpData();
    const router = useRouter();

    // Latest services, read when an async flow (e.g. import confirmation) finishes
    // so codes added elsewhere in the meantime aren't overwritten.
    const servicesRef = useRef(data?.services);
    useEffect(() => {
        servicesRef.current = data?.services;
    }, [data?.services]);

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    const deleteCodes = async () => {
        const count = data?.services.length;
        const target = count === undefined ? 'all codes' : `${count} code${count === 1 ? '' : 's'}`;

        const performDelete = async () => {
            await updateServices([]);
            Alert.alert("Codes are deleted");
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

    const importCodes = async () => {
        const providers = importProviders;

        // Use the native action sheet on iOS
        if (Platform.OS === 'ios') {
            const options = [...providers.map(provider => provider.displayName), 'Cancel'];
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: "Import Codes",
                    message: "Select the app you're importing from:",
                    options,
                    cancelButtonIndex: options.length - 1,
                },
                (index) => {
                    if (index < providers.length) importFromProvider(providers[index]);
                }
            );
            return;
        }

        // Create provider selection options
        const providerOptions = providers.map(provider => ({
            text: provider.displayName,
            onPress: () => importFromProvider(provider)
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

    const exportCodes = async () => {
        if (loading)
            return Alert.alert("Still loading codes. Please wait");
        const services = data?.services;
        if (!services || services.length === 0)
            return Alert.alert("Couldn't find any codes to export")

        try {
            const uris: string[] = []
            for (const service of services) {
                uris.push(serviceToUri(service))
            }

            // Create a temporary file
            const date = new Date();
            const file = new File(Paths.cache, `duall-${date.toISOString()}.txt`)
            await file.write(uris.join("\n"));

            // Share the file
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(file.uri, {
                    mimeType: 'text/plain',
                    dialogTitle: 'Export TOTP Codes',
                });
                Alert.alert("Success", `Successfully exported ${uris.length} codes`);
            } else {
                Alert.alert("Error", "Sharing is not available on this device");
            }
        } catch (error) {
            console.error('Export error:', error);
            Alert.alert("Export Error", "Failed to export codes. Please try again.");
        }
    }

    const importFromProvider = async (provider: ImportProvider) => {
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

            let parseResult: ImportResult;
            try {
                parseResult = parseImport(provider.id, content);
            } catch (error) {
                console.error(`Failed to parse with ${provider.id}:`, error);
                const reason = error instanceof Error ? error.message : 'Unknown error';
                Alert.alert("Parse Error", `Failed to parse the file with ${provider.displayName}. ${reason}`);
                return;
            }

            const { services: entries, skippedHotp } = parseResult;
            const hotpNote = skippedHotp > 0
                ? `\n\n${skippedHotp} counter-based (HOTP) code${skippedHotp === 1 ? '' : 's'} will be skipped because ${skippedHotp === 1 ? "it isn't" : "they aren't"} supported.`
                : '';

            // Show confirmation dialog
            Alert.alert(
                `Import from ${provider.displayName}`,
                `Found ${entries.length} codes to import. Do you want to add them to your existing codes?${hotpNote}`,
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
                                // Append to the latest existing services, skipping codes already present
                                const existing = servicesRef.current || [];
                                const added: Service[] = [];
                                for (const entry of entries) {
                                    const service = createService(entry, existing.length + added.length);
                                    if (!isDuplicateService(existing, service) && !isDuplicateService(added, service)) {
                                        added.push(service);
                                    }
                                }
                                await updateServices([...existing, ...added]);

                                const duplicates = entries.length - added.length;
                                const skipped = [
                                    duplicates > 0 ? `${duplicates} already in DUALL` : '',
                                    skippedHotp > 0 ? `${skippedHotp} unsupported HOTP` : '',
                                ].filter(Boolean).join(', ');
                                Alert.alert(
                                    "Success",
                                    `Successfully imported ${added.length} codes from ${provider.displayName}` +
                                    (skipped ? ` (skipped: ${skipped})` : '')
                                );
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
