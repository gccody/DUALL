import {
  Group,
  Service,
  Settings,
  TOTPAlgorithm,
  TOTPFile,
  TokenType,
} from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Storage keys
const CONFIG_KEY = 'otpConfig'; // Non-sensitive config in AsyncStorage
const SERVICE_KEY_PREFIX = 'service_'; // Individual services in SecureStore

// Config structure (non-sensitive data)
interface OTPConfig {
  settings: Settings;
  groups: Group[];
  serviceMetadata: ServiceMetadata[]; // Service info without secrets
}

// Service metadata (everything except the secret)
interface ServiceMetadata {
  uid: string;
  name: string;
  otp: {
    link: string;
    algorithm: TOTPAlgorithm;
    period: number | undefined;
    tokenType: TokenType;
    issuer: string;
    digits: number;
  };
  iconRemoved?: boolean;
  iconUpdatedAt?: number;
  order?: number;
}

export class FileHandler {
  /**
   * Get config from AsyncStorage
   */
  private static async getConfig(): Promise<OTPConfig> {
    try {
      const configStr = await AsyncStorage.getItem(CONFIG_KEY);
      if (configStr) {
        return JSON.parse(configStr);
      }
    } catch (error) {
      console.error('Failed to get config:', error);
    }
    
    // Return default config
    return {
      settings: {
        darkMode: true,
        searchOnStartup: false,
        hideTokens: false,
        showNextToken: false,
        notifyWhenTokenCopied: true,
        useBiometrics: true
      },
      groups: [],
      serviceMetadata: []
    };
  }

