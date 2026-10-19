import SettingsRow from '@/components/settings/SettingsRow';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsSwitch from '@/components/settings/SettingsSwitch';
import CenteredMessage from '@/components/ui/CenteredMessage';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { useCodeTransfer } from '@/hooks/useCodeTransfer';
import { useDangerActions } from '@/hooks/useDangerActions';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, StyleSheet } from 'react-native';
import pkg from '../../../package.json';

const APP_VERSION = String(Constants.expoConfig?.extra?.displayVersion ?? Constants.expoConfig?.version ?? '1.0.0');
const REPO_NAME = pkg.homepage.replace('https://github.com/', '');

const openGithub = () => WebBrowser.openBrowserAsync(pkg.homepage);

export default function SettingsScreen() {
    const { theme, isDark } = useTheme();
    const { isLoading } = useSettings();
    const { importCodes, exportCodes } = useCodeTransfer();
    const { deleteCodes, resetPin } = useDangerActions();

    if (isLoading) return <CenteredMessage spinner />;

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.background }]}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
        >
            <SettingsSection title='Appearance'>
                <SettingsSwitch icon={isDark ? 'moon-o' : 'sun-o'} label='Dark Mode' setting='darkMode' />
            </SettingsSection>

            <SettingsSection title='Tokens'>
                <SettingsSwitch icon='eye-slash' label='Hide Tokens' setting='hideTokens' />
                <SettingsSwitch icon='forward' label='Show Next Token' setting='showNextToken' />
                <SettingsSwitch icon='bell' label='Notify When Token Copied' setting='notifyWhenTokenCopied' />
            </SettingsSection>

            <SettingsSection title='Application'>
                <SettingsSwitch icon='user' label='Use Biometrics' setting='useBiometrics' />
                <SettingsSwitch icon='search' label='Search On Startup' setting='searchOnStartup' />
                <SettingsRow icon='download' label='Import Codes' onPress={importCodes} />
                <SettingsRow icon='upload' label='Export Codes' onPress={exportCodes} />
                <SettingsRow icon='refresh' label='Reset PIN' color={theme.danger} onPress={resetPin} />
            </SettingsSection>

            <SettingsSection title='About'>
                <SettingsRow icon='info-circle' label='App Version' value={APP_VERSION} />
                <SettingsRow icon='github' label='Github Repo' value={REPO_NAME} onPress={openGithub} />
            </SettingsSection>

            <SettingsSection title='Danger!!!'>
                <SettingsRow icon='exclamation-triangle' label='Delete Codes' color={theme.danger} onPress={deleteCodes} />
            </SettingsSection>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
