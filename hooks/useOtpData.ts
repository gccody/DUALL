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
      } catch (err: any) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }, []);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Update services
  const updateServices = useCallback(async (services: Service[]) => {
    if (!data) return;
    try {
      const updatedData = { ...data, services };
      await FileHandler.updateServices(services);
      setData(updatedData);
    } catch (err) {
      setError('Failed to update services');
    }
  }, [data]);

  // Update groups
  const updateGroups = useCallback(async (groups: Group[]) => {
    if (!data) return;
    try {
      const updatedData = { ...data, groups };
      await FileHandler.updateGroups(groups);
      setData(updatedData);
    } catch (err) {
      setError('Failed to update groups');
    }
  }, [data]);

  // Update settings
  const updateSettings = useCallback(async (settings: Settings) => {
    if (!data) return;
    try {
      const updatedData = { ...data, settings };
      await FileHandler.updateSettings(settings);
      setData(updatedData);
    } catch (err) {
      setError('Failed to update settings');
    }
  }, [data]);

  return { data, loading, error, updateServices, updateGroups, updateSettings, fetchData: loadData };
};
