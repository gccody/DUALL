jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("expo-secure-store", () => require("@/testing/secureStoreMock").secureStoreMock);
jest.mock("@/utils/customIconMatcher", () => ({ getCustomIconDomain: () => null }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "uuid" }));

type MigrationsModule = typeof import("@/storage/migrations");
type VaultModule = typeof import("@/storage/vault");
type SettingsModule = typeof import("@/storage/settings");
type MockModule = typeof import("@/testing/secureStoreMock");
type AsyncStorageModule = typeof import("@react-native-async-storage/async-storage").default;

let migrations: MigrationsModule;
let vault: VaultModule;
let settings: SettingsModule;
let mock: MockModule;
let AsyncStorage: AsyncStorageModule;

beforeEach(() => {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports */
  mock = require("@/testing/secureStoreMock");
  AsyncStorage = require("@react-native-async-storage/async-storage").default ?? require("@react-native-async-storage/async-storage");
  migrations = require("@/storage/migrations");
  vault = require("@/storage/vault");
  settings = require("@/storage/settings");
  /* eslint-enable @typescript-eslint/no-require-imports */
  jest.spyOn(console, "error").mockImplementation(() => {});
});

const SECRET_A = "JBSWY3DPEHPK3PXP";
const SECRET_B = "GEZDGNBVGY3TQOJQ";
const SECRET_C = "MFRGGZDFMZTWQ2LK";

const legacySettings = {
  darkMode: false,
  searchOnStartup: true,
  hideTokens: true,
  showNextToken: true,
  notifyWhenTokenCopied: false,
  useBiometrics: false,
};

/** Data as written by the FileHandler-based versions, including `otp.link` leaks. */
async function seedLegacy({ withOrder = true } = {}) {
  const meta = (uid: string, secret: string, order: number) => ({
    uid,
    name: `name-${uid}`,
    otp: { issuer: uid, algorithm: "SHA1", digits: 6, link: `otpauth://totp/${uid}?secret=${secret}`, tokenType: "TOTP" },
    ...(withOrder ? { order } : {}),
  });
  await AsyncStorage.setItem(
    "otpConfig",
    JSON.stringify({
      settings: legacySettings,
      groups: [{ uid: "g", name: "group", defaultExpanded: true }],
      // Array order differs from `order`
      serviceMetadata: [meta("c", SECRET_C, 2), meta("a", SECRET_A, 0), meta("b", SECRET_B, 1)],
    })
  );
  const stored = (uid: string, secret: string, extra: object = {}) =>
    mock.secureStore.set(
      `service_${uid}`,
      JSON.stringify({
        position: 7,
        updatedAt: 123,
        name: `name-${uid}`,
        uid,
        secret,
        otp: { issuer: uid, algorithm: "SHA1", digits: 6, period: undefined, link: `otpauth://totp/${uid}?secret=${secret}`, tokenType: "TOTP" },
        ...extra,
      })
    );
  stored("a", SECRET_A, { icon: { label: "github.com" } });
  stored("b", SECRET_B);
  stored("c", SECRET_C);
}

const index = async () => JSON.parse((await AsyncStorage.getItem("vault.index.v2")) ?? "null");
const allAsyncStorage = async () => {
  const keys = await AsyncStorage.getAllKeys();
  return (await Promise.all(keys.map((key) => AsyncStorage.getItem(key)))).join("\n");
};

