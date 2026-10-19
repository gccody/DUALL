import CenteredMessage from '@/components/ui/CenteredMessage';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { isOtpAuthUri } from '@/core/otp/uri';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Polygon, Svg } from 'react-native-svg';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner, } from 'react-native-vision-camera';

interface QRPoints {
    x: number,
    y: number
}
export default function Add() {
    const [cameraActive, setCameraActive] = useState(true);
    const [qrPoints, setQrPoints] = useState<QRPoints[]>([]);
    // onCodeScanned can fire several times before the camera deactivates
    const scanHandledRef = useRef(false);
    const {
        hasPermission: cameraHasPermission,
        requestPermission: requestCameraPermission,
    } = useCameraPermission();
    const router = useRouter();

    const device = useCameraDevice('back');
    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: (codes) => {
            if (scanHandledRef.current)
                return;
            setCameraActive(false);
            const corners = codes[0].corners;
            if (corners)
                setQrPoints(corners)
            const url = codes[0].value;
            if (!url)
                return setCameraActive(true);
            scanHandledRef.current = true;
            if (!isOtpAuthUri(url)) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert(
                    'Not an authenticator QR code',
                    'Scan a QR code that sets up two-factor authentication.',
                    [{ text: 'OK', onPress: resumeScanning }],
                    { onDismiss: resumeScanning }
                );
                return;
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // scanId makes every scan distinct so re-scanning the same code still triggers
            router.push({ pathname: '/', params: { otpurl: url, scanId: Crypto.randomUUID() } });
        }
    })

    const resumeScanning = () => {
        scanHandledRef.current = false;
        setQrPoints([]);
        setCameraActive(true);
    }

    // Run the camera only while this tab is focused. useFocusEffect re-runs
    // whenever the callback changes, so it stays explicitly memoized.
    useFocusEffect(
        useCallback(() => {
            scanHandledRef.current = false;
            setCameraActive(true);
            return () => setCameraActive(false);
        }, [])
    );

    useEffect(() => {
        if (!cameraHasPermission) {
            requestCameraPermission();
        }
    }, [cameraHasPermission, requestCameraPermission]);

    if (!cameraHasPermission) return <CenteredMessage message="Do not have permission to use the camera" />;
    if (!device) return <CenteredMessage message="Unable to use Camera" />;

    return (
        <View style={{ flex: 1 }}>
            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={cameraActive}
                codeScanner={codeScanner}
            />
            {
                qrPoints.length > 0 ?
                    <Svg
                        style={{ backgroundColor: 'transparent', zIndex: 1000 }}
                    >
                        <Polygon
                            points={qrPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                            stroke='yellow'
                            strokeWidth={2}
                        />
                    </Svg>
                    :
                    <></>
            }
        </View>
    )
}
