import { useTheme } from '@/context/ThemeContext';
import { Service } from '@/types';
import { resolveIcon } from '@/utils/customIconMatcher';
import { Image, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

interface ServiceIconProps {
    service: Service;
    size?: number;
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
}

/** A service's bundled icon, or its initials when it has none. */
export default function ServiceIcon({ service, size = 40, style, onPress }: ServiceIconProps) {
    const { theme } = useTheme();
    const icon = resolveIcon(service);
    const initials = String(service.otp?.issuer || service.name || 'OTP').substring(0, 2).toUpperCase();

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.iconBackground },
                style,
            ]}
            onPress={onPress}
            disabled={!onPress}
        >
            {icon ? (
                <Image source={icon} style={{ width: size * 0.6, height: size * 0.6 }} resizeMode="contain" />
            ) : (
                <Text style={[styles.initialsText, { fontSize: size * 0.4, color: theme.iconText }]}>
                    {initials}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialsText: {
        fontWeight: 'bold',
    },
});