describe("migrateLegacyConfig", () => {
  test("builds the v2 index in the stored order", async () => {
    await seedLegacy();
    await migrations.migrateLegacyConfig();
    expect(await index()).toEqual({ version: 2, order: ["a", "b", "c"], written: ["a", "b", "c"] });
  });

  test("falls back to array order when `order` is missing", async () => {
    await seedLegacy({ withOrder: false });
    await migrations.migrateLegacyConfig();
    expect((await index()).order).toEqual(["c", "a", "b"]);
  });

  test("removes otpConfig, scrubbing every secret from AsyncStorage", async () => {
    await seedLegacy();
    expect(await allAsyncStorage()).toContain(SECRET_A);
    await migrations.migrateLegacyConfig();
    expect(await AsyncStorage.getItem("otpConfig")).toBeNull();
    const everything = await allAsyncStorage();
    for (const secret of [SECRET_A, SECRET_B, SECRET_C]) expect(everything).not.toContain(secret);
  });

  test("rewrites stored services normalized, keeping secrets and icons", async () => {
    await seedLegacy();
    await migrations.migrateLegacyConfig();
    const a = JSON.parse(mock.secureStore.get("service_a")!);
    expect(a).toEqual({
      position: 0,
      updatedAt: 123,
      name: "name-a",
      uid: "a",
      secret: SECRET_A,
      otp: { issuer: "a", algorithm: "SHA-1", digits: 6, period: 30 },
      icon: { label: "github.com" },
    });
    expect(mock.secureStore.get("service_b")).not.toContain("link");
    expect(mock.secureStore.get("service_b")).not.toContain("tokenType");
    expect(JSON.parse(mock.secureStore.get("service_c")!).position).toBe(2);
  });

  test("copies settings to their own key", async () => {
    await seedLegacy();
    await migrations.migrateLegacyConfig();
    expect(await settings.loadSettings()).toEqual(legacySettings);
  });

  test("does not overwrite settings already stored under the new key", async () => {
    await seedLegacy();
    await settings.saveSettings({ ...settings.DEFAULT_SETTINGS, hideTokens: true });
    await migrations.migrateLegacyConfig();
    expect((await settings.loadSettings()).hideTokens).toBe(true);
    expect((await settings.loadSettings()).darkMode).toBe(true);
  });

  test("migrated data loads through the vault", async () => {
    await seedLegacy();
    await migrations.migrateLegacyConfig();
    const services = await vault.loadServices();
    expect(services.map((s) => [s.uid, s.position, s.secret])).toEqual([
      ["a", 0, SECRET_A],
      ["b", 1, SECRET_B],
      ["c", 2, SECRET_C],
    ]);
  });

  test("drops services whose secret is missing", async () => {
    await seedLegacy();
    mock.secureStore.delete("service_b");
    await migrations.migrateLegacyConfig();
    expect((await index()).order).toEqual(["a", "c"]);
    expect(JSON.parse(mock.secureStore.get("service_c")!).position).toBe(1);
  });

  test("skips unreadable stored services; they are swept on load", async () => {
    await seedLegacy();
    mock.secureStore.set("service_b", "{oops");
    await migrations.migrateLegacyConfig();
    expect((await index()).order).toEqual(["a", "c"]);
    await vault.loadServices();
    expect(mock.secureStore.has("service_b")).toBe(false);
  });

  test("is a no-op without legacy data", async () => {
    await migrations.migrateLegacyConfig();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
    expect(mock.secureStoreMock.setItemAsync).not.toHaveBeenCalled();
  });

  test("re-running after completion changes nothing", async () => {
    await seedLegacy();
    await migrations.migrateLegacyConfig();
    const snapshot = new Map(mock.secureStore);
    const indexBefore = await index();
    mock.secureStoreMock.setItemAsync.mockClear();

    await migrations.migrateLegacyConfig();
    expect(mock.secureStoreMock.setItemAsync).not.toHaveBeenCalled();
    expect(new Map(mock.secureStore)).toEqual(snapshot);
    expect(await index()).toEqual(indexBefore);
  });

  test("a run interrupted while rewriting secrets keeps otpConfig and is completed by the next run", async () => {
    await seedLegacy();
    mock.failures.set.add("service_b");
    await expect(migrations.migrateLegacyConfig()).rejects.toThrow();
    expect(await AsyncStorage.getItem("otpConfig")).not.toBeNull();
    expect(mock.secureStore.get("service_b")).toContain(SECRET_B);

    await migrations.migrateLegacyConfig();
    expect(await AsyncStorage.getItem("otpConfig")).toBeNull();
    expect(mock.secureStore.get("service_b")).not.toContain("link");
    expect((await vault.loadServices()).map((s) => s.uid)).toEqual(["a", "b", "c"]);
  });

  test("a run interrupted before removing otpConfig is completed by the next run", async () => {
    await seedLegacy();
    jest.spyOn(AsyncStorage, "removeItem").mockRejectedValueOnce(new Error("killed"));
    await expect(migrations.migrateLegacyConfig()).rejects.toThrow("killed");
    expect(await AsyncStorage.getItem("otpConfig")).not.toBeNull();

    await migrations.migrateLegacyConfig();
    expect(await AsyncStorage.getItem("otpConfig")).toBeNull();
    expect(await index()).toEqual({ version: 2, order: ["a", "b", "c"], written: ["a", "b", "c"] });
    expect(await settings.loadSettings()).toEqual(legacySettings);
  });

  test("a SecureStore read failure aborts, keeping the legacy data", async () => {
    await seedLegacy();
    mock.failures.get.add("service_a");
    await expect(migrations.migrateLegacyConfig()).rejects.toThrow();
    expect(await AsyncStorage.getItem("otpConfig")).not.toBeNull();
    expect(await index()).toBeNull();
    expect(mock.secureStore.get("service_a")).toContain("link");
  });

  test("keeps tracking entries from an index left by an earlier interrupted run", async () => {
    await seedLegacy();
    await AsyncStorage.setItem("vault.index.v2", JSON.stringify({ version: 2, order: ["a"], written: ["a", "stale"] }));
    mock.secureStore.set("service_stale", "{}");
    await migrations.migrateLegacyConfig();
    expect((await index()).written).toContain("stale");
    await vault.loadServices();
    expect(mock.secureStore.has("service_stale")).toBe(false);
  });

  test("leaves an unreadable otpConfig in place", async () => {
    await AsyncStorage.setItem("otpConfig", "{broken");
    await migrations.migrateLegacyConfig();
    expect(await AsyncStorage.getItem("otpConfig")).toBe("{broken");
    expect(await index()).toBeNull();
  });
});

