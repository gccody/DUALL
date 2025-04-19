import { Settings } from '@/types';
import { FileHandler } from '@/utils/fileHandler';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

// Default settings
const defaultSettings: Settings = {
    darkMode: true,
    searchOnStartup: false,
    hideTokens: false,
    showNextToken: false,
    notifyWhenTokenCopied: true,
};

// Context type
type SettingsContextType = {
    settings: Settings;
    isLoading: boolean;
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
};

// Create context
export const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    isLoading: true,
    updateSetting: async () => { },
});

// Settings provider
export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await FileHandler.loadData();
                setSettings(data.settings);
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    // Update a single setting
    const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
        try {
            // Update local state immediately for responsive UI
            const updatedSettings = { ...settings, [key]: value };
            setSettings(updatedSettings);

            // Save to storage
            await FileHandler.updateSettings(updatedSettings);
        } catch (error) {
            console.error(`Failed to update ${String(key)} setting:`, error);
            // Revert to previous state if save fails
            const data = await FileHandler.loadData();
            setSettings(data.settings);
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, isLoading, updateSetting }}>
            {children}
        </SettingsContext.Provider>
    );
}

// Hook to use settings
export function useSettings() {
    return useContext(SettingsContext);
} 