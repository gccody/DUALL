import { useTheme } from '@/context/ThemeContext';
import { Service } from '@/types';
import { getCustomIconSelection, getRemovedIcon } from '@/utils/IconManager';
import { getCustomIcon } from '@/utils/customIconMatcher';
import { customIcons } from '@/utils/customIcons';
import React, { useEffect, useState } from 'react';
import { Image, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import CustomIconPicker from './CustomIconPicker';

interface ServiceIconProps {
    service: Service;
    size?: number;
    style?: StyleProp<ViewStyle>;
    editable?: boolean;
}

export default function ServiceIcon({ service, size = 40, style, editable = false }: ServiceIconProps) {
    const { theme } = useTheme();
    const [customIcon, setCustomIcon] = useState<any>(null);
    const [faviconPath, setFaviconPath] = useState<string | null>(null);
    const [faviconExists, setFaviconExists] = useState(false);
    const [builtInIconData, setBuiltInIconData] = useState<{ iconId: string, categoryId: string } | null>(null);
    const [showFaviconPicker, setShowFaviconPicker] = useState(false);

    // Get first 2 letters of the issuer as fallback
    const initials = service.otp.issuer.substring(0, 2).toUpperCase();

    const loadIcons = async () => {
        // If the user explicitly removed the icon, force initials and skip all icon sources
        const removed = await getRemovedIcon(service.uid);
        if (removed) {
            setCustomIcon(null);
            setBuiltInIconData(null);
            setFaviconPath(null);
            setFaviconExists(false);
            return;
        }

        // Highest priority: Check for a manually selected custom icon
        const customSelection = await getCustomIconSelection(service.uid);
        if (customSelection) {
            const iconKey = `${customSelection.selectedDomain}.avif`;
            const iconSource = customIcons[iconKey];
            if (iconSource) {
                setCustomIcon(iconSource);
                setBuiltInIconData(null);
                setFaviconPath(null);
                setFaviconExists(false);
                return;
            }
        }

        // Second priority: Check for an automatically matched custom icon
        const customIconSource = getCustomIcon(service);
        if (customIconSource) {
            setCustomIcon(customIconSource);
            setBuiltInIconData(null);
            setFaviconPath(null);
            setFaviconExists(false);
            return;
        }
    };

    useEffect(() => {
        loadIcons();
    }, [service.uid]);

    const handlePress = () => {
        if (editable) {
            setShowFaviconPicker(true);
        }
    };

    const handleFaviconSelected = () => {
        loadIcons();
    };

    const renderContent = () => {
        // First priority: If we have a custom icon, display it
        if (customIcon) {
            return (
                <Image
                    source={customIcon}
                    style={{ width: size * 0.6, height: size * 0.6 }}
                    resizeMode="contain"
                />
            );
        }

        // Fallback to initials
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
                    onIconSelected={handleFaviconSelected}
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