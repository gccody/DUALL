import { TOTP } from "@/TOTP";
import { Service } from '@/types';
import { getCustomIcon } from '@/utils/customIconMatcher';
import * as Crypto from 'expo-crypto';
import { useCallback, useState } from "react";
import { Alert } from "react-native";

export function useCodeManager(
  services: Service[],
  updateServices: (services: Service[]) => void
) {
  const [recentCodeIndex, setRecentCodeIndex] = useState<number | null>(null);

  const addCode = useCallback((url: string) => {
    const parsedURL = TOTP.parseUrl(url);
    
    if (!parsedURL) {
      Alert.alert("Error", "Unable to add code!");
      return;
    }
    
    if (parsedURL.type === 'hotp') {
      Alert.alert("Error", "HOTP is not supported yet");
      return;
    }

    // Check if we have a matching custom icon for this service
    const tempService: Service = {
      otp: {
        algorithm: parsedURL.algorithm,
        digits: parsedURL.digits,
        issuer: parsedURL.issuer,
        link: url,
        period: parsedURL.period ?? 30,
        tokenType: 'TOTP'
      },
      position: services.length,
      name: parsedURL.account,
      secret: parsedURL.secret,
      uid: Crypto.randomUUID(),
      updatedAt: Date.now()
    };

    // Check if we have a matching custom icon
    const hasIcon = getCustomIcon(tempService) !== null;
    
    const service: Service = {
      ...tempService,
      iconRemoved: !hasIcon // Only set iconRemoved if we're confident there's no icon
    };

    // Check if code already exists
    const existingIndex = services.findIndex((item) =>
      item.name.toLowerCase() === service.name.toLowerCase() &&
      item.otp.issuer.toLowerCase() === service.otp.issuer.toLowerCase() &&
      item.secret === service.secret
    );

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