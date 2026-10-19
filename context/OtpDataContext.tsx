// OtpDataContext.tsx
import { useOtpDataState } from '@/hooks/useOtpData';
import { createContext, ReactNode, use } from 'react';

type OtpDataContextProps = ReturnType<typeof useOtpDataState>;

export const OtpDataContext = createContext<OtpDataContextProps | undefined>(undefined);

export const OtpDataProvider = ({ children }: { children: ReactNode }) => {
  const otpData = useOtpDataState();
  return (
    <OtpDataContext value={otpData}>
      {children}
    </OtpDataContext>
  );
};

export const useOtpData = () => {
  const context = use(OtpDataContext);
  if (!context) {
    throw new Error('useOtpData must be used within an OtpDataProvider');
  }
  return context;
};
