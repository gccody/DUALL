import { useTheme } from '@/context/ThemeContext';
import { Service } from '@/types';
import { builtInIcons, getIconComponent } from '@/utils/IconLibrary';
import { getBuiltInIconData, getFaviconData } from '@/utils/IconManager';
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
    const [faviconPath, setFaviconPath] = useState<string | null>(null);
    const [faviconExists, setFaviconExists] = useState(false);
    const [builtInIconData, setBuiltInIconData] = useState<{ iconId: string, categoryId: string } | null>(null);
    const [showFaviconPicker, setShowFaviconPicker] = useState(false);

    // Get first 2 letters of the issuer as fallback
    const initials = service.otp.issuer.substring(0, 2).toUpperCase();

    const loadIcons = async () => {
        // Check if a built-in icon is set for this service
        const iconData = await getBuiltInIconData(service.uid);

        if (iconData) {
            setBuiltInIconData({
                iconId: iconData.iconId,
                categoryId: iconData.categoryId
            });
            setFaviconPath(null);
            setFaviconExists(false);
            return;
        }

        // Check if a favicon exists for this service
        const faviconData = await getFaviconData(service.uid);

        if (faviconData) {
            setFaviconPath(faviconData.localPath);
            setBuiltInIconData(null);

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
        // If we have a built-in icon, display it
        if (builtInIconData) {
            const category = builtInIconData.categoryId;
            const iconList = builtInIcons[category];
            const icon = iconList?.find(i => i.id === builtInIconData.iconId);

            if (icon) {
                return getIconComponent(icon, size * 0.6);
            }
        }

        // If we have a favicon, display it
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
                onLongPress={handleLongPress}
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