// useOtpData.ts
import { Group, Service, Settings, TOTPFile } from '@/types';
import { FileHandler } from '@/utils/fileHandler';
import { useCallback, useEffect, useState } from 'react';

export const useOtpData = () => {
  const [data, setData] = useState<TOTPFile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
      try {
        const otpData = await FileHandler.loadData();
        setData(otpData);
      } catch (_) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }, []);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update services (optimistic by default, but can wait for save)
  const updateServices = useCallback(async (services: Service[], waitForSave: boolean = false) => {
    try {
      // Update UI immediately (optimistic update)
      setData(prevData => {
        if (!prevData) return prevData;
        return { ...prevData, services };
      });
      
      if (waitForSave) {
        // Wait for save to complete (for critical operations like icon changes)
        await FileHandler.updateServices(services);
      } else {
        // Save in background (for non-critical updates)
        FileHandler.updateServices(services).catch(err => {
          console.error('Failed to save services:', err);
          setError('Failed to save services');
        });
      }
    } catch (_) {
      setError('Failed to update services');
    }
  }, []); // Remove data dependency to prevent infinite loops

  // Update groups
  const updateGroups = useCallback(async (groups: Group[]) => {
    try {
      // Update UI immediately (optimistic update)
      setData(prevData => {
        if (!prevData) return prevData;
        return { ...prevData, groups };
      });
      // Save in background
      FileHandler.updateGroups(groups).catch(err => {
        console.error('Failed to save groups:', err);
        setError('Failed to save groups');
      });
    } catch (_) {
      setError('Failed to update groups');
    }
  }, []); // Remove data dependency

  // Update settings
  const updateSettings = useCallback(async (settings: Settings) => {
    try {
      // Update UI immediately (optimistic update)
      setData(prevData => {
        if (!prevData) return prevData;
        return { ...prevData, settings };
      });
      // Save in background
      FileHandler.updateSettings(settings).catch(err => {
        console.error('Failed to save settings:', err);
        setError('Failed to save settings');
      });
    } catch (_) {
      setError('Failed to update settings');
    }
  }, []); // Remove data dependency

  return { data, loading, error, updateServices, updateGroups, updateSettings, fetchData: loadData };
};
