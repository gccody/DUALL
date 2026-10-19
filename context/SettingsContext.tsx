import { ensureMigrated } from '@/storage/migrations';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/storage/settings';
import { Settings } from '@/types';
import { ReactNode, createContext, use, useCallback, useEffect, useRef, useState } from 'react';

type SettingsContextType = {
    settings: Settings;
    isLoading: boolean;
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
};

export const SettingsContext = createContext<SettingsContextType>({
    settings: DEFAULT_SETTINGS,
    isLoading: true,
    updateSetting: async () => { },
});

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
    // Saves run one after another so a slow write can't overwrite a newer one.
    const saveQueue = useRef<Promise<void>>(Promise.resolve());

    const apply = useCallback((next: Settings) => {
        settingsRef.current = next;
        setSettings(next);
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await ensureMigrated();
            } catch (error) {
                // Settings still load; the vault reports the failure.
                console.error('SettingsContext: migration failed:', error);
            }
            try {
                const stored = await loadSettings();
                if (!cancelled) apply(stored);
            } catch (error) {
                console.error('SettingsContext: Failed to load settings:', error);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [apply]);

    const updateSetting = useCallback(async <K extends keyof Settings>(key: K, value: Settings[K]) => {
        const next = { ...settingsRef.current, [key]: value };
        apply(next);
        const save = saveQueue.current.then(() => saveSettings(next));
        saveQueue.current = save.catch(() => undefined);
        try {
            await save;
        } catch (error) {
            console.error(`Failed to update ${String(key)} setting:`, error);
            apply(await loadSettings().catch(() => settingsRef.current));
        }
    }, [apply]);

    return (
        <SettingsContext value={{ settings, isLoading, updateSetting }}>
            {children}
        </SettingsContext>
    );
}

export function useSettings() {
    return use(SettingsContext);
}
