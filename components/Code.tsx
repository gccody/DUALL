import { TOTP } from "@/TOTP";
import { Service, TOTPOptions, TOTPResult } from "@/types";
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleProp, Text, TouchableHighlight, View, ViewStyle } from "react-native";

interface CodeProps {
    service: Service;
    opts?: TOTPOptions;
    globalTimestamp: number; // <== new prop
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
                <View style={{
                    flex: 1,
                    flexDirection: 'column'
                }}>
                    <Text style={{ color: 'white' }}>
                        {service.otp.issuer}
                    </Text>
                    <Text style={{ color: 'grey' }}>
                        {service.name}
                    </Text>
                    <Text style={{ fontSize: 38, color: textColor }}>{otpData.otp}</Text>
                </View>
                <Text style={{ fontSize: 38, color: 'white' }}>{timeLeft}</Text>
            </View>
        </TouchableHighlight>
    );
}

