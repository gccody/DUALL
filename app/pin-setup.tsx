import PinAuthView from '@/components/PinAuthView';
import { useRouter } from 'expo-router';

export default function PinSetupScreen() {
    const router = useRouter();

    return (
        <PinAuthView
            onPinSuccess={() => router.back()}
            onPinFailure={(error) => {
                console.error('PIN setup failed:', error);
                router.back();
            }}
        />
    );
}
