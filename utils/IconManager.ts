import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import { getCustomIcon } from './customIconMatcher';

// Keys for local storage
const FAVICON_STORAGE_KEY = 'faviconRegistry';
const BUILT_IN_ICON_KEY = 'builtInIconRegistry';
const CUSTOM_PNG_ICON_KEY = 'customPngIconRegistry';
const REMOVED_ICON_KEY = 'removedIconRegistry';
const FAVICON_DIR = `${FileSystem.cacheDirectory}favicons/`;

// Interface for favicon data
export interface FaviconData {
  issuer: string;
  serviceUid: string;
  url: string;
  localPath: string;
  timestamp: number;
}

// Interface for built-in icon data
export interface BuiltInIconData {
  serviceUid: string;
  iconId: string;
  categoryId: string;
  timestamp: number;
}

// Interface for custom PNG icon data
export interface CustomPngIconData {
  serviceUid: string;
  domain: string;
  iconPath: string;
  available: boolean;
}

// Interface for custom PNG icon selection (user override)
export interface CustomPngIconSelection {
  serviceUid: string;
  selectedDomain: string; // The domain/filename selected by user
  timestamp: number;
}

// Interface for favicon registry
interface FaviconRegistry {
  [serviceUid: string]: FaviconData;
}

// Interface for built-in icon registry
interface BuiltInIconRegistry {
  [serviceUid: string]: BuiltInIconData;
}

// Interface for custom PNG icon registry (user selections)
interface CustomPngIconRegistry {
  [serviceUid: string]: CustomPngIconSelection;
}

// Interface for removed icon registry
interface RemovedIconRegistry {
    [serviceUid: string]: boolean;
}

// Ensure the favicon directory exists
const ensureFaviconDirectory = async (): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(FAVICON_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(FAVICON_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('Failed to create favicon directory:', error);
    throw error;
  }
};

// Get the favicon registry from storage
export const getFaviconRegistry = async (): Promise<FaviconRegistry> => {
  try {
    const registry = await AsyncStorage.getItem(FAVICON_STORAGE_KEY);
    return registry ? JSON.parse(registry) : {};
  } catch (error) {
    console.error('Failed to get favicon registry:', error);
    return {};
  }
};

// Save the favicon registry to storage
export const saveFaviconRegistry = async (registry: FaviconRegistry): Promise<void> => {
  try {
    await AsyncStorage.setItem(FAVICON_STORAGE_KEY, JSON.stringify(registry));
  } catch (error) {
    console.error('Failed to save favicon registry:', error);
    throw error;
  }
};

// Get the built-in icon registry from storage
export const getBuiltInIconRegistry = async (): Promise<BuiltInIconRegistry> => {
  try {
    const registry = await AsyncStorage.getItem(BUILT_IN_ICON_KEY);
    return registry ? JSON.parse(registry) : {};
  } catch (error) {
    console.error('Failed to get built-in icon registry:', error);
    return {};
  }
};

// Save the built-in icon registry to storage
export const saveBuiltInIconRegistry = async (registry: BuiltInIconRegistry): Promise<void> => {
  try {
    await AsyncStorage.setItem(BUILT_IN_ICON_KEY, JSON.stringify(registry));
  } catch (error) {
    console.error('Failed to save built-in icon registry:', error);
    throw error;
  }
};

// Get the custom PNG icon registry from storage
export const getCustomPngIconRegistry = async (): Promise<CustomPngIconRegistry> => {
  try {
    const registry = await AsyncStorage.getItem(CUSTOM_PNG_ICON_KEY);
    return registry ? JSON.parse(registry) : {};
  } catch (error) {
    console.error('Failed to get custom PNG icon registry:', error);
    return {};
  }
};

// Save the custom PNG icon registry to storage
export const saveCustomPngIconRegistry = async (registry: CustomPngIconRegistry): Promise<void> => {
  try {
    await AsyncStorage.setItem(CUSTOM_PNG_ICON_KEY, JSON.stringify(registry));
  } catch (error) {
    console.error('Failed to save custom PNG icon registry:', error);
    throw error;
  }
};

// Get the removed icon registry from storage
export const getRemovedIconRegistry = async (): Promise<RemovedIconRegistry> => {
    try {
        const registry = await AsyncStorage.getItem(REMOVED_ICON_KEY);
        return registry ? JSON.parse(registry) : {};
    } catch (error) {
        console.error('Failed to get removed icon registry:', error);
        return {};
    }
}

// Save the removed icon registry to storage
export const saveRemovedIconRegistry = async (registry: RemovedIconRegistry): Promise<void> => {
    try {
        await AsyncStorage.setItem(REMOVED_ICON_KEY, JSON.stringify(registry));
    } catch (error) {
        console.error('Failed to save removed icon registry:', error);
        throw error;
    }
}

