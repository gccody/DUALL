import { parseOtpAuthUri, type ParsedOtpAuth } from '@/core/otp/uri';
import { addService, mergeImported, removeService, updateService as patchService, type ServicePatch } from '@/core/vault';
import { ensureMigrated } from '@/storage/migrations';
import { loadServices, saveServices } from '@/storage/vault';
import type { Service } from '@/types';

export type VaultStatus = 'loading' | 'ready' | 'error';

export interface VaultState {
  /** All services in display order */
  services: Service[];
  status: VaultStatus;
  /** Why loading failed while `status` is 'error', otherwise null */
  error: string | null;
}

export type AddFromUriResult =
  /** `uid` and `index` identify the new or the already existing service */
  | { result: 'added'; uid: string; index: number }
  | { result: 'duplicate'; uid: string; index: number }
  /** not a usable otpauth:// URI */
  | { result: 'invalid' }
  /** HOTP */
  | { result: 'unsupported' };

export interface ImportServicesResult {
  added: number;
  duplicates: number;
}

export interface VaultActions {
  /** Adds the account in an otpauth:// URI. HOTP URIs are 'unsupported'. */
  addFromUri: (uri: string) => Promise<AddFromUriResult>;
  /** Appends parsed import entries, skipping accounts that already exist. */
  importServices: (parsed: readonly ParsedOtpAuth[]) => Promise<ImportServicesResult>;
  updateService: (uid: string, patch: ServicePatch) => Promise<void>;
  deleteService: (uid: string) => Promise<void>;
  /** Deletes every service. */
  clear: () => Promise<void>;
  /** Loads again after a failure; the outcome is reported through `status`/`error`. */
  retryLoad: () => void;
}

export interface VaultStore extends VaultActions {
  getState: () => VaultState;
  subscribe: (listener: () => void) => () => void;
  /**
   * Runs migrations and loads the services, once. Rejects if loading failed;
   * the next call then tries again.
   */
  load: () => Promise<void>;
}

/**
 * Holds the list of services. Changes are applied in memory immediately and
 * then persisted (storage serializes the writes). Each change is computed
 * from the latest list, so concurrent actions never work on stale data.
 * Actions wait for the load (retrying it if it failed) and reject if it
 * fails. A failed save rejects too and reloads the list from storage; if
 * that reload fails, the store is back in the 'error' status.
 */
export function createVaultStore(): VaultStore {
  let state: VaultState = { services: [], status: 'loading', error: null };
  const listeners = new Set<() => void>();
  let loading: Promise<void> | null = null;

  const setState = (patch: Partial<VaultState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  /** Marks the list as not loaded, so the next load() reads it again. */
  const fail = (error: unknown) => {
    console.error('Failed to load codes:', error);
    loading = null;
    setState({ status: 'error', error: 'Failed to load your codes' });
  };

  const load = () => {
    if (!loading) {
      if (state.status === 'error') setState({ status: 'loading', error: null });
      loading = (async () => {
        try {
          await ensureMigrated();
          setState({ services: await loadServices(), status: 'ready', error: null });
        } catch (error) {
          fail(error);
          throw error;
        }
      })();
    }
    return loading;
  };

  const reload = async () => {
    try {
      setState({ services: await loadServices() });
    } catch (error) {
      fail(error);
    }
  };

  /** Applies `compute` to the latest list and persists the result if it changed. */
  const change = async <T>(compute: (current: Service[]) => [Service[], T]): Promise<T> => {
    await load();
    const current = state.services;
    const [next, value] = compute(current);
    if (next === current) return value;

    setState({ services: next });
    try {
      await saveServices(next);
    } catch (error) {
      console.error('Failed to save codes:', error);
      await reload();
      throw error;
    }
    return value;
  };

  const has = (list: Service[], uid: string) => list.some((service) => service.uid === uid);

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load,
    retryLoad: () => {
      load().catch(() => {
        // Reported through `status`/`error`.
      });
    },

    addFromUri: async (uri) => {
      const parsed = parseOtpAuthUri(uri);
      if (!parsed) return { result: 'invalid' };
      if (parsed.type !== 'totp') return { result: 'unsupported' };
      return change<AddFromUriResult>((current) => {
        const { list, index, duplicate } = addService(current, parsed);
        const { uid } = list[index];
        return duplicate ? [current, { result: 'duplicate', uid, index }] : [list, { result: 'added', uid, index }];
      });
    },

    importServices: (parsed) =>
      change((current) => {
        const { list, added, duplicates } = mergeImported(current, parsed);
        return [added > 0 ? list : current, { added, duplicates }];
      }),

    updateService: (uid, patch) =>
      change((current) => [has(current, uid) ? patchService(current, uid, patch) : current, undefined]),

    deleteService: (uid) =>
      change((current) => [has(current, uid) ? removeService(current, uid) : current, undefined]),

    clear: () => change((current) => [current.length > 0 ? [] : current, undefined]),
  };
}
