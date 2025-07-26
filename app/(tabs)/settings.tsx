import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { FileHandler } from '@/utils/fileHandler';
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const { theme, isDark } = useTheme();
    const { settings, updateSetting, isLoading } = useSettings();

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
                        await FileHandler.updateServices([]);
                        return Alert.alert("Codes are deleted");
                    }
                }
            ],
        )
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
            <ScrollView>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>

                    <View style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}>
                        <View style={styles.settingContent}>
                            <FontAwesome name={isDark ? "moon-o" : "sun-o"} size={22} color={theme.text} style={styles.icon} />
                            <Text style={[styles.settingText, { color: theme.text }]}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={() => updateSetting('darkMode', !settings.darkMode)}
                            trackColor={{ false: '#767577', true: '#6C63FF' }}
                            thumbColor={'#f4f3f4'}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Tokens</Text>

                    <View style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}>
                        <View style={styles.settingContent}>
                            <FontAwesome name="eye-slash" size={22} color={theme.text} style={styles.icon} />
                            <Text style={[styles.settingText, { color: theme.text }]}>Hide Tokens</Text>
                        </View>
                        <Switch
                            value={settings.hideTokens}
                            onValueChange={(value) => updateSetting('hideTokens', value)}
                            trackColor={{ false: '#767577', true: '#6C63FF' }}
                            thumbColor={'#f4f3f4'}
                        />
                    </View>

                    <View style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}>
                        <View style={styles.settingContent}>
                            <FontAwesome name="forward" size={22} color={theme.text} style={styles.icon} />
                            <Text style={[styles.settingText, { color: theme.text }]}>Show Next Token</Text>
                        </View>
                        <Switch
                            value={settings.showNextToken}
                            onValueChange={(value) => updateSetting('showNextToken', value)}
                            trackColor={{ false: '#767577', true: '#6C63FF' }}
                            thumbColor={'#f4f3f4'}
                        />
                    </View>

                    <View style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}>
                        <View style={styles.settingContent}>
                            <FontAwesome name="bell" size={22} color={theme.text} style={styles.icon} />
                            <Text style={[styles.settingText, { color: theme.text }]}>Notify When Token Copied</Text>
                        </View>
                        <Switch
                            value={settings.notifyWhenTokenCopied}
                            onValueChange={(value) => updateSetting('notifyWhenTokenCopied', value)}
                            trackColor={{ false: '#767577', true: '#6C63FF' }}
                            thumbColor={'#f4f3f4'}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Application</Text>

                    <View style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}>
                        <View style={styles.settingContent}>
                            <FontAwesome name="search" size={22} color={theme.text} style={styles.icon} />
                            <Text style={[styles.settingText, { color: theme.text }]}>Search On Startup</Text>
                        </View>
                        <Switch
                            value={settings.searchOnStartup}
                            onValueChange={(value) => updateSetting('searchOnStartup', value)}
                            trackColor={{ false: '#767577', true: '#6C63FF' }}
                            thumbColor={'#f4f3f4'}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>

                    <TouchableOpacity style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}>
                        <View style={styles.settingContent}>
                            <FontAwesome name="info-circle" size={22} color={theme.text} style={styles.icon} />
                            <Text style={[styles.settingText, { color: theme.text }]}>App Version</Text>
                        </View>
                        <Text style={[styles.settingValue, { color: theme.subText }]}>1.0.0</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Danger!!!</Text>

                    <TouchableOpacity style={[styles.settingItem, { backgroundColor: theme.cardBackground }]} onPress={deleteCodes}>
                        <View style={styles.settingContent}>
                            <FontAwesome name="exclamation-triangle" size={22} color={"red"} style={styles.icon} />
                            <Text style={[styles.settingText, { color: "red" }]}>Delete Codes</Text>
                        </View>
                    </TouchableOpacity>
                </View>
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
    section: {
        marginTop: 24,
        marginBottom: 8,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        marginBottom: 8,
        borderRadius: 12,
    },
    settingContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 12,
    },
    settingText: {
        fontSize: 16,
    },
    settingValue: {
        fontSize: 16,
    },
});