// Set a built-in icon for a service
export const setBuiltInIcon = async (
  serviceUid: string, 
  iconId: string, 
  categoryId: string
): Promise<BuiltInIconData> => {
  try {
    // Create built-in icon data
    const iconData: BuiltInIconData = {
      serviceUid,
      iconId,
      categoryId,
      timestamp: Date.now()
    };
    
    // Update registry
    const registry = await getBuiltInIconRegistry();
    registry[serviceUid] = iconData;
    await saveBuiltInIconRegistry(registry);
    
    // Remove any existing favicon for this service
    await deleteFavicon(serviceUid);
    
    return iconData;
  } catch (error) {
    console.error('Error setting built-in icon:', error);
    throw error;
  }
};

// Get built-in icon data for a service
export const getBuiltInIconData = async (serviceUid: string): Promise<BuiltInIconData | null> => {
  try {
    const registry = await getBuiltInIconRegistry();
    return registry[serviceUid] || null;
  } catch (error) {
    console.error('Failed to get built-in icon data:', error);
    return null;
  }
};

// Delete a built-in icon
export const deleteBuiltInIcon = async (serviceUid: string): Promise<boolean> => {
  try {
    const registry = await getBuiltInIconRegistry();
    
    if (!registry[serviceUid]) return false;
    
    // Update registry
    delete registry[serviceUid];
    await saveBuiltInIconRegistry(registry);
    
    return true;
  } catch (error) {
    console.error('Failed to delete built-in icon:', error);
    return false;
  }
};

// Download a favicon and save it locally
export const downloadFavicon = async (
  serviceUid: string,
  issuer: string,
  url: string
): Promise<FaviconData | null> => {
  try {
    await ensureFaviconDirectory();
    
    // Create a hash of the URL to use as the filename
    const urlHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      url
    );
    
    const fileExtension = url.split('.').pop()?.includes('?') 
      ? url.split('.').pop()?.split('?')[0] 
      : url.split('.').pop() || 'png';
    
    const filename = `${urlHash}.${fileExtension}`;
    const localPath = `${FAVICON_DIR}${filename}`;
    
    // Download the file
    const downloadResult = await FileSystem.downloadAsync(url, localPath);
    
    if (downloadResult.status !== 200) {
      console.error('Failed to download favicon:', downloadResult);
      return null;
    }
    
    // Create favicon data
    const faviconData: FaviconData = {
      issuer,
      serviceUid,
      url,
      localPath,
      timestamp: Date.now(),
    };
    
    // Update registry
    const registry = await getFaviconRegistry();
    registry[serviceUid] = faviconData;
    await saveFaviconRegistry(registry);
    
    // Remove any built-in icon for this service
    await deleteBuiltInIcon(serviceUid);
    
    return faviconData;
  } catch (error) {
    console.error('Error downloading favicon:', error);
    return null;
  }
};

// Get favicon data for a service
export const getFaviconData = async (serviceUid: string): Promise<FaviconData | null> => {
  try {
    const registry = await getFaviconRegistry();
    return registry[serviceUid] || null;
  } catch (error) {
    console.error('Failed to get favicon data:', error);
    return null;
  }
};

// Delete a favicon
export const deleteFavicon = async (serviceUid: string): Promise<boolean> => {
  try {
    const registry = await getFaviconRegistry();
    const faviconData = registry[serviceUid];
    
    if (!faviconData) return false;
    
    // Delete the file
    await FileSystem.deleteAsync(faviconData.localPath, { idempotent: true });
    
    // Update registry
    delete registry[serviceUid];
    await saveFaviconRegistry(registry);
    
    return true;
  } catch (error) {
    console.error('Failed to delete favicon:', error);
    return false;
  }
};

// Get default favicon URL for domain
export const getDefaultFaviconUrl = (domain: string): string => {
  return `https://${domain}/favicon.ico`;
};

