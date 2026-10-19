import type { ParsedOtpAuth } from "@/core/otp/uri";
import type { Service } from "@/types";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("expo-secure-store", () => require("@/testing/secureStoreMock").secureStoreMock);
jest.mock("@/utils/customIconMatcher", () => ({ getCustomIconDomain: () => null }));
jest.mock("expo-crypto", () => {
  let n = 0;
  return { randomUUID: () => `uuid-${++n}` };
});

type StoreModule = typeof import("@/context/vaultStore");
type VaultStorageModule = typeof import("@/storage/vault");
type MockModule = typeof import("@/testing/secureStoreMock");
type AsyncStorageModule = typeof import("@react-native-async-storage/async-storage").default;

let createVaultStore: StoreModule["createVaultStore"];
let storage: VaultStorageModule;
let mock: MockModule;
let AsyncStorage: AsyncStorageModule;

beforeEach(() => {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports */
  mock = require("@/testing/secureStoreMock");
  AsyncStorage = require("@react-native-async-storage/async-storage").default ?? require("@react-native-async-storage/async-storage");
  storage = require("@/storage/vault");
  createVaultStore = require("@/context/vaultStore").createVaultStore;
  /* eslint-enable @typescript-eslint/no-require-imports */
  jest.spyOn(console, "error").mockImplementation(() => {});
});

const SECRET = "JBSWY3DPEHPK3PXP";
const uri = (account: string, secret = SECRET) => `otpauth://totp/Example:${account}?secret=${secret}&issuer=Example`;

const service = (uid: string, position = 0): Service => ({
  uid,
  position,
  updatedAt: 0,
  name: uid,
  secret: SECRET,
  otp: { issuer: "Example", algorithm: "SHA-1", digits: 6, period: 30 },
});

const parsed = (account: string): ParsedOtpAuth => ({
  type: "totp",
  account,
  issuer: "Example",
  secret: SECRET,
  algorithm: "SHA-1",
  digits: 6,
  period: 30,
});

/** Services as persisted, read through a fresh load. */
const stored = async () => (await storage.loadServices()).map((s) => s.name);

describe("loading", () => {
  test("starts loading and becomes ready with the stored services", async () => {
    await storage.saveServices([service("a"), service("b", 1)]);
    const store = createVaultStore();
    expect(store.getState().status).toBe("loading");
    await store.load();
    expect(store.getState()).toMatchObject({ status: "ready", error: null });
    expect(store.getState().services.map((s) => s.uid)).toEqual(["a", "b"]);
  });

  test("migrates legacy data before loading", async () => {
    await AsyncStorage.setItem("otpConfig", JSON.stringify({ serviceMetadata: [{ uid: "old", order: 0 }] }));
    mock.secureStore.set("service_old", JSON.stringify({ ...service("old"), otp: { issuer: "X", algorithm: "SHA1" } }));
    const store = createVaultStore();
    await store.load();
    expect(store.getState().services).toEqual([
      expect.objectContaining({ uid: "old", otp: { issuer: "X", algorithm: "SHA-1", digits: 6, period: 30 } }),
    ]);
    expect(await AsyncStorage.getItem("otpConfig")).toBeNull();
  });

  test("loads only once", async () => {
    const store = createVaultStore();
    expect(store.load()).toBe(store.load());
  });

  test("notifies subscribers", async () => {
    const store = createVaultStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    await store.load();
    expect(listener).toHaveBeenCalled();
    unsubscribe();
    listener.mockClear();
    await store.addFromUri(uri("x"));
    expect(listener).not.toHaveBeenCalled();
  });

  test("a failed load sets the error status and makes actions reject without writing", async () => {
    await storage.saveServices([service("a")]);
    mock.failures.get.add("service_a");
    const store = createVaultStore();
    await expect(store.load()).rejects.toThrow();
    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBeTruthy();

    mock.secureStoreMock.setItemAsync.mockClear();
    await expect(store.addFromUri(uri("x"))).rejects.toThrow();
    await expect(store.clear()).rejects.toThrow();
    expect(mock.secureStoreMock.setItemAsync).not.toHaveBeenCalled();
    expect(mock.secureStore.has("service_a")).toBe(true);
  });

  test("actions called before the load finishes wait for it instead of overwriting stored data", async () => {
    await storage.saveServices([service("a")]);
    const store = createVaultStore();
    const result = await store.addFromUri(uri("x")); // load() not called yet
    expect(result).toMatchObject({ result: "added", index: 1 });
    expect(await stored()).toEqual(["a", "x"]);
  });
});

