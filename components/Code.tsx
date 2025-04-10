import { TOTP_Opts } from "@/types";
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useRef, useState } from "react";
import { Alert, AppState, AppStateStatus, Dimensions, StyleProp, Text, TouchableHighlight, View, ViewStyle } from "react-native";
import { TOTP } from 'totp-generator';

interface CodeProps {
    secret: string;
    opts?: TOTP_Opts
    group?: string;
    account?: string;
    style?: StyleProp<ViewStyle>;
}

export default function Code(data: CodeProps) {

    const TOTP_SECRET = data.secret;
    let TOTP_OPTS: TOTP_Opts = {
        digits: data.opts?.digits ?? 6,
        period: data.opts?.period ?? 30,
    }

    if (data.opts?.algorithm) {
        TOTP_OPTS.algorithm = data.opts.algorithm;
    }

    const generateTOTP = () => TOTP.generate(TOTP_SECRET, TOTP_OPTS);
    const copyToClipboard = async () => {
        let res = await Clipboard.setStringAsync(otpData.otp);
        Alert.alert(res ? 'Success' : 'Failed', res ? 'Code was copied to clipboard!' : 'Code failed to copy to clipboard');
    }

    const [otpData, setOtpData] = useState(generateTOTP());
    const [timeLeft, setTimeLeft] = useState(0);
    const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
    const appState = useRef(AppState.currentState);

    useEffect(() => { // Run once when the element is loaded
        const subscription = AppState.addEventListener('change', _handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, []);

    const _handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (
            appState.current.match(/inactive|background/) &&
            nextAppState === 'active'
        ) {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }
            const now = Date.now();
            const currentExpires = otpData.expires; // Read latest expires
            const remainingMillis = currentExpires - now;
            if (remainingMillis <= 0) {
                setOtpData(generateTOTP()); // Regenerate if expired
            } else {
                setTimeLeft(Math.max(0, Math.round(remainingMillis / 1000)));
            }
        }
        appState.current = nextAppState;
    };

    useEffect(() => { // Run every time the code expires

        const scheduleTick = () => {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
                timeoutIdRef.current = null;
            }

            const now = Date.now();
            const currentExpires = otpData.expires;
            const remainingMillis = currentExpires - now;

            const tempTimeLeft = Math.round(remainingMillis / 1000) - 1
            const currentSecondsLeft = tempTimeLeft < 0 ? 29 : tempTimeLeft;
            setTimeLeft(currentSecondsLeft);
            if (remainingMillis <= 10) {
                const newData = generateTOTP();
                setOtpData(newData);
            } else {
                const delay = 1000 - (now % 1000);

                timeoutIdRef.current = setTimeout(scheduleTick, delay);
            }
        };

        scheduleTick();

        return () => {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
                timeoutIdRef.current = null;
            }
        };
    }, [otpData.expires]);

    return (
        <TouchableHighlight style={data.style} onPress={copyToClipboard}>
            <View
                style={{
                    flex: 1,
                    flexDirection: 'row',
                    width: Dimensions.get('window').width,
                    height: 90,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                }}
            >
                <Text style={{ fontSize: 38, color: 'white' }}>
                    {otpData.otp}
                </Text>
                <Text style={{ fontSize: 38, color: 'white' }}>
                    {timeLeft}
                </Text>
            </View>
        </TouchableHighlight>
    );
}