// Extract domain from issuer
export const getDomainFromIssuer = (issuer: string): string => {
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

// Download a favicon from a website URL
export const downloadFaviconFromWebsite = async (
  serviceUid: string,
  issuer: string,
  websiteUrl: string
): Promise<FaviconData | null> => {
  try {
    // Clean up the URL
    let url = websiteUrl.trim();
    
    // Add https:// if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    // Try to get favicon using Google's favicon service which works reliably
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${url}&sz=128`;
    
    // Use the existing download function
    return await downloadFavicon(serviceUid, issuer, faviconUrl);
  } catch (error) {
    console.error('Error downloading favicon from website:', error);
    return null;
  }
};

// Set a custom PNG icon selection for a service (user override)
export const setCustomPngIconSelection = async (
  serviceUid: string,
  selectedDomain: string
): Promise<CustomPngIconSelection> => {
  try {
    // Create custom PNG icon selection data
    const selectionData: CustomPngIconSelection = {
      serviceUid,
      selectedDomain,
      timestamp: Date.now()
    };
    
    // Update registry
    const registry = await getCustomPngIconRegistry();
    registry[serviceUid] = selectionData;
    await saveCustomPngIconRegistry(registry);
    
    // Remove any existing favicon or built-in icon for this service
    await deleteFavicon(serviceUid);
    await deleteBuiltInIcon(serviceUid);
    await removeRemovedIcon(serviceUid);
    
    return selectionData;
  } catch (error) {
    console.error('Error setting custom PNG icon selection:', error);
    throw error;
  }
};

// Get custom PNG icon selection for a service (user override)
export const getCustomPngIconSelection = async (serviceUid: string): Promise<CustomPngIconSelection | null> => {
  try {
    const registry = await getCustomPngIconRegistry();
    return registry[serviceUid] || null;
  } catch (error) {
    console.error('Failed to get custom PNG icon selection:', error);
    return null;
  }
};

// Delete a custom PNG icon selection
export const deleteCustomPngIconSelection = async (serviceUid: string): Promise<boolean> => {
  try {
    const registry = await getCustomPngIconRegistry();
    
    if (!registry[serviceUid]) return false;
    
    // Update registry
    delete registry[serviceUid];
    await saveCustomPngIconRegistry(registry);
    
    return true;
  } catch (error) {
    console.error('Failed to delete custom PNG icon selection:', error);
    return false;
  }
};

// Check if a service has a custom PNG icon available (automatic or manual)
export const hasCustomPngIcon = async (serviceUid: string, issuer: string): Promise<boolean> => {
  try {
    // First check for manual selection
    const manualSelection = await getCustomPngIconSelection(serviceUid);
    if (manualSelection) {
      return true;
    }
    
    // Then check for automatic matching
    const customIcon = getCustomIcon({ uid: serviceUid, otp: { issuer } } as any);
    return !!customIcon;
  } catch (error) {
    console.error('Error checking for custom PNG icon:', error);
    return false;
  }
};

// Get custom PNG icon data for a service (manual selection takes priority)
export const getCustomPngIconData = async (serviceUid: string, issuer: string): Promise<CustomPngIconData | null> => {
  try {
    // First check for manual selection
    const manualSelection = await getCustomPngIconSelection(serviceUid);
    if (manualSelection) {
      // Import the manually selected icon
      const { customIcons } = await import('./customIcons');
      const iconKey = `${manualSelection.selectedDomain}.png`;
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
    const isRemoved = await getRemovedIcon(serviceUid);
    if(isRemoved) return null;
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
    console.error('Error getting custom PNG icon data:', error);
    return null;
  }
};

// Add a service to the removed icon registry
export const addRemovedIcon = async (serviceUid: string): Promise<void> => {
    try {
        const registry = await getRemovedIconRegistry();
        registry[serviceUid] = true;
        await saveRemovedIconRegistry(registry);
    } catch (error) {
        console.error('Error adding removed icon:', error);
    }
}

// Get a service from the removed icon registry
export const getRemovedIcon = async (serviceUid: string): Promise<boolean> => {
    try {
        const registry = await getRemovedIconRegistry();
        return registry[serviceUid] || false;
    } catch (error) {
        console.error('Error getting removed icon:', error);
        return false;
    }
}

// Remove a service from the removed icon registry
export const removeRemovedIcon = async (serviceUid: string): Promise<void> => {
    try {
        const registry = await getRemovedIconRegistry();
        if (registry[serviceUid]) {
            delete registry[serviceUid];
            await saveRemovedIconRegistry(registry);
        }
    } catch (error) {
        console.error('Error removing removed icon:', error);
    }
}

// Clear other icon types when a custom PNG icon is available
export const clearOtherIconsForCustomPng = async (serviceUid: string): Promise<void> => {
  try {
    // Remove any existing favicon
    await deleteFavicon(serviceUid);
    
    // Remove any existing built-in icon
    await deleteBuiltInIcon(serviceUid);
  } catch (error) {
    console.error('Error clearing other icons for custom PNG:', error);
  }
};

// Get the primary icon type for a service (in priority order)
export const getPrimaryIconType = async (serviceUid: string, issuer: string): Promise<'custom-png' | 'favicon' | 'builtin' | 'none'> => {
  try {
    // Check for custom PNG icon first (highest priority)
    if (await hasCustomPngIcon(serviceUid, issuer)) {
      return 'custom-png';
    }
    
    // Check for favicon
    const faviconData = await getFaviconData(serviceUid);
    if (faviconData) {
      return 'favicon';
    }
    
    // Check for built-in icon
    const builtInIconData = await getBuiltInIconData(serviceUid);
    if (builtInIconData) {
      return 'builtin';
    }
    
    return 'none';
  } catch (error) {
    console.error('Error getting primary icon type:', error);
    return 'none';
  }
};

// Get favicon suggestions for an issuer
export const getFaviconSuggestions = (issuer: string): string[] => {
  const domain = getDomainFromIssuer(issuer);
  
  return [
    domain,
    `www.${domain}`,
    domain.replace('.com', '')
  ];
};