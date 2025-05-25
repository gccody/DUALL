import { useTheme } from '@/context/ThemeContext';
import { Service } from '@/types';
import { builtInIcons, getIconComponent } from '@/utils';
import { deleteBuiltInIcon, deleteFavicon, downloadFaviconFromWebsite, getBuiltInIconData, getFaviconData } from '@/utils/IconManager';
import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import BuiltInIconPicker from './BuiltInIconPicker';

// Local function to get domain from issuer
const getDomainFromIssuer = (issuer: string): string => {
    // Convert to lowercase and remove spaces
    const normalizedIssuer = issuer.toLowerCase().replace(/\s+/g, '');

    // Common domain mappings
    const domainMappings: Record<string, string> = {
        'google': 'google.com',
        'microsoft': 'microsoft.com',
        'github': 'github.com',
        'facebook': 'facebook.com',
        'twitter': 'twitter.com',
        'amazon': 'amazon.com',
        'apple': 'apple.com',
        'dropbox': 'dropbox.com',
        'slack': 'slack.com',
        'paypal': 'paypal.com',
        'instagram': 'instagram.com',
        'linkedin': 'linkedin.com',
        'netflix': 'netflix.com',
        'steam': 'steampowered.com',
        'yahoo': 'yahoo.com',
        'twitch': 'twitch.tv',
        'reddit': 'reddit.com',
    };

    // Check if issuer matches any known domain
    for (const [key, domain] of Object.entries(domainMappings)) {
        if (normalizedIssuer.includes(key)) {
            return domain;
        }
    }

    // Fallback: add .com to the issuer
    return `${normalizedIssuer}.com`;
};

// Local function to get favicon suggestions
const getFaviconSuggestions = (issuer: string): string[] => {
    const domain = getDomainFromIssuer(issuer);

    return [
        domain,
        `www.${domain}`,
        domain.replace('.com', '')
    ];
};

type IconTab = 'custom' | 'builtin';

interface FaviconPickerProps {
    service: Service;
    isVisible: boolean;
    onClose: () => void;
    onFaviconSelected: () => void;
}

