import { parseOtpAuthUri } from "@/core/otp/uri";
import { createService, isSameService } from "@/core/service";
import { Service } from '@/types';
import { useCallback, useState } from "react";
import { Alert } from "react-native";

export function useCodeManager(
  services: Service[],
  updateServices: (services: Service[]) => void
) {
  const [recentCodeIndex, setRecentCodeIndex] = useState<number | null>(null);

  const addCode = useCallback((url: string) => {
    const parsed = parseOtpAuthUri(url);

    if (!parsed) {
      Alert.alert("Error", "Unable to add code!");
      return;
    }

    if (parsed.type === 'hotp') {
      Alert.alert("Error", "HOTP is not supported yet");
      return;
    }

    const service = createService(parsed, services.length);
    const existingIndex = services.findIndex((item) => isSameService(item, service));

    if (existingIndex === -1) {
      // Add new service
      const newServices = [...services, service];
      updateServices(newServices);
      setRecentCodeIndex(newServices.length - 1);
    } else {
      // Highlight existing service
      setRecentCodeIndex(existingIndex);
    }
  }, [services, updateServices]);

  const resetRecentCodeIndex = useCallback(() => setRecentCodeIndex(null), []);

  return {
    recentCodeIndex,
    addCode,
    resetRecentCodeIndex
  };
}
