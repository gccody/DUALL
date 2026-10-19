import { useVault } from '@/context/VaultContext';
import { buildExportText, exportFileName } from '@/core/export';
import { importProviders, parseImport, type ImportProvider, type ImportResult } from '@/core/import';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

const IMPORT_FILE_TYPES = ['application/json', 'text/plain', 'text/csv', 'com.2fas.auth'];

/** Asks which app the codes come from. Resolves null when cancelled. */
function chooseImportProvider(): Promise<ImportProvider | null> {
    const title = 'Import Codes';
    const message = "Select the app you're importing from:";

    return new Promise((resolve) => {
        if (Platform.OS === 'ios') {
            const options = [...importProviders.map((provider) => provider.displayName), 'Cancel'];
            ActionSheetIOS.showActionSheetWithOptions(
                { title, message, options, cancelButtonIndex: options.length - 1 },
                (index) => resolve(importProviders[index] ?? null),
            );
            return;
        }

        Alert.alert(title, message, [
            ...importProviders.map((provider) => ({ text: provider.displayName, onPress: () => resolve(provider) })),
            { text: 'Cancel', style: 'cancel', isPreferred: true, onPress: () => resolve(null) },
        ]);
    });
}

/** Lets the user pick an export file and reads it. Resolves null when cancelled. */
async function pickImportFile(): Promise<string | null> {
    const result = await DocumentPicker.getDocumentAsync({
        type: IMPORT_FILE_TYPES,
        copyToCacheDirectory: true,
    });
    const asset = result.canceled ? undefined : result.assets?.[0];
    if (!asset) return null;
    return new File(asset.uri).text();
}

function confirmImport(provider: ImportProvider, { services, skippedHotp }: ImportResult): Promise<boolean> {
    const hotpNote = skippedHotp > 0
        ? `\n\n${skippedHotp} counter-based (HOTP) code${skippedHotp === 1 ? '' : 's'} will be skipped because ${skippedHotp === 1 ? "it isn't" : "they aren't"} supported.`
        : '';

    return new Promise((resolve) => {
        Alert.alert(
            `Import from ${provider.displayName}`,
            `Found ${services.length} codes to import. Do you want to add them to your existing codes?${hotpNote}`,
            [
                { text: 'Cancel', style: 'cancel', isPreferred: true, onPress: () => resolve(false) },
                { text: 'Import', onPress: () => resolve(true) },
            ],
        );
    });
}

/** Import from another authenticator app's export file, and export as otpauth:// URIs. */
export function useCodeTransfer() {
    const { services, status, importServices } = useVault();

    const importCodes = async () => {
        if (status === 'error') {
            Alert.alert('Error', "Your codes couldn't be loaded, so nothing can be imported right now.");
            return;
        }

        const provider = await chooseImportProvider();
        if (!provider) return;

        let content: string | null;
        try {
            content = await pickImportFile();
        } catch (error) {
            console.error('Import error:', error);
            Alert.alert('Import Error', "Failed to read or parse the selected file. Please make sure it's a valid export file.");
            return;
        }
        if (content === null) return;

        let parsed: ImportResult;
        try {
            parsed = parseImport(provider.id, content);
        } catch (error) {
            console.error(`Failed to parse with ${provider.id}:`, error);
            const reason = error instanceof Error ? error.message : 'Unknown error';
            Alert.alert('Parse Error', `Failed to parse the file with ${provider.displayName}. ${reason}`);
            return;
        }

        if (!(await confirmImport(provider, parsed))) return;

        try {
            // Waits for the codes to finish loading, then appends the new ones
            // and skips the ones already present.
            const { added, duplicates } = await importServices(parsed.services);
            const skipped = [
                duplicates > 0 ? `${duplicates} already in DUALL` : '',
                parsed.skippedHotp > 0 ? `${parsed.skippedHotp} unsupported HOTP` : '',
            ].filter(Boolean).join(', ');
            Alert.alert(
                'Success',
                `Successfully imported ${added} codes from ${provider.displayName}` +
                (skipped ? ` (skipped: ${skipped})` : ''),
            );
        } catch (error) {
            console.error('Failed to import codes:', error);
            Alert.alert('Error', 'Failed to import codes. Please try again.');
        }
    };

    const exportCodes = async () => {
        if (status === 'loading') {
            Alert.alert('Still loading codes. Please wait');
            return;
        }
        if (services.length === 0) {
            Alert.alert("Couldn't find any codes to export");
            return;
        }

        try {
            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert('Error', 'Sharing is not available on this device');
                return;
            }

            const file = new File(Paths.cache, exportFileName(new Date()));
            await file.write(buildExportText(services));
            await Sharing.shareAsync(file.uri, {
                mimeType: 'text/plain',
                dialogTitle: 'Export TOTP Codes',
            });
            Alert.alert('Success', `Successfully exported ${services.length} codes`);
        } catch (error) {
            console.error('Export error:', error);
            Alert.alert('Export Error', 'Failed to export codes. Please try again.');
        }
    };

    return { importCodes, exportCodes };
}
