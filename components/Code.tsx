import { TOTP } from "@/TOTP";
import { Service, TOTPOptions, TOTPResult } from "@/types";
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleProp, StyleSheet, Text, TouchableHighlight, View, ViewStyle } from "react-native";
import ProgressBar from "./ProgressBar";

interface CodeProps {
    service: Service;
    opts?: TOTPOptions;
    globalTimestamp: number;
    style?: StyleProp<ViewStyle>;
}

export default function Code({ service, opts, globalTimestamp, style }: CodeProps) {
    const [otpData, setOtpData] = useState<TOTPResult>({ otp: '------', expires: Date.now() });
    const [isError, setIsError] = useState(false);

    const totpOptions = useRef({
        digits: opts?.digits ?? 6,
        period: opts?.period ?? 30,
        algorithm: opts?.algorithm ?? 'SHA-1',
    }).current;

    const generateAndSetOTP = useCallback(() => {
        try {
            const newOtp = TOTP.generate(service.secret, totpOptions);
            setOtpData(newOtp);
        } catch (e) {
            console.error(e);
            setIsError(true);
            setOtpData({ otp: 'Error!', expires: Date.now() + totpOptions.period * 1000 });
        }
    }, [service.secret, totpOptions]);

    // Refresh OTP when it expires
    useEffect(() => {
        if (globalTimestamp >= otpData.expires) {
            generateAndSetOTP();
        }
    }, [globalTimestamp, otpData.expires, generateAndSetOTP]);

    const timeLeft = Math.max(0, Math.floor((otpData.expires - globalTimestamp) / 1000));
    const textColor = isError ? 'red' : 'white';

    return (
        <TouchableHighlight style={[styles.buttonContainer, style]} onPress={() => {
            requestAnimationFrame(async () => {
                await Clipboard.setStringAsync(otpData.otp);
                Alert.alert('Success', 'Code was copied to clipboard!');
            })
        }}>
            <View>
                <View style={styles.container}>
                    <View style={styles.otpInfo}>
                        <Text style={styles.whiteText}>
                            {service.otp.issuer}
                        </Text>
                        <Text style={styles.greyText}>
                            {service.name}
                        </Text>
                        <Text style={[styles.mainText, { color: textColor }]}>{otpData.otp}</Text>
                    </View>
                    <Text style={[styles.mainText, styles.whiteText]}>{timeLeft}</Text>
                </View>
                <ProgressBar
                    progress={timeLeft / (service.otp.period - 1)}
                    fillColor="green"
                    backgroundColor="white"
                    borderRadius={2}
                    height={5}
                    style={styles.progressBar}
                />
            </View>
        </TouchableHighlight>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        marginHorizontal: 20,
        marginBottom: 20,
        backgroundColor: '#262626',
        padding: 5,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        height: 125,
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    whiteText: {
        color: 'white'
    },
    greyText: {
        color: 'grey'
    },
    otpInfo: {
        flex: 1,
        flexDirection: 'column'
    },
    mainText: {
        fontSize: 32
    },
    count: {

    },
    progressBar: {
        paddingTop: 10
    }
})