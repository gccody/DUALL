import { useVault } from '@/context/VaultContext';
import { useRouter } from 'expo-router';
import { Alert, Platform } from 'react-native';

const DELETE_CONFIRMATION = 'Delete Codes';

/** Destructive settings actions, each behind a confirmation. */
export function useDangerActions() {
    const { services, status, clear } = useVault();
    const router = useRouter();

    const deleteCodes = () => {
        const count = status === 'ready' ? services.length : undefined;
        const target = count === undefined ? 'all codes' : `${count} code${count === 1 ? '' : 's'}`;

        const performDelete = async () => {
            try {
                await clear();
                Alert.alert('Codes are deleted');
            } catch (error) {
                console.error('Failed to delete codes:', error);
                Alert.alert('Error', 'Failed to delete codes. Please try again.');
            }
        };

        if (Platform.OS === 'ios') {
            // Make the user type the confirmation.
            Alert.prompt(
                'Danger!',
                `Are you sure you want to delete everything (${target})? Type: ${DELETE_CONFIRMATION}`,
                [
                    { text: 'Cancel', style: 'cancel', isPreferred: true },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: (text?: string) => {
                            if (text !== DELETE_CONFIRMATION) return Alert.alert('Did not delete codes');
                            return performDelete();
                        },
                    },
                ],
            );
            return;
        }

        // Alert.prompt is iOS-only, so require two explicit confirmations elsewhere.
        Alert.alert('Danger!', 'Delete all codes?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Continue',
                style: 'destructive',
                onPress: () => Alert.alert('Are you absolutely sure?', `This cannot be undone. Delete ${target}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: performDelete },
                ]),
            },
        ]);
    };

    const resetPin = () => {
        Alert.alert(
            'Reset PIN',
            'Are you sure you want to reset your PIN? You will need to set up a new PIN. Your current PIN stays active until the new one is saved.',
            [
                { text: 'Cancel', style: 'cancel', isPreferred: true },
                // The old PIN is never cleared here: the setup screen overwrites
                // it once the new PIN is confirmed, so leaving setup early
                // (cancel, back button, app killed) can't leave the app without one.
                { text: 'Reset', style: 'destructive', onPress: () => router.push('/pin-setup') },
            ],
        );
    };

    return { deleteCodes, resetPin };
}