  /**
   * Save config to AsyncStorage
   */
  private static async saveConfig(config: OTPConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      throw new Error('Failed to save config: ' + error);
    }
  }

  /**
   * Get a single service from SecureStore
   */
  private static async getService(uid: string): Promise<Service | null> {
    try {
      const serviceStr = await SecureStore.getItemAsync(`${SERVICE_KEY_PREFIX}${uid}`);
      if (serviceStr) {
        return JSON.parse(serviceStr);
      }
    } catch (error) {
      console.error(`Failed to get service ${uid}:`, error);
    }
    return null;
  }

  /**
   * Save a single service to SecureStore
   */
  private static async saveService(service: Service): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        `${SERVICE_KEY_PREFIX}${service.uid}`,
        JSON.stringify(service)
      );
    } catch (error) {
      throw new Error(`Failed to save service ${service.uid}: ` + error);
    }
  }

  /**
   * Delete a single service from SecureStore
   */
  private static async deleteService(uid: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(`${SERVICE_KEY_PREFIX}${uid}`);
    } catch (error) {
      console.error(`Failed to delete service ${uid}:`, error);
    }
  }

  /**
   * Loads the OTP data by combining config from AsyncStorage and services from SecureStore
   */
  static async loadData(): Promise<TOTPFile> {
    try {
      // Load config (non-sensitive data)
      const config = await FileHandler.getConfig();
      
      // Load all services from SecureStore
      const services: Service[] = [];
      for (const metadata of config.serviceMetadata) {
        const service = await FileHandler.getService(metadata.uid);
        if (service) {
          services.push(service);
        }
      }
      
      return {
        services,
        groups: config.groups,
        settings: config.settings
      };
    } catch (error) {
      console.error('Failed to load data:', error);
      // Return default data as fallback
      return {
        services: [],
        groups: [],
        settings: {
          darkMode: true,
          searchOnStartup: false,
          hideTokens: false,
          showNextToken: false,
          notifyWhenTokenCopied: true,
          useBiometrics: true
        },
      };
    }
  }

  /**
   * Saves the complete OTP data (used for bulk imports/migrations)
   */
  static async saveData(data: TOTPFile): Promise<void> {
    try {
      // Extract service metadata (everything except secrets)
      const serviceMetadata: ServiceMetadata[] = data.services.map(s => ({
        uid: s.uid,
        name: s.name,
        otp: {
          link: s.otp.link,
          algorithm: s.otp.algorithm,
          period: s.otp.period,
          tokenType: s.otp.tokenType,
          issuer: s.otp.issuer,
          digits: s.otp.digits,
        },
        iconRemoved: (s as any).iconRemoved,
        iconUpdatedAt: (s as any).iconUpdatedAt,
        order: data.services.indexOf(s)
      }));
      
      // Save config (non-sensitive)
      const config: OTPConfig = {
        settings: data.settings,
        groups: data.groups,
        serviceMetadata
      };
      await FileHandler.saveConfig(config);
      
      // Save each service (with secrets) to SecureStore in parallel
      const servicePromises = data.services.map(service =>
        FileHandler.saveService(service)
      );
      await Promise.all(servicePromises);
    } catch (error) {
      throw new Error('Failed to save data: ' + error);
    }
  }

  /**
   * Remove all data
   */
  static async removeData(): Promise<void> {
    try {
      // Remove config
      await AsyncStorage.removeItem(CONFIG_KEY);
      
      // Load config to get all service UIDs
      const config = await FileHandler.getConfig();
      
      // Remove all services in parallel
      const deletePromises = config.serviceMetadata.map(meta =>
        FileHandler.deleteService(meta.uid)
      );
      await Promise.all(deletePromises);
    } catch(error) {
      throw new Error('Failed to remove data: ' + error);
    }
  }

  /**
   * Updates a single service (fast operation - only updates one SecureStore entry)
   */
  static async updateService(service: Service): Promise<void> {
    try {
      // Save the service to SecureStore
      await FileHandler.saveService(service);
      
      // Update metadata in config
      const config = await FileHandler.getConfig();
      const metadataIndex = config.serviceMetadata.findIndex(m => m.uid === service.uid);
      
      const metadata: ServiceMetadata = {
        uid: service.uid,
        name: service.name,
        otp: {
          link: service.otp.link,
          algorithm: service.otp.algorithm,
          period: service.otp.period,
          tokenType: service.otp.tokenType,
          issuer: service.otp.issuer,
          digits: service.otp.digits,
        },
        iconRemoved: (service as any).iconRemoved,
        iconUpdatedAt: (service as any).iconUpdatedAt,
        order: metadataIndex >= 0 ? metadataIndex : config.serviceMetadata.length
      };
      
      if (metadataIndex >= 0) {
        config.serviceMetadata[metadataIndex] = metadata;
      } else {
        config.serviceMetadata.push(metadata);
      }
      
      await FileHandler.saveConfig(config);
    } catch (error) {
      throw new Error(`Failed to update service ${service.uid}: ` + error);
    }
  }

  /**
   * Updates the services (bulk operation)
   */
  static async updateServices(services: Service[]): Promise<void> {
    try {
      // Save all services to SecureStore in parallel
      const servicePromises = services.map(service =>
        FileHandler.saveService(service)
      );
      await Promise.all(servicePromises);
      
      // Update all metadata in config
      const config = await FileHandler.getConfig();
      config.serviceMetadata = services.map((s, index) => ({
        uid: s.uid,
        name: s.name,
        otp: {
          link: s.otp.link,
          algorithm: s.otp.algorithm,
          period: s.otp.period,
          tokenType: s.otp.tokenType,
          issuer: s.otp.issuer,
          digits: s.otp.digits,
        },
        iconRemoved: (s as any).iconRemoved,
        iconUpdatedAt: (s as any).iconUpdatedAt,
        order: index
      }));
      
      await FileHandler.saveConfig(config);
      
      // Remove any services that are no longer in the list
      const currentUids = new Set(services.map(s => s.uid));
      const oldMetadata = await FileHandler.getConfig();
      const deletePromises = oldMetadata.serviceMetadata
        .filter(m => !currentUids.has(m.uid))
        .map(m => FileHandler.deleteService(m.uid));
      
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }
    } catch (error) {
      throw new Error('Failed to update services: ' + error);
    }
  }

  /**
   * Updates the groups
   */
  static async updateGroups(groups: Group[]): Promise<void> {
    const config = await FileHandler.getConfig();
    config.groups = groups;
    await FileHandler.saveConfig(config);
  }

  /**
   * Updates the settings
   */
  static async updateSettings(settings: Settings): Promise<void> {
    const config = await FileHandler.getConfig();
    config.settings = settings;
    await FileHandler.saveConfig(config);
  }
}
