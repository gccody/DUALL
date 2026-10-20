import PinAuthView from '@/components/PinAuthView';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

/** Replaces the current PIN. It stays valid until the new one is saved, so leaving early is safe. */
export default function PinSetupScreen() {
    const router = useRouter();

    return (
        <PinAuthView
            forceSetup
            onPinSuccess={() => {
                router.back();
                Alert.alert('PIN Reset', 'Your new PIN has been saved.');
            }}
            onCancel={() => router.back()}
        />
    );
}
