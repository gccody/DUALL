import { useSettings } from "@/context/SettingsContext";
import { useTheme } from "@/context/ThemeContext";
import { useTotp } from "@/hooks/useTotp";
import { Service } from "@/types";
import { formatOtp, maskOtp } from "@/utils/formatOtp";
import { FontAwesome } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, StyleProp, StyleSheet, Text, TouchableHighlight, TouchableOpacity, View, ViewStyle } from "react-native";
import ProgressBar from "../ProgressBar";
import ServiceIcon from "./ServiceIcon";

interface AccountCardProps {
    service: Service;
    /** Current time (epoch ms), ticking so the code and countdown stay live */
    now: number;
    /** Outline the card, e.g. for a just-added account */
    highlighted?: boolean;
    style?: StyleProp<ViewStyle>;
    onLongPress?: () => void;
    onIconPress?: () => void;
}

const PERCENTAGE_LEFT_REVEAL = 0.2;

/** An account's live code: tap to copy, eye to hide, countdown and next-code preview. */
export default function AccountCard({ service, now, highlighted = false, style, onLongPress, onIconPress }: AccountCardProps) {
    const { theme } = useTheme();
    const { settings } = useSettings();
    const { code, nextCode, digits, secondsLeft: timeLeft, fraction: remainingPercentage, error: isError } = useTotp(service, now);
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
            return maskOtp(digits);
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
        await Clipboard.setStringAsync(code);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Show notification if enabled
        if (settings.notifyWhenTokenCopied) {
            Alert.alert('Success', 'Code was copied to clipboard!');
        }
    };

    return (
        <TouchableHighlight
            style={[
                styles.buttonContainer,
                { backgroundColor: theme.cardBackground },
                highlighted && { borderColor: theme.accent, borderWidth: 2 },
                style,
            ]}
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
                                {formattedOTP(code)}
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
                                        {formattedOTP(nextCode)}
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