describe("ensureMigrated", () => {
  test("runs once and shares the promise", async () => {
    await seedLegacy();
    const first = migrations.ensureMigrated();
    expect(migrations.ensureMigrated()).toBe(first);
    await first;
    expect(await AsyncStorage.getItem("otpConfig")).toBeNull();
  });

  test("retries after a failure", async () => {
    await seedLegacy();
    mock.failures.get.add("service_a");
    await expect(migrations.ensureMigrated()).rejects.toThrow();
    await migrations.ensureMigrated();
    expect(await AsyncStorage.getItem("otpConfig")).toBeNull();
  });
});

describe("eraseAllServices with unmigrated data", () => {
  test("deletes legacy secrets and otpConfig", async () => {
    await seedLegacy();
    mock.secureStore.set("user_pin_hash", "x");
    await vault.eraseAllServices();
    expect([...mock.secureStore.keys()]).toEqual(["user_pin_hash"]);
    expect(await AsyncStorage.getItem("otpConfig")).toBeNull();
    expect(await index()).toBeNull();
  });
});

describe("settings storage", () => {
  test("defaults when nothing is stored", async () => {
    expect(await settings.loadSettings()).toEqual(settings.DEFAULT_SETTINGS);
  });

  test("round-trips", async () => {
    await settings.saveSettings(legacySettings);
    expect(await settings.loadSettings()).toEqual(legacySettings);
  });

  test("fills keys missing from stored settings with defaults", async () => {
    await AsyncStorage.setItem("settings.v1", JSON.stringify({ hideTokens: true }));
    expect(await settings.loadSettings()).toEqual({ ...settings.DEFAULT_SETTINGS, hideTokens: true });
  });

  test("ignores unknown keys and mistyped values", async () => {
    await AsyncStorage.setItem("settings.v1", JSON.stringify({ hideTokens: "yes", bogus: 1, darkMode: false }));
    expect(await settings.loadSettings()).toEqual({ ...settings.DEFAULT_SETTINGS, darkMode: false });
  });

  test("unreadable settings fall back to defaults", async () => {
    await AsyncStorage.setItem("settings.v1", "nope");
    expect(await settings.loadSettings()).toEqual(settings.DEFAULT_SETTINGS);
  });

  test("returns a copy of the defaults", async () => {
    const loaded = await settings.loadSettings();
    loaded.darkMode = false;
    expect(settings.DEFAULT_SETTINGS.darkMode).toBe(true);
  });
});
