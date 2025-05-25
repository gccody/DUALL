import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';

// Keys for local storage
const FAVICON_STORAGE_KEY = 'faviconRegistry';
const BUILT_IN_ICON_KEY = 'builtInIconRegistry';
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

// Interface for favicon registry
interface FaviconRegistry {
  [serviceUid: string]: FaviconData;
}

// Interface for built-in icon registry
interface BuiltInIconRegistry {
  [serviceUid: string]: BuiltInIconData;
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

// Get favicon suggestions for an issuer
export const getFaviconSuggestions = (issuer: string): string[] => {
  const domain = getDomainFromIssuer(issuer);
  
  return [
    domain,
    `www.${domain}`,
    domain.replace('.com', '')
  ];
}; 