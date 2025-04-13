import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Animated, StyleSheet, TextInput, View } from 'react-native';

interface SearchBarProps {
    // translateY: Animated.AnimatedInterpolation<string | number>;
    isVisible: boolean;
    text?: string;
    onSearch: (text: string) => void;
}

export function SearchBar({ text, isVisible = false, onSearch }: SearchBarProps) {
    if (!isVisible) return <View />

    return (
        <Animated.View
            style={[
                styles.container,
            ]}>
            <View style={styles.searchContainer}>
                <FontAwesome name='search' size={20} color="#666" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    value={text}
                    autoFocus={isVisible}
                    placeholder="Search..."
                    placeholderTextColor="#666"
                    onChangeText={onSearch}
                />
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'black',
        padding: 15,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        padding: 10,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
});