describe("addFromUri", () => {
  test("adds a TOTP account and returns its uid and index", async () => {
    const store = createVaultStore();
    const x = await store.addFromUri(uri("x"));
    const y = await store.addFromUri(uri("y"));
    const services = store.getState().services;
    expect(x).toEqual({ result: "added", uid: services[0].uid, index: 0 });
    expect(y).toEqual({ result: "added", uid: services[1].uid, index: 1 });
    expect(services.map((s) => s.name)).toEqual(["x", "y"]);
    expect(await stored()).toEqual(["x", "y"]);
  });

  test("reports duplicates without saving", async () => {
    const store = createVaultStore();
    await store.addFromUri(uri("x"));
    await store.addFromUri(uri("y"));
    mock.secureStoreMock.setItemAsync.mockClear();
    const existing = store.getState().services[0];
    expect(await store.addFromUri(uri("X"))).toEqual({ result: "duplicate", uid: existing.uid, index: 0 });
    expect(mock.secureStoreMock.setItemAsync).not.toHaveBeenCalled();
    expect(store.getState().services).toHaveLength(2);
  });

  test("rejects invalid URIs and HOTP", async () => {
    const store = createVaultStore();
    expect(await store.addFromUri("not a uri")).toEqual({ result: "invalid" });
    expect(await store.addFromUri(`otpauth://hotp/x?secret=${SECRET}&counter=1`)).toEqual({ result: "unsupported" });
    expect(store.getState().services).toEqual([]);
  });

  test("concurrent adds both land (no stale list)", async () => {
    const store = createVaultStore();
    await store.load();
    await Promise.all([store.addFromUri(uri("x")), store.addFromUri(uri("y")), store.addFromUri(uri("z"))]);
    expect(store.getState().services.map((s) => s.name)).toEqual(["x", "y", "z"]);
    expect(await stored()).toEqual(["x", "y", "z"]);
  });
});

describe("importServices", () => {
  test("adds new entries and counts duplicates", async () => {
    const store = createVaultStore();
    await store.addFromUri(uri("a"));
    expect(await store.importServices([parsed("a"), parsed("b"), parsed("b")])).toEqual({ added: 1, duplicates: 2 });
    expect(await stored()).toEqual(["a", "b"]);
  });

  test("an import of only duplicates writes nothing", async () => {
    const store = createVaultStore();
    await store.addFromUri(uri("a"));
    mock.secureStoreMock.setItemAsync.mockClear();
    expect(await store.importServices([parsed("a")])).toEqual({ added: 0, duplicates: 1 });
    expect(mock.secureStoreMock.setItemAsync).not.toHaveBeenCalled();
  });

  test("does not drop codes added while the import was being confirmed", async () => {
    const store = createVaultStore();
    await store.load();
    const add = store.addFromUri(uri("scanned"));
    const imported = store.importServices([parsed("imported")]);
    await Promise.all([add, imported]);
    expect(await stored()).toEqual(["scanned", "imported"]);
  });
});

describe("updateService / deleteService / clear", () => {
  let store: ReturnType<StoreModule["createVaultStore"]>;
  let uids: string[];

  beforeEach(async () => {
    store = createVaultStore();
    await store.importServices([parsed("a"), parsed("b"), parsed("c")]);
    uids = store.getState().services.map((s) => s.uid);
    mock.secureStoreMock.setItemAsync.mockClear();
  });

  test("updateService patches and persists only that service", async () => {
    await store.updateService(uids[1], { name: "renamed", otp: { issuer: "NewCo" } });
    const b = store.getState().services[1];
    expect(b).toMatchObject({ name: "renamed", otp: { issuer: "NewCo", digits: 6 } });
    expect(mock.secureStoreMock.setItemAsync.mock.calls.map(([key]) => key)).toEqual([`service_${uids[1]}`]);
    expect(await stored()).toEqual(["a", "renamed", "c"]);
  });

  test("updateService sets an icon", async () => {
    await store.updateService(uids[0], { icon: { label: "github.com" } });
    expect((await storage.loadServices())[0].icon).toEqual({ label: "github.com" });
  });

  test("updating an unknown uid does nothing", async () => {
    const before = store.getState().services;
    await store.updateService("nope", { name: "x" });
    expect(store.getState().services).toBe(before);
  });

  test("deleteService removes and persists", async () => {
    await store.deleteService(uids[0]);
    expect(store.getState().services.map((s) => [s.name, s.position])).toEqual([
      ["b", 0],
      ["c", 1],
    ]);
    expect(await stored()).toEqual(["b", "c"]);
    expect(mock.secureStore.has(`service_${uids[0]}`)).toBe(false);
  });

  test("clear deletes everything", async () => {
    await store.clear();
    expect(store.getState().services).toEqual([]);
    expect(await stored()).toEqual([]);
    expect([...mock.secureStore.keys()]).toEqual([]);
  });

  test("a failed save rejects, sets the error and restores the stored list", async () => {
    mock.failures.set.add(`service_${uids[1]}`);
    await expect(store.updateService(uids[1], { name: "renamed" })).rejects.toThrow();
    expect(store.getState().error).toBeTruthy();
    expect(store.getState().status).toBe("ready");
    expect(store.getState().services.map((s) => s.name)).toEqual(["a", "b", "c"]);

    // Later changes still work
    await store.updateService(uids[1], { name: "renamed" });
    expect(await stored()).toEqual(["a", "renamed", "c"]);
  });
});
