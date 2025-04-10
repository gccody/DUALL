import { colors } from '@/global';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner, } from 'react-native-vision-camera';

export default function Add() {
    const device = useCameraDevice('back');
    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: (codes) => {
            console.log("Scanned Codes: ", codes[0]);
        }
    })

    if (device == null) return (
        <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.black
        }}>
            <Text style={{
                color: colors.white
            }}>
                Unable to use Camera
            </Text>
        </View>
    )
    return <Camera device={device} codeScanner={codeScanner} isActive={true} />
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
