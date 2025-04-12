import { TOTP } from "@/TOTP";
import { TOTPOptions, TOTPResult } from "@/types";
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleProp, Text, TouchableHighlight, View, ViewStyle } from "react-native";

interface CodeProps {
    secret: string;
    opts?: TOTPOptions;
    group?: string;
    account?: string;
    encoding?: TOTPOptions['encoding'];
    timestamp?: TOTPOptions['timestamp'];
    style?: StyleProp<ViewStyle>;
}

interface CodeProps {
    secret: string;
    opts?: TOTPOptions;
    globalTimestamp: number; // <== new prop
    style?: StyleProp<ViewStyle>;
}

export default function Code({ secret, opts, globalTimestamp, style }: CodeProps) {
    const [otpData, setOtpData] = useState<TOTPResult>({ otp: '------', expires: Date.now() });
    const [isError, setIsError] = useState(false);

    const totpOptions = useRef({
        digits: opts?.digits ?? 6,
        period: opts?.period ?? 30,
        algorithm: opts?.algorithm ?? 'SHA-1',
    }).current;

    const generateAndSetOTP = useCallback(() => {
        try {
            const newOtp = TOTP.generate(secret, totpOptions);
            setOtpData(newOtp);
        } catch (e) {
            console.error(e);
            setIsError(true);
            setOtpData({ otp: 'Error!', expires: Date.now() + totpOptions.period * 1000 });
        }
    }, [secret, totpOptions]);

    // Refresh OTP when it expires
    useEffect(() => {
        if (globalTimestamp >= otpData.expires) {
            generateAndSetOTP();
        }
    }, [globalTimestamp, otpData.expires, generateAndSetOTP]);

    const timeLeft = Math.max(0, Math.floor((otpData.expires - globalTimestamp) / 1000));
    const textColor = isError ? 'red' : 'white';

    return (
        <TouchableHighlight style={style} onPress={() => {
            requestAnimationFrame(async () => {
                await Clipboard.setStringAsync(otpData.otp);
                Alert.alert('Success', 'Code was copied to clipboard!');
            })
        }}>
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: 90,
                paddingHorizontal: 20,
            }}>
                <Text style={{ fontSize: 38, color: textColor }}>{otpData.otp}</Text>
                <Text style={{ fontSize: 38, color: 'white' }}>{timeLeft}</Text>
            </View>
        </TouchableHighlight>
    );
}

