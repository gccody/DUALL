// OtpDataContext.tsx
import { useOtpData } from '@/hooks/useOtpData';
import { Group, Service, Settings, TOTPFile } from '@/types';
import { createContext, ReactNode } from 'react';

interface OtpDataContextProps {
  data: TOTPFile | null;
  loading: boolean;
  error: string | null;
  updateServices: (services: Service[]) => Promise<void>;
  updateGroups: (groups: Group[]) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
}

export const OtpDataContext = createContext<OtpDataContextProps | undefined>(undefined);

export const OtpDataProvider = ({ children }: { children: ReactNode }) => {
  const otpData = useOtpData();
  return (
    <OtpDataContext value={otpData}>
      {children}
    </OtpDataContext>
  );
};
