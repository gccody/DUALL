import { TOTP } from "@/TOTP";
import { TOTPOptions, TOTPResult } from "@/types";
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, AppStateStatus, StyleProp, Text, TouchableHighlight, View, ViewStyle } from "react-native";

interface CodeProps {
    secret: string;
    opts?: TOTPOptions;
    group?: string;
    account?: string;
    encoding?: TOTPOptions['encoding'];
    timestamp?: TOTPOptions['timestamp'];
    style?: StyleProp<ViewStyle>;
}

export default function Code(data: CodeProps) {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isError, setIsError] = useState<boolean>(false);
    const [otpData, setOtpData] = useState<TOTPResult>({ otp: '------', expires: Date.now() });

    // ref to track the current app state
    const appState = useRef(AppState.currentState);
    // ref to store our animation frame id for cleanup
    const frameRef = useRef<number | null>(null);

    // Create a constant TOTP options object
    const totpOptions = useRef<Required<Pick<TOTPOptions, 'digits' | 'period' | 'algorithm'>>>({
        digits: data.opts?.digits ?? 6,
        period: data.opts?.period ?? 30,
        algorithm: data.opts?.algorithm ?? 'SHA-1',
    }).current;

    const [timeLeft, setTimeLeft] = useState(totpOptions.period);

    // Generate the OTP and update state
    const generateAndSetOTP = useCallback(async () => {
        try {
            setIsError(false);
            const newOtpData = TOTP.generate(data.secret, {
                digits: totpOptions.digits,
                period: totpOptions.period,
                algorithm: totpOptions.algorithm
            });
            setOtpData(newOtpData);
            return newOtpData;
        } catch (error) {
            console.error("Failed to generate TOTP:", error);
            setIsError(true);
            // Provide fallback OTP and expiry in error state
            setOtpData({ otp: 'Error!', expires: Date.now() + totpOptions.period });
            setTimeLeft(0);
            return null;
        } finally {
            if (isLoading) {
                setIsLoading(false);
            }
        }
    }, [data.secret, totpOptions, isLoading]);

    // Copy OTP to clipboard
    const copyToClipboard = async () => {
        await Clipboard.setStringAsync(otpData.otp);
        Alert.alert('Success', 'Code was copied to clipboard!');
    };

    // Listen to app state changes to handle foreground/background transitions
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            // Record the updated app state
            appState.current = nextAppState;
            // If coming back to active, force an immediate tick to recalc the remaining time.
            if (nextAppState === 'active') {
                tick();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription.remove();
        };
        // No dependencies needed here because the callback uses refs (which persist).
    }, []);

    // The ticker function – it calculates the current time left based on expires.
    // If the OTP has expired, it triggers a new OTP generation.
    const tick = () => {
        // Only process ticks if the app is active.
        if (appState.current !== 'active') {
            return;
        }

        const now = Date.now();
        const diff = otpData.expires - now;

        if (diff <= 0) {
            // When expired, generate a new OTP.
            generateAndSetOTP();
        } else {
            // Update time left (in full seconds)
            setTimeLeft(Math.floor(diff / 1000));
        }
    };

    // Create an animation frame loop to update the countdown every frame.
    useEffect(() => {
        // Define the function that will keep scheduling itself
        const tickLoop = () => {
            tick();
            frameRef.current = requestAnimationFrame(tickLoop);
        };

        // Start the loop only if the app state is active
        if (appState.current === 'active') {
            frameRef.current = requestAnimationFrame(tickLoop);
        }

        // Clean up by canceling the animation frame
        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        };
    }, [otpData.expires, generateAndSetOTP]);

    const textColor = isError ? 'red' : 'white';

    return (
        <TouchableHighlight style={data.style} onPress={copyToClipboard}>
            <View
                style={{
                    flex: 1,
                    flexDirection: 'row',
                    width: '100%',
                    height: 90,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                }}
            >
                <Text style={{ fontSize: 38, color: textColor }}>
                    {otpData.otp}
                </Text>
                <Text style={{ fontSize: 38, color: 'white' }}>
                    {timeLeft}
                </Text>
            </View>
        </TouchableHighlight>
    );
}
