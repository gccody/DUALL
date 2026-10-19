import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import type { Settings } from '@/types';
import { Switch } from 'react-native';
import SettingsRow, { type SettingsIconName } from './SettingsRow';

/** Keys of the on/off settings. */
export type ToggleSetting = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

interface SettingsSwitchProps {
  icon: SettingsIconName;
  label: string;
  setting: ToggleSetting;
}

/** A settings row with a switch bound to a boolean setting. */
export default function SettingsSwitch({ icon, label, setting }: SettingsSwitchProps) {
  const { theme } = useTheme();
  const { settings, updateSetting } = useSettings();

  return (
    <SettingsRow icon={icon} label={label}>
      <Switch
        value={settings[setting]}
        onValueChange={(value) => updateSetting(setting, value)}
        trackColor={{ true: theme.accent }}
        accessibilityLabel={label}
      />
    </SettingsRow>
  );
}
