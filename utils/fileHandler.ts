import {
    Group,
    Service,
    Settings,
    TOTPFile,
} from '@/types'; // Ensure your types are defined in types.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define a constant key for AsyncStorage.
const STORAGE_KEY = 'otpData';

export class FileHandler {
  /**
   * Loads the OTP data from AsyncStorage.
   * If the data does not exist, creates a default structure.
   */
  static async loadData(): Promise<TOTPFile> {
    try {
      const dataString = await AsyncStorage.getItem(STORAGE_KEY);
      if (!dataString) {
        const defaultData: TOTPFile = {
          services: [],
          groups: [],
          settings: {
            darkMode: false,
            searchOnStartup: false,
            hideTokens: false,
            showNextToken: false,
            notifyWhenTokenCopied: false,
          },
        };
        await FileHandler.saveData(defaultData);
        return defaultData;
      }
      return JSON.parse(dataString);
    } catch (error) {
      throw new Error('Failed to load data: ' + error);
    }
  }

  /**
   * Saves the complete OTP data to AsyncStorage.
   */
  static async saveData(data: TOTPFile): Promise<void> {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      await AsyncStorage.setItem(STORAGE_KEY, jsonData);
    } catch (error) {
      throw new Error('Failed to save data: ' + error);
    }
  }

  static async removeData(): Promise<void> {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch(error) {
        throw new Error('Failed to remove data: ' + error);
    }
  }

  /**
   * Updates the services in the stored data.
   */
  static async updateServices(services: Service[]): Promise<void> {
    const data = await FileHandler.loadData();
    data.services = services;
    await FileHandler.saveData(data);
  }

  /**
   * Updates the groups in the stored data.
   */
  static async updateGroups(groups: Group[]): Promise<void> {
    const data = await FileHandler.loadData();
    data.groups = groups;
    await FileHandler.saveData(data);
  }

  /**
   * Updates the settings in the stored data.
   */
  static async updateSettings(settings: Settings): Promise<void> {
    const data = await FileHandler.loadData();
    data.settings = settings;
    await FileHandler.saveData(data);
  }
}
