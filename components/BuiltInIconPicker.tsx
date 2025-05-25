import { useTheme } from '@/context/ThemeContext';
import { Service } from '@/types';
import { BuiltInIcon, builtInIcons, getIconComponent, iconCategories } from '@/utils';
import { setBuiltInIcon } from '@/utils/IconManager';
import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BuiltInIconPickerProps {
    service: Service;
    isVisible: boolean;
    onClose: () => void;
    onIconSelected: () => void;
}

export default function BuiltInIconPicker({ service, isVisible, onClose, onIconSelected }: BuiltInIconPickerProps) {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(iconCategories[0].id);

    const handleSelectIcon = async (icon: BuiltInIcon, categoryId: string) => {
        setLoading(true);
        try {
            // Wait for the icon setting to complete before updating UI
            await setBuiltInIcon(service.uid, icon.id, categoryId);

            // Now call onIconSelected to update the UI with the new icon
            onIconSelected();
        } catch (error) {
            console.error('Error selecting built-in icon:', error);
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
                        <Text style={[styles.title, { color: theme.text }]}>Select Built-in Icon</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <FontAwesome name="times" size={20} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Categories */}
                    <View>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Categories</Text>
                        <FlatList
                            data={iconCategories}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.categoryButton,
                                        selectedCategory === item.id && {
                                            backgroundColor: theme.accent,
                                        }
                                    ]}
                                    onPress={() => setSelectedCategory(item.id)}
                                >
                                    <Text
                                        style={[
                                            styles.categoryText,
                                            selectedCategory === item.id
                                                ? { color: 'white' }
                                                : { color: theme.text }
                                        ]}
                                    >
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={styles.categoriesList}
                        />
                    </View>

                    {/* Icons grid */}
                    <View style={styles.iconsContainer}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Icons</Text>
                        {loading ? (
                            <ActivityIndicator size="large" color={theme.accent} style={styles.loading} />
                        ) : (
                            <FlatList
                                data={builtInIcons[selectedCategory]}
                                numColumns={4}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.iconButton,
                                            { backgroundColor: theme.cardBackground },
                                        ]}
                                        onPress={() => handleSelectIcon(item, selectedCategory)}
                                        activeOpacity={0.7}
                                        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                                    >
                                        <View style={styles.iconWrapper}>
                                            {getIconComponent(item, 28)}
                                        </View>
                                        <Text
                                            style={[styles.iconText, { color: theme.subText }]}
                                            numberOfLines={1}
                                        >
                                            {item.name}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                contentContainerStyle={styles.iconsGrid}
                            />
                        )}
                    </View>
                </View>
            </View>
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
        height: '80%',
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
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    categoriesList: {
        paddingVertical: 8,
    },
    categoryButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '500',
    },
    iconsContainer: {
        flex: 1,
    },
    iconsGrid: {
        paddingBottom: 20,
    },
    iconButton: {
        width: '25%',
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        height: 90,
        marginVertical: 4,
    },
    iconWrapper: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconText: {
        fontSize: 11,
        textAlign: 'center',
        width: '100%',
    },
    loading: {
        marginTop: 40,
    },
}); 