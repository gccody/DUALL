import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCustomIcon } from './customIconMatcher';

const CUSTOM_ICON_KEY = 'customIconRegistry';

// Interface for custom icon data
export interface CustomIconData {
  serviceUid: string;
  domain: string;
  iconPath: string;
  available: boolean;
}

// Interface for custom  icon selection (user override)
export interface CustomIconSelection {
  serviceUid: string;
  selectedDomain: string; // The domain/filename selected by user
  timestamp: number;
}

// Interface for custom  icon registry (user selections)
interface CustomIconRegistry {
  [serviceUid: string]: CustomIconSelection;
}

// Get the custom  icon registry from storage
export const getCustomIconRegistry = async (): Promise<CustomIconRegistry> => {
  try {
    const registry = await AsyncStorage.getItem(CUSTOM_ICON_KEY);
    return registry ? JSON.parse(registry) : {};
  } catch (error) {
    console.error('Failed to get custom  icon registry:', error);
    return {};
  }
};

// Save the custom  icon registry to storage
export const saveCustomIconRegistry = async (registry: CustomIconRegistry): Promise<void> => {
  try {
    await AsyncStorage.setItem(CUSTOM_ICON_KEY, JSON.stringify(registry));
  } catch (error) {
    console.error('Failed to save custom  icon registry:', error);
    throw error;
  }
};

// Set a custom  icon selection for a service (user override)
export const setCustomIconSelection = async (
  serviceUid: string,
  selectedDomain: string
): Promise<CustomIconSelection> => {
  try {
    // Create custom  icon selection data
    const selectionData: CustomIconSelection = {
      serviceUid,
      selectedDomain,
      timestamp: Date.now()
    };
    
    // Update registry
    const registry = await getCustomIconRegistry();
    registry[serviceUid] = selectionData;
    await saveCustomIconRegistry(registry);
    
    return selectionData;
  } catch (error) {
    console.error('Error setting custom  icon selection:', error);
    throw error;
  }
};

// Get custom  icon selection for a service (user override)
export const getCustomIconSelection = async (serviceUid: string): Promise<CustomIconSelection | null> => {
  try {
    const registry = await getCustomIconRegistry();
    return registry[serviceUid] || null;
  } catch (error) {
    console.error('Failed to get custom  icon selection:', error);
    return null;
  }
};

// Delete a custom  icon selection
export const deleteCustomIconSelection = async (serviceUid: string): Promise<boolean> => {
  try {
    const registry = await getCustomIconRegistry();
    
    if (!registry[serviceUid]) return false;
    
    // Update registry
    delete registry[serviceUid];
    await saveCustomIconRegistry(registry);
    
    return true;
  } catch (error) {
    console.error('Failed to delete custom  icon selection:', error);
    return false;
  }
};

// Check if a service has a custom  icon available (automatic or manual)
export const hasCustomIcon = async (serviceUid: string, issuer: string): Promise<boolean> => {
  try {
    // First check for manual selection
    const manualSelection = await getCustomIconSelection(serviceUid);
    if (manualSelection) {
      return true;
    }
    
    // Then check for automatic matching
    const customIcon = getCustomIcon({ uid: serviceUid, otp: { issuer } } as any);
    return !!customIcon;
  } catch (error) {
    console.error('Error checking for custom  icon:', error);
    return false;
  }
};

// Get custom  icon data for a service (manual selection takes priority)
export const getCustomIconData = async (serviceUid: string, issuer: string): Promise<CustomIconData | null> => {
  try {
    // First check for manual selection
    const manualSelection = await getCustomIconSelection(serviceUid);
    if (manualSelection) {
      // Import the manually selected icon
      const { customIcons } = await import('./customIcons');
      const iconKey = `${manualSelection.selectedDomain}.avif`;
      const customIcon = customIcons[iconKey];
      
      if (customIcon) {
        return {
          serviceUid,
          domain: manualSelection.selectedDomain,
          iconPath: customIcon.toString(),
          available: true
        };
      }
    }
    
    // Fallback to automatic matching
    const customIcon = getCustomIcon({ uid: serviceUid, otp: { issuer } } as any);
    
    if (customIcon) {
      return {
        serviceUid,
        domain: issuer, // This will be processed by the custom icon matcher
        iconPath: customIcon.toString(), // React Native asset reference
        available: true
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting custom  icon data:', error);
    return null;
  }
};