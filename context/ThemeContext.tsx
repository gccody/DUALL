import { useSettings } from '@/context/SettingsContext';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { ColorSchemeName } from 'react-native';

// Define theme colors
export const lightTheme = {
    background: '#FFFFFF',
    cardBackground: '#F8F8F8',
    text: '#000000',
    subText: '#666666',
    accent: '#6C63FF',
    progressBarBackground: '#E0E0E0',
    progressBarFill: '#4CAF50',
    dangerProgressBarFill: '#F44336',
    border: '#E0E0E0',
    tabBarBackground: '#FFFFFF',
    tabBarActive: '#6C63FF',
    tabBarInactive: '#8E8E93',
    searchBackground: '#F0F0F0',
    iconBackground: '#E9E7FF',
    iconText: '#6C63FF',
};

export const darkTheme = {
    background: '#121212',
    cardBackground: '#1E1E1E',
    text: '#FFFFFF',
    subText: '#AAAAAA',
    accent: '#6C63FF',
    progressBarBackground: '#333333',
    progressBarFill: '#4CAF50',
    dangerProgressBarFill: '#F44336',
    border: '#333333',
    tabBarBackground: '#1E1E1E',
    tabBarActive: '#6C63FF',
    tabBarInactive: '#8E8E93',
    searchBackground: '#333333',
    iconBackground: '#4b4597ff',
    iconText: '#A9A5FF',
};

// Type for theme
export type ThemeType = typeof darkTheme;

// Context type
type ThemeContextType = {
    theme: ThemeType;
    colorScheme: ColorSchemeName;
    toggleTheme: () => void;
    isDark: boolean;
};

// Create context
export const ThemeContext = createContext<ThemeContextType>({
    theme: darkTheme,
    colorScheme: 'dark',
    toggleTheme: () => { },
    isDark: true,
});

// Theme provider
export function ThemeProvider({ children }: { children: ReactNode }) {
    // Get settings from context
    const { settings, updateSetting, isLoading } = useSettings();

    // Set color scheme based on settings
    const [colorScheme, setColorScheme] = useState<ColorSchemeName>(
        settings.darkMode ? 'dark' : 'light'
    );

    const isDark = colorScheme === 'dark';
    const theme = isDark ? darkTheme : lightTheme;

    // Update color scheme when settings change
    useEffect(() => {
        setColorScheme(settings.darkMode ? 'dark' : 'light');
    }, [settings.darkMode]);

    // Toggle theme function
    const toggleTheme = async () => {
        const newIsDark = !isDark;
        setColorScheme(newIsDark ? 'dark' : 'light');
        await updateSetting('darkMode', newIsDark);
    };

    if (isLoading) {
        return null; // Or a loading indicator if you prefer
    }

    return (
        <ThemeContext.Provider value={{ theme, colorScheme, toggleTheme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
}

// Hook to use theme
export function useTheme() {
    return useContext(ThemeContext);
} 