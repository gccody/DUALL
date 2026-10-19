/**
 * In-memory expo-secure-store for storage tests. Use with
 * `jest.mock("expo-secure-store", () => require("./secureStoreMock").secureStoreMock)`.
 */
export const secureStore = new Map<string, string>();

/** Keys whose next operation of the given kind rejects. */
export const failures = {
  get: new Set<string>(),
  set: new Set<string>(),
  delete: new Set<string>(),
};

/** Every completed operation, in order. */
export const log: string[] = [];

/** When set, operations wait for this promise before completing. */
export const gate: { promise: Promise<void> | null } = { promise: null };

async function maybeWait() {
  if (gate.promise) await gate.promise;
}

export const secureStoreMock = {
  getItemAsync: jest.fn(async (key: string) => {
    await maybeWait();
    if (failures.get.delete(key)) throw new Error(`get ${key} failed`);
    return secureStore.get(key) ?? null;
  }),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    await maybeWait();
    if (failures.set.delete(key)) throw new Error(`set ${key} failed`);
    secureStore.set(key, value);
    log.push(`set ${key}`);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    await maybeWait();
    if (failures.delete.delete(key)) throw new Error(`delete ${key} failed`);
    secureStore.delete(key);
    log.push(`delete ${key}`);
  }),
};

export function resetSecureStore() {
  secureStore.clear();
  failures.get.clear();
  failures.set.clear();
  failures.delete.clear();
  log.length = 0;
  gate.promise = null;
  secureStoreMock.getItemAsync.mockClear();
  secureStoreMock.setItemAsync.mockClear();
  secureStoreMock.deleteItemAsync.mockClear();
}
