import { useTheme } from '@/context/ThemeContext';
import { Service } from '@/types';
import { builtInIcons, getIconComponent } from '@/utils/IconLibrary';
import { getBuiltInIconData, getFaviconData } from '@/utils/IconManager';
import { getCustomIcon } from '@/utils/customIconMatcher';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import { Image, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import FaviconPicker from './FaviconPicker';

interface ServiceIconProps {
    service: Service;
    size?: number;
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
    editable?: boolean;
}

export default function ServiceIcon({ service, size = 40, style, onPress, editable = false }: ServiceIconProps) {
    const { theme } = useTheme();
    const [customIcon, setCustomIcon] = useState<any>(null);
    const [faviconPath, setFaviconPath] = useState<string | null>(null);
    const [faviconExists, setFaviconExists] = useState(false);
    const [builtInIconData, setBuiltInIconData] = useState<{ iconId: string, categoryId: string } | null>(null);
    const [showFaviconPicker, setShowFaviconPicker] = useState(false);

    // Get first 2 letters of the issuer as fallback
    const initials = service.otp.issuer.substring(0, 2).toUpperCase();

    const loadIcons = async () => {
        // First priority: Check for custom PNG icons
        const customIconSource = getCustomIcon(service);
        if (customIconSource) {
            setCustomIcon(customIconSource);
            setBuiltInIconData(null);
            setFaviconPath(null);
            setFaviconExists(false);
            return;
        }

        // Second priority: Check if a built-in icon is set for this service
        const iconData = await getBuiltInIconData(service.uid);

        if (iconData) {
            setBuiltInIconData({
                iconId: iconData.iconId,
                categoryId: iconData.categoryId
            });
            setCustomIcon(null);
            setFaviconPath(null);
            setFaviconExists(false);
            return;
        }

        // Third priority: Check if a favicon exists for this service
        const faviconData = await getFaviconData(service.uid);

        if (faviconData) {
            setFaviconPath(faviconData.localPath);
            setBuiltInIconData(null);
            setCustomIcon(null);

            // Verify the file exists
            try {
                const fileInfo = await FileSystem.getInfoAsync(faviconData.localPath);
                setFaviconExists(fileInfo.exists);
            } catch (error) {
                console.error('Error checking favicon file:', error);
                setFaviconExists(false);
            }
        } else {
            setFaviconPath(null);
            setFaviconExists(false);
            setBuiltInIconData(null);
            setCustomIcon(null);
        }
    };

    useEffect(() => {
        loadIcons();
    }, [service.uid]);

    const handleLongPress = () => {
        if (editable) {
            setShowFaviconPicker(true);
        }
    };

    const handleFaviconSelected = () => {
        loadIcons();
    };

    const renderContent = () => {
        // First priority: If we have a custom PNG icon, display it
        if (customIcon) {
            return (
                <Image
                    source={customIcon}
                    style={{ width: size * 0.6, height: size * 0.6 }}
                    resizeMode="contain"
                />
            );
        }

        // Second priority: If we have a built-in icon, display it
        if (builtInIconData) {
            const category = builtInIconData.categoryId;
            const iconList = builtInIcons[category];
            const icon = iconList?.find(i => i.id === builtInIconData.iconId);

            if (icon) {
                return getIconComponent(icon, size * 0.6);
            }
        }

        // Third priority: If we have a favicon, display it
        if (faviconPath && faviconExists) {
            return (
                <Image
                    source={{ uri: faviconPath }}
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
                onPress={onPress}
                // onLongPress={handleLongPress}
                delayLongPress={500}
            >
                {renderContent()}
            </TouchableOpacity>

            {editable && (
                <FaviconPicker
                    service={service}
                    isVisible={showFaviconPicker}
                    onClose={() => setShowFaviconPicker(false)}
                    onFaviconSelected={handleFaviconSelected}
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