export default function FaviconPicker({ service, isVisible, onClose, onFaviconSelected }: FaviconPickerProps) {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<IconTab>('custom');
    const [customUrl, setCustomUrl] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentFavicon, setCurrentFavicon] = useState<string | null>(null);
    const [hasBuiltInIcon, setHasBuiltInIcon] = useState(false);
    const [builtInIconData, setBuiltInIconData] = useState<{ iconId: string, categoryId: string } | null>(null);
    const [showBuiltInIconPicker, setShowBuiltInIconPicker] = useState(false);

    // Load suggestions and current favicon when modal opens
    useEffect(() => {
        if (isVisible) {
            // Get favicon suggestions based on issuer
            const faviconSuggestions = getFaviconSuggestions(service.otp.issuer);
            setSuggestions(faviconSuggestions);

            // Check if there's a current favicon or built-in icon
            const loadCurrentIcon = async () => {
                const faviconData = await getFaviconData(service.uid);
                const builtInIconData = await getBuiltInIconData(service.uid);

                if (faviconData) {
                    setCurrentFavicon(faviconData.localPath);
                    setHasBuiltInIcon(false);
                    setBuiltInIconData(null);
                    setActiveTab('custom');
                } else if (builtInIconData) {
                    setCurrentFavicon(null);
                    setHasBuiltInIcon(true);
                    setBuiltInIconData({
                        iconId: builtInIconData.iconId,
                        categoryId: builtInIconData.categoryId
                    });
                    setActiveTab('builtin');
                } else {
                    setCurrentFavicon(null);
                    setHasBuiltInIcon(false);
                    setBuiltInIconData(null);
                }
            };

            loadCurrentIcon();
        }
    }, [isVisible, service, showBuiltInIconPicker]);

    const handleDownloadFavicon = async (websiteUrl: string) => {
        setLoading(true);
        try {
            const result = await downloadFaviconFromWebsite(service.uid, service.otp.issuer, websiteUrl);
            if (result) {
                setCurrentFavicon(result.localPath);
                setHasBuiltInIcon(false);
                onFaviconSelected();
            }
        } catch (error) {
            console.error('Error downloading favicon:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFavicon = async () => {
        setLoading(true);
        try {
            await deleteFavicon(service.uid);
            setCurrentFavicon(null);
            onFaviconSelected();
        } catch (error) {
            console.error('Error removing favicon:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveBuiltInIcon = async () => {
        setLoading(true);
        try {
            await deleteBuiltInIcon(service.uid);
            setHasBuiltInIcon(false);
            onFaviconSelected();
        } catch (error) {
            console.error('Error removing built-in icon:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBuiltInIconSelected = async () => {
        setShowBuiltInIconPicker(false);
        setLoading(true);

        try {
            // Fetch the updated built-in icon data
            const iconData = await getBuiltInIconData(service.uid);

            if (iconData) {
                setHasBuiltInIcon(true);
                setBuiltInIconData({
                    iconId: iconData.iconId,
                    categoryId: iconData.categoryId
                });
                setCurrentFavicon(null);
            }

            onFaviconSelected();
        } catch (error) {
            console.error('Error loading updated icon data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]}>Choose Icon</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <FontAwesome name="times" size={20} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Tab switcher */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'custom' && {
                                    borderBottomColor: theme.accent,
                                    borderBottomWidth: 2
                                }
                            ]}
                            onPress={() => setActiveTab('custom')}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    { color: activeTab === 'custom' ? theme.accent : theme.subText }
                                ]}
                            >
                                Custom Favicon
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'builtin' && {
                                    borderBottomColor: theme.accent,
                                    borderBottomWidth: 2
                                }
                            ]}
                            onPress={() => setActiveTab('builtin')}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    { color: activeTab === 'builtin' ? theme.accent : theme.subText }
                                ]}
                            >
                                Built-in Icons
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'custom' ? (
                        <>
                            {/* Current favicon */}
                            {currentFavicon && (
                                <View style={styles.currentFaviconContainer}>
                                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Current Favicon</Text>
                                    <View style={styles.currentFavicon}>
                                        <Image
                                            source={{ uri: currentFavicon }}
                                            style={styles.faviconImage}
                                            resizeMode="contain"
                                        />
                                        <TouchableOpacity
                                            onPress={handleRemoveFavicon}
                                            style={[styles.removeButton, { backgroundColor: theme.dangerProgressBarFill }]}
                                        >
                                            <Text style={styles.removeButtonText}>Remove</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Website URL input */}
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Enter Website</Text>
                            <View style={styles.customUrlContainer}>
                                <TextInput
                                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                                    value={customUrl}
                                    onChangeText={setCustomUrl}
                                    placeholder="Enter website URL (e.g. google.com)"
                                    placeholderTextColor={theme.subText}
                                />
                                <TouchableOpacity
                                    style={[styles.button, { backgroundColor: theme.accent }]}
                                    onPress={() => handleDownloadFavicon(customUrl)}
                                    disabled={!customUrl || loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.buttonText}>Use</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Suggestions */}
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Suggestions</Text>
                            <FlatList
                                data={suggestions}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.suggestionItem}
                                        onPress={() => handleDownloadFavicon(item)}
                                        disabled={loading}
                                    >
                                        <Text
                                            style={[styles.suggestionText, { color: theme.accent }]}
                                        >
                                            {item}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </>
                    ) : (
                        <>
                            {/* Built-in icon section */}
                            {hasBuiltInIcon && builtInIconData ? (
                                <View style={styles.currentFaviconContainer}>
                                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Current Built-in Icon</Text>
                                    <View style={styles.currentBuiltInIcon}>
                                        {builtInIconData && (
                                            <View style={styles.currentIconWrapper}>
                                                {(() => {
                                                    const category = builtInIconData.categoryId;
                                                    const iconId = builtInIconData.iconId;

                                                    // Check if category exists
                                                    if (!builtInIcons[category]) {
                                                        return getIconComponent(builtInIcons.general[0], 40);
                                                    }

                                                    // Find the icon in the category
                                                    const icon = builtInIcons[category].find(i => i.id === iconId);
                                                    if (!icon) {
                                                        return getIconComponent(builtInIcons.general[0], 40);
                                                    }

                                                    return getIconComponent(icon, 40);
                                                })()}
                                                <Text style={[styles.currentIconText, { color: theme.text }]}>
                                                    {(() => {
                                                        const category = builtInIconData.categoryId;
                                                        const iconId = builtInIconData.iconId;

                                                        // Check if category exists
                                                        if (!builtInIcons[category]) {
                                                            return 'Unknown Icon';
                                                        }

                                                        // Find the icon in the category
                                                        const icon = builtInIcons[category].find(i => i.id === iconId);
                                                        return icon?.name || 'Unknown Icon';
                                                    })()}
                                                </Text>
                                            </View>
                                        )}
                                        <TouchableOpacity
                                            onPress={handleRemoveBuiltInIcon}
                                            style={[styles.removeButton, { backgroundColor: theme.dangerProgressBarFill }]}
                                        >
                                            <Text style={styles.removeButtonText}>Remove</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : null}

                            <TouchableOpacity
                                style={[styles.chooseIconButton, { backgroundColor: theme.accent }]}
                                onPress={() => setShowBuiltInIconPicker(true)}
                            >
                                <Text style={styles.chooseIconButtonText}>
                                    {hasBuiltInIcon ? 'Change Icon' : 'Choose Built-in Icon'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            <BuiltInIconPicker
                service={service}
                isVisible={showBuiltInIconPicker}
                onClose={() => setShowBuiltInIconPicker(false)}
                onIconSelected={handleBuiltInIconSelected}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxHeight: '80%',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 8,
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    currentFaviconContainer: {
        marginBottom: 16,
    },
    currentFavicon: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    faviconImage: {
        width: 40,
        height: 40,
    },
    removeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    removeButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    customUrlContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    input: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 12,
        marginRight: 8,
    },
    button: {
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 6,
    },
    buttonText: {
        color: 'white',
        fontWeight: '500',
    },
    suggestionItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    suggestionText: {
        fontSize: 14,
    },
    chooseIconButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 16,
    },
    chooseIconButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    currentBuiltInIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 8,
    },
    currentIconWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currentIconText: {
        marginLeft: 12,
        fontSize: 16,
        fontWeight: '500',
    },
}); 