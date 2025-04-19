import { useTheme } from '@/context/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SearchBarProps {
    isVisible: boolean;
    text: string;
    onSearch: (text: string) => void;
}

export function SearchBar({ isVisible, text, onSearch }: SearchBarProps) {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const [value, setValue] = useState(text);
    const translateAnim = useRef(new Animated.Value(isVisible ? 0 : -100)).current;
    const opacityAnim = useRef(new Animated.Value(isVisible ? 1 : 0)).current;
    const inputRef = useRef<TextInput>(null);
    const prevVisibleRef = useRef<boolean>(isVisible);
    const initialMountRef = useRef<boolean>(true);

    // Focus input on initial mount if isVisible is true
    useEffect(() => {
        if (initialMountRef.current && isVisible) {
            // Small delay to ensure the component is fully rendered
            setTimeout(() => {
                inputRef.current?.focus();
            }, 300);
            initialMountRef.current = false;
        }
    }, []);

    // Update animation when isVisible changes
    useEffect(() => {
        // Run both animations in parallel
        Animated.parallel([
            Animated.timing(translateAnim, {
                toValue: isVisible ? 0 : -100,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: isVisible ? 1 : 0,
                duration: 250,
                useNativeDriver: true,
            })
        ]).start();

        // Focus the input when search bar becomes visible
        if (isVisible && !prevVisibleRef.current) {
            // Small delay to ensure the animation has started before focusing
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }

        // Update previous visibility state
        prevVisibleRef.current = isVisible;
    }, [isVisible, translateAnim, opacityAnim]);

    const handleTextChange = (newText: string) => {
        setValue(newText);
        onSearch(newText);
    };

    const clearSearch = () => {
        setValue('');
        onSearch('');
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY: translateAnim }],
                    opacity: opacityAnim,
                    backgroundColor: theme.searchBackground,
                    borderBottomColor: theme.border,
                    marginTop: insets.top > 0 ? insets.top : 8 // Add margin based on safe area
                }
            ]}
        >
            <View style={styles.searchBar}>
                <FontAwesome name="search" size={20} color={theme.subText} style={styles.searchIcon} />
                <TextInput
                    ref={inputRef}
                    style={[styles.input, { color: theme.text }]}
                    placeholderTextColor={theme.subText}
                    placeholder="Search accounts"
                    value={value}
                    onChangeText={handleTextChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {value.length > 0 && (
                    <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                        <FontAwesome name="times-circle" size={20} color={theme.subText} />
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        padding: 8,
        margin: 8,
        borderBottomWidth: 1,
        borderRadius: 20,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 12,
        height: 40,
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: 40,
        fontSize: 16,
    },
    clearButton: {
        padding: 8,
    },
});