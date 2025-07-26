import { useTheme } from '@/context/ThemeContext';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Polygon, Svg } from 'react-native-svg';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner, } from 'react-native-vision-camera';

interface QRPoints {
    x: number,
    y: number
}

export default function Add() {
    const [cameraActive, setCameraActive] = useState(true);
    const [qrPoints, setQrPoints] = useState<Array<QRPoints>>([]);
    const {
        hasPermission: cameraHasPermission,
        requestPermission: requestCameraPermission,
    } = useCameraPermission();
    const route = useRoute();
    const router = useRouter();
    const { theme } = useTheme();

    const handleTabSelected = () => {
        setCameraActive(true);
    }

    const handleTabDeselected = () => {
        setCameraActive(false);
    }

    useFocusEffect(
        useCallback(() => {

            handleTabSelected();

            return () => {
                handleTabDeselected();
            };

        }, [route.name])
    );

    useEffect(() => {
        if (!cameraHasPermission) {
            requestCameraPermission();
        }
    }, []);

    if (!cameraHasPermission) {
        return (
            <View style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.background
            }}>
                <Text style={{
                    color: theme.text
                }}>
                    Do not have permission to use the camera
                </Text>
            </View>
        )
    }

    const device = useCameraDevice('back');
    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: (codes) => {
            setCameraActive(false);
            const corners = codes[0].corners;
            if (corners)
                setQrPoints(corners)
            const url = codes[0].value;
            if (!url)
                return setCameraActive(true);
            router.push({ pathname: '/', params: { otpurl: url } });
        }
    })

    if (!device) return (
        <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.background
        }}>
            <Text style={{
                color: theme.text
            }}>
                Unable to use Camera
            </Text>
        </View>
    )
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
