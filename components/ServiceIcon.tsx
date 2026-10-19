import { useTheme } from '@/context/ThemeContext';
import { Service } from '@/types';
import { getCustomIcon, getIconSource } from '@/utils/customIconMatcher';
import React, { useMemo, useState } from 'react';
import { Image, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import CustomIconPicker from './CustomIconPicker';

interface ServiceIconProps {
    service: Service;
    size?: number;
    style?: StyleProp<ViewStyle>;
    /** Tapping opens the icon picker, which saves the choice to the vault */
    editable?: boolean;
}

function ServiceIcon({ service, size = 40, style, editable = false }: ServiceIconProps) {
    const { theme } = useTheme();
    const [showFaviconPicker, setShowFaviconPicker] = useState(false);

    const issuerValue = service.otp?.issuer || service.name || 'OTP';
    const issuer = typeof issuerValue === 'string' ? issuerValue : String(issuerValue);
    const initials = issuer.substring(0, 2).toUpperCase();

    const customIcon = useMemo(() => {
        // User explicitly removed the icon
        if (service.icon?.label === 'none') return null;

        // Explicit selection stored on the service (user-picked or auto-set at add time)
        if (service.icon?.label) {
            return getIconSource(service.icon.label);
        }

        // No icon set yet — try auto-match (backward compat for older services)
        return getCustomIcon(service);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [service.uid, service.icon?.label]);

    const handlePress = () => {
        if (editable) {
            setShowFaviconPicker(true);
        }
    };

    const renderContent = () => {
        if (customIcon) {
            return (
                <Image
                    source={customIcon}
                    style={{ width: size * 0.6, height: size * 0.6 }}
                    resizeMode="contain"
                />
            );
        }

        return (
            <Text style={[
                styles.initialsText,
                { fontSize: size * 0.4, color: theme.iconText }
            ]}>
                {initials}
            </Text>
        );
    };

    return (
        <>
            <TouchableOpacity
                style={[
                    styles.container,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: theme.iconBackground,
                    },
                    style
                ]}
                onPress={handlePress}
                delayLongPress={500}
            >
                {renderContent()}
            </TouchableOpacity>

            {editable && (
                <CustomIconPicker
                    service={service}
                    isVisible={showFaviconPicker}
                    onClose={() => setShowFaviconPicker(false)}
                />
            )}
        </>
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

// Custom comparator: re-render only when the visible state actually changes.
export default React.memo(ServiceIcon, (prev, next) =>
    prev.service.uid === next.service.uid &&
    prev.service.icon?.label === next.service.icon?.label &&
    prev.size === next.size &&
    prev.editable === next.editable
);
