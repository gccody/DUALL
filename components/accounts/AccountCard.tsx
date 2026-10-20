import ProgressBar from "@/components/ui/ProgressBar";
import { useSettings } from "@/context/SettingsContext";
import { useTheme } from "@/context/ThemeContext";
import { useTotp } from "@/hooks/useTotp";
import { Service } from "@/types";
import { formatOtp, maskOtp } from "@/utils/formatOtp";
import { FontAwesome } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from "react";
import { Alert, StyleProp, StyleSheet, Text, TouchableHighlight, TouchableOpacity, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
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

/** Below this fraction of the period left, the bar turns red and the next code is previewed. */
const PERCENTAGE_LEFT_REVEAL = 0.2;

/** An account's live code: tap to copy, eye to hide, countdown and next-code preview. */
export default function AccountCard({ service, now, highlighted = false, style, onLongPress, onIconPress }: AccountCardProps) {
    const { theme } = useTheme();
    const { settings } = useSettings();
    const { code, nextCode, digits, secondsLeft, fraction, error } = useTotp(service, now);

    // The eye button overrides the "Hide Tokens" setting for this account until
    // the setting changes. Keyed by uid, as the list recycles cards.
    const [hideOverride, setHideOverride] = useState<{ uid: string; setting: boolean; hidden: boolean } | null>(null);
    const hideToken = hideOverride?.uid === service.uid && hideOverride.setting === settings.hideTokens
        ? hideOverride.hidden
        : settings.hideTokens;
    const toggleHideToken = () => {
        setHideOverride({ uid: service.uid, setting: settings.hideTokens, hidden: !hideToken });
    };

    const isEnding = fraction < PERCENTAGE_LEFT_REVEAL;
    const showNextToken = settings.showNextToken && isEnding && !error && !hideToken;
    const displayCode = (value: string) => (hideToken ? maskOtp(digits) : formatOtp(value));

    // An empty issuer falls back to the name; the name is only appended when both are set.
    const issuer = service.otp?.issuer;
    const title = issuer || service.name || 'Unknown';
    const showName = !!issuer && !!service.name;

    const handleCopyToClipboard = async () => {
        await Clipboard.setStringAsync(code);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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
                                    {title}
                                    {showName && (
                                        <Text style={[styles.labelText, { color: theme.subText }]}>
                                            {' '}({service.name})
                                        </Text>
                                    )}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.codeContainer}>
                            <Text style={[styles.codeText, { color: theme.text }]}>
                                {displayCode(code)}
                            </Text>
                            <TouchableOpacity
                                onPress={toggleHideToken}
                                style={styles.eyeButton}
                                hitSlop={15}
                            >
                                <FontAwesome
                                    name={hideToken ? "eye" : "eye-slash"}
                                    size={16}
                                    color={theme.subText}
                                />
                            </TouchableOpacity>
                            {showNextToken && <NextCode code={displayCode(nextCode)} color={theme.accent} />}
                        </View>
                    </View>
                    <View style={styles.timerContainer}>
                        <Text style={[styles.timerText, { color: theme.text }]}>{secondsLeft}s</Text>
                    </View>
                </View>
                <ProgressBar
                    progress={fraction}
                    fillColor={isEnding ? theme.dangerProgressBarFill : theme.progressBarFill}
                    trackColor={theme.progressBarBackground}
                    borderRadius={2}
                    height={5}
                    style={styles.progressBar}
                />
            </View>
        </TouchableHighlight>
    );
}

/** The upcoming code, sliding in from the left when it appears. */
function NextCode({ code, color }: { code: string; color: string }) {
    const reveal = useSharedValue(0);

    useEffect(() => {
        reveal.set(withTiming(1, { duration: 300 }));
    }, [reveal]);

    const revealStyle = useAnimatedStyle(() => ({
        opacity: reveal.get(),
        transform: [{ translateX: (reveal.get() - 1) * 50 }],
    }));

    return (
        <Animated.View style={[styles.nextTokenContainer, revealStyle]}>
            <FontAwesome name="arrow-right" size={14} color={color} style={styles.nextTokenIcon} />
            <Text style={[styles.nextTokenText, { color }]}>{code}</Text>
        </Animated.View>
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
    },
});
