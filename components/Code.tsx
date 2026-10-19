import { useSettings } from "@/context/SettingsContext";
import { useTheme } from "@/context/ThemeContext";
import { generateTotp, TotpCode } from "@/core/otp/totp";
import { getTotpParams } from "@/core/service";
import { Service } from "@/types";
import { formatOtp, maskOtp } from "@/utils/formatOtp";
import { getTimeRemaining } from "@/utils/time";
import { FontAwesome } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, StyleProp, StyleSheet, Text, TouchableHighlight, TouchableOpacity, View, ViewStyle } from "react-native";
import ProgressBar from "./ProgressBar";
import ServiceIcon from "./ServiceIcon";

interface CodeProps {
    service: Service;
    globalTimestamp: number;
    style?: StyleProp<ViewStyle>;
    onLongPress?: () => void;
    onIconPress?: () => void;
}

const PERCENTAGE_LEFT_REVEAL = 0.2;

export default function Code({ service, globalTimestamp, style, onLongPress, onIconPress }: CodeProps) {
    const { theme } = useTheme();
    const { settings } = useSettings();
    const [otpData, setOtpData] = useState<TotpCode>({ otp: '------', expires: Date.now() });
    const [nextOtpData, setNextOtpData] = useState<TotpCode>({ otp: '------', expires: Date.now() })
    const [isError, setIsError] = useState(false);
    const [hideToken, setHideToken] = useState(settings.hideTokens);

    // Animation values for the next token slide-in
    const slideAnim = useRef(new Animated.Value(-50)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    // Last state of showNextToken for animation trigger
    const lastShowNextTokenRef = useRef(false);

    // Update hideToken when settings change
    useEffect(() => {
        setHideToken(settings.hideTokens);
    }, [settings.hideTokens]);

    // Derive TOTP parameters from the account itself (getTotpParams normalizes
    // legacy stored data). Memoized on the values so codes only regenerate
    // after an edit.
    const { algorithm, digits, period } = getTotpParams(service);
    const totpOptions = useMemo(() => ({ algorithm, digits, period }), [algorithm, digits, period]);

    // Calculate the next token
    const calculateNextToken = useCallback((currentExpires: number) => {
        try {
            // Set the timestamp to just after the current token expires
            const nextTimestamp = currentExpires + 1;
            const nextOtp = generateTotp(service.secret, totpOptions, nextTimestamp);
            setNextOtpData(nextOtp);
        } catch (e) {
            console.error("Failed to generate next token:", e);
        }
    }, [service.secret, totpOptions]);

    const generateAndSetOTP = useCallback(() => {
        try {
            const newOtp = generateTotp(service.secret, totpOptions);
            setOtpData(newOtp);
            setIsError(false);

            // Calculate the next token whenever we generate a new one
            calculateNextToken(newOtp.expires);
        } catch (e) {
            console.error(e);
            setIsError(true);
            setOtpData({ otp: 'Error!', expires: Date.now() + totpOptions.period * 1000 });
        }
    }, [service.secret, totpOptions, calculateNextToken]);

    // Regenerate immediately when the secret or OTP options change (e.g. after an edit)
    useEffect(() => {
        generateAndSetOTP();
    }, [generateAndSetOTP]);

    // Refresh OTP when it expires
    useEffect(() => {
        if (globalTimestamp >= otpData.expires) {
            generateAndSetOTP();
        }
    }, [globalTimestamp, otpData.expires, generateAndSetOTP]);

    const { seconds: timeLeft, fraction: remainingPercentage } = getTimeRemaining(otpData.expires, globalTimestamp, totpOptions.period);
    const progressBarColor = remainingPercentage < PERCENTAGE_LEFT_REVEAL ? theme.dangerProgressBarFill : theme.progressBarFill;
    const showNextToken = settings.showNextToken && remainingPercentage < PERCENTAGE_LEFT_REVEAL && !isError && !hideToken;

    // Animate next token when it appears or disappears
    useEffect(() => {
        if (showNextToken && !lastShowNextTokenRef.current) {
            // Reset animation values when transitioning to visible
            slideAnim.setValue(-50);
            opacityAnim.setValue(0);

            // Run animations in parallel
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else if (!showNextToken && lastShowNextTokenRef.current) {
            // Animate out if needed
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -50,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }

        // Update ref for next check
        lastShowNextTokenRef.current = showNextToken;
    }, [showNextToken, slideAnim, opacityAnim]);

    // Format the OTP code with a space in the middle
    const formattedOTP = (code: string) => {
        if (hideToken) {
            return maskOtp(totpOptions.digits);
        }
        return formatOtp(code);
    };

    // Toggle visibility of token
    const toggleHideToken = () => {
        setHideToken(!hideToken);
    };

    const handleCopyToClipboard = async () => {
        // Dismiss keyboard if it's open to ensure the copy happens immediately
        // Keyboard.dismiss();

        // Copy code to clipboard
        await Clipboard.setStringAsync(otpData.otp);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Show notification if enabled
        if (settings.notifyWhenTokenCopied) {
            Alert.alert('Success', 'Code was copied to clipboard!');
        }
    };

    return (
        <TouchableHighlight
            style={[styles.buttonContainer, { backgroundColor: theme.cardBackground }, style]}
            onPress={handleCopyToClipboard}
            onLongPress={onLongPress}
            underlayColor={theme.border}
        >
            <View>
                <View style={styles.container}>
                    <View style={styles.otpInfo}>
                        <View style={styles.issuerContainer}>
                            <ServiceIcon
                                service={service}
                                size={32}
                                style={styles.serviceIcon}
                                onPress={onIconPress}
                            />
                            <View style={styles.issuerTextContainer}>
                                <Text style={[styles.issuerText, { color: theme.text }]}>
                                    {typeof service.otp?.issuer === 'string' ? service.otp.issuer : (service.name || 'Unknown')}
                                    {service.name && typeof service.otp?.issuer === 'string' && (
                                        <Text style={[styles.labelText, { color: theme.subText }]}>
                                            {' '}({service.name})
                                        </Text>
                                    )}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.codeContainer}>
                            <Text style={[styles.codeText, { color: theme.text }]}>
                                {formattedOTP(otpData.otp)}
                            </Text>
                            <TouchableOpacity
                                onPress={toggleHideToken}
                                style={styles.eyeButton}
                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            >
                                <FontAwesome
                                    name={hideToken ? "eye" : "eye-slash"}
                                    size={16}
                                    color={theme.subText}
                                />
                            </TouchableOpacity>
                            {(showNextToken && !hideToken) && (
                                <Animated.View
                                    style={[
                                        styles.nextTokenContainer,
                                        {
                                            opacity: opacityAnim,
                                            transform: [{ translateX: slideAnim }]
                                        }
                                    ]}
                                >
                                    <FontAwesome name="arrow-right" size={14} color={theme.accent} style={styles.nextTokenIcon} />
                                    <Text style={[styles.nextTokenText, { color: theme.accent }]}>
                                        {formattedOTP(nextOtpData.otp)}
                                    </Text>
                                </Animated.View>
                            )}
                        </View>
                    </View>
                    <View style={styles.timerContainer}>
                        <Text style={[styles.timerText, { color: theme.text }]}>{timeLeft}s</Text>
                    </View>
                </View>
                <ProgressBar
                    progress={remainingPercentage}
                    fillColor={progressBarColor}
                    backgroundColor={theme.progressBarBackground}
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
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    otpInfo: {
        flex: 1,
    },
    issuerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    serviceIcon: {
        marginRight: 8,
    },
    issuerTextContainer: {
        flex: 1,
    },
    issuerText: {
        fontSize: 16,
        fontWeight: '600',
    },
    labelText: {
        fontSize: 14,
        fontWeight: '400',
    },
    codeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    codeText: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 1,
        marginRight: 8,
    },
    eyeButton: {
        padding: 4,
    },
    nextTokenContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 5,
        // marginTop: 6,
    },
    nextTokenIcon: {
        marginRight: 6,
    },
    nextTokenText: {
        fontSize: 14,
        fontWeight: '500',
    },
    timerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16,
    },
    timerText: {
        fontSize: 16,
        fontWeight: '600',
    },
    progressBar: {
        marginTop: 16,
    }
});