import { createContext, ReactNode, use, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createVaultStore, type VaultActions, type VaultState } from './vaultStore';

export type { AddFromUriResult, ImportServicesResult, VaultStatus } from './vaultStore';

export type Vault = VaultState & VaultActions;

const VaultContext = createContext<Vault | undefined>(undefined);

/** Provides the services list and the actions that change it. See createVaultStore(). */
export function VaultProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createVaultStore);

  useEffect(() => {
    store.load().catch(() => {
      // Reported through `status`/`error`.
    });
  }, [store]);

  const state = useSyncExternalStore(store.subscribe, store.getState);

  const value = useMemo<Vault>(() => ({
    ...state,
    addFromUri: store.addFromUri,
    importServices: store.importServices,
    updateService: store.updateService,
    deleteService: store.deleteService,
    clear: store.clear,
  }), [state, store]);

  return <VaultContext value={value}>{children}</VaultContext>;
}

export function useVault(): Vault {
  const context = use(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
