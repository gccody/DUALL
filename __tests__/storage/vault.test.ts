import type { Service } from "@/types";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("expo-secure-store", () => require("@/testing/secureStoreMock").secureStoreMock);

type VaultModule = typeof import("@/storage/vault");
type MockModule = typeof import("@/testing/secureStoreMock");
type AsyncStorageModule = typeof import("@react-native-async-storage/async-storage").default;

let vault: VaultModule;
let mock: MockModule;
let AsyncStorage: AsyncStorageModule;

/** Fresh module registry per test: empty storage and no cached state. */
beforeEach(() => {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports */
  mock = require("@/testing/secureStoreMock");
  AsyncStorage = require("@react-native-async-storage/async-storage").default ?? require("@react-native-async-storage/async-storage");
  vault = require("@/storage/vault");
  /* eslint-enable @typescript-eslint/no-require-imports */
  jest.spyOn(console, "error").mockImplementation(() => {});
});

const SECRET = "JBSWY3DPEHPK3PXP";

const service = (uid: string, position = 0, overrides: Partial<Service> = {}): Service => ({
  uid,
  position,
  updatedAt: 0,
  name: `name-${uid}`,
  secret: SECRET,
  otp: { issuer: uid, algorithm: "SHA-1", digits: 6, period: 30 },
  ...overrides,
});

const index = async () => JSON.parse((await AsyncStorage.getItem("vault.index.v2")) ?? "null");
const secretKeys = () => [...mock.secureStore.keys()].sort();
const secretWrites = () => mock.secureStoreMock.setItemAsync.mock.calls.map(([key]) => key);

async function seed(order: string[], written: string[], services: Service[]) {
  await AsyncStorage.setItem("vault.index.v2", JSON.stringify({ version: 2, order, written }));
  for (const s of services) mock.secureStore.set(`service_${s.uid}`, JSON.stringify(s));
}

describe("save and load", () => {
  test("an empty vault loads as an empty list without writing anything", async () => {
    expect(await vault.loadServices()).toEqual([]);
    expect(await index()).toBeNull();
    expect(secretWrites()).toEqual([]);
  });

  test("round-trips services in order", async () => {
    const list = [service("b", 0), service("a", 1), service("c", 2)];
    await vault.saveServices(list);
    expect(secretKeys()).toEqual(["service_a", "service_b", "service_c"]);
    expect(await index()).toEqual({ version: 2, order: ["b", "a", "c"], written: ["b", "a", "c"] });


    expect(await vault.loadServices()).toEqual(list);
  });

  test("keeps secrets out of AsyncStorage", async () => {
    await vault.saveServices([service("a")]);
    const keys = await AsyncStorage.getAllKeys();
    const values = await Promise.all(keys.map((key) => AsyncStorage.getItem(key)));
    expect(values.join("")).not.toContain(SECRET);
  });

  test("reads secrets in parallel", async () => {
    await seed(["a", "b", "c"], ["a", "b", "c"], [service("a"), service("b"), service("c")]);
    let release!: () => void;
    mock.gate.promise = new Promise((resolve) => (release = resolve));
    const loading = vault.loadServices();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mock.secureStoreMock.getItemAsync).toHaveBeenCalledTimes(3);
    release();
    expect(await loading).toHaveLength(3);
  });

  test("rejects duplicate uids", async () => {
    await expect(vault.saveServices([service("a"), service("a")])).rejects.toThrow("Duplicate");
    expect(secretWrites()).toEqual([]);
  });
});

describe("diff-based writes", () => {
  const list = [service("a", 0), service("b", 1), service("c", 2)];

  beforeEach(async () => {
    await seed(["a", "b", "c"], ["a", "b", "c"], list);
    await vault.loadServices();
    mock.secureStoreMock.setItemAsync.mockClear();
  });

  test("saving an unchanged list writes no secrets and no index", async () => {
    const setItem = jest.spyOn(AsyncStorage, "setItem");
    setItem.mockClear();
    await vault.saveServices(list.map((s) => ({ ...s })));
    expect(secretWrites()).toEqual([]);
    expect(setItem).not.toHaveBeenCalled();
  });

  test("only the edited service is written", async () => {
    await vault.saveServices([list[0], { ...list[1], name: "renamed" }, list[2]]);
    expect(secretWrites()).toEqual(["service_b"]);
    expect(JSON.parse(mock.secureStore.get("service_b")!).name).toBe("renamed");
  });

  test("a second save of the same edit writes nothing", async () => {
    const edited = [list[0], { ...list[1], name: "renamed" }, list[2]];
    await vault.saveServices(edited);
    await vault.saveServices(edited);
    expect(secretWrites()).toEqual(["service_b"]);
  });

  test("adding a service writes only the new one", async () => {
    await vault.saveServices([...list, service("d", 3)]);
    expect(secretWrites()).toEqual(["service_d"]);
    expect((await index()).order).toEqual(["a", "b", "c", "d"]);
  });

  test("reordering only rewrites the index", async () => {
    await vault.saveServices([list[2], list[0], list[1]]);
    expect(secretWrites()).toEqual([]);
    expect((await index()).order).toEqual(["c", "a", "b"]);
  });

  test("a failed write is retried by the next save", async () => {
    const edited = [list[0], { ...list[1], name: "renamed" }, list[2]];
    mock.failures.set.add("service_b");
    await expect(vault.saveServices(edited)).rejects.toThrow();
    await vault.saveServices(edited);
    expect(secretWrites()).toEqual(["service_b", "service_b"]);
    expect(JSON.parse(mock.secureStore.get("service_b")!).name).toBe("renamed");
  });
});

describe("removal", () => {
  beforeEach(async () => {
    await vault.saveServices([service("a"), service("b"), service("c")]);
  });

  test("deletes the removed secret and shrinks the index", async () => {
    await vault.saveServices([service("a"), service("c")]);
    expect(secretKeys()).toEqual(["service_a", "service_c"]);
    expect(await index()).toEqual({ version: 2, order: ["a", "c"], written: ["a", "c"] });
    expect((await vault.loadServices()).map((s) => s.uid)).toEqual(["a", "c"]);
  });

  test("deletes all secrets when saving an empty list", async () => {
    await vault.saveServices([]);
    expect(secretKeys()).toEqual([]);
    expect(await index()).toEqual({ version: 2, order: [], written: [] });
  });

  test("never deletes a secret while the stored index still orders it", async () => {
    const orderedAtDelete: string[][] = [];
    mock.secureStoreMock.deleteItemAsync.mockImplementationOnce(async (key: string) => {
      orderedAtDelete.push((await index()).order);
      mock.secureStore.delete(key);
    });
    await vault.saveServices([service("a"), service("c")]);
    expect(orderedAtDelete).toEqual([["a", "c"]]);
  });

  test("a failed delete stays tracked and is swept on the next load", async () => {
    mock.failures.delete.add("service_b");
    await vault.saveServices([service("a"), service("c")]);
    expect(secretKeys()).toEqual(["service_a", "service_b", "service_c"]);
    expect(await index()).toEqual({ version: 2, order: ["a", "c"], written: ["a", "c", "b"] });

    expect((await vault.loadServices()).map((s) => s.uid)).toEqual(["a", "c"]);
    expect(secretKeys()).toEqual(["service_a", "service_c"]);
    expect((await index()).written).toEqual(["a", "c"]);
  });
});

describe("crash safety", () => {
  test("a new uid is tracked in `written` before its secret is written", async () => {
    await vault.saveServices([service("a")]);
    const writtenAtSet: string[][] = [];
    mock.secureStoreMock.setItemAsync.mockImplementationOnce(async (key: string, value: string) => {
      const stored = await index();
      writtenAtSet.push(stored.written);
      expect(stored.order).toEqual(["a"]);
      mock.secureStore.set(key, value);
    });
    await vault.saveServices([service("a"), service("b")]);
    expect(writtenAtSet).toEqual([["a", "b"]]);
  });

  test("a failed secret write leaves the index order untouched; the orphan is swept later", async () => {
    await vault.saveServices([service("a")]);
    mock.failures.set.add("service_c");
    await expect(vault.saveServices([service("a"), service("b"), service("c")])).rejects.toThrow("Failed to save");

    const stored = await index();
    expect(stored.order).toEqual(["a"]);
    expect(stored.written).toEqual(["a", "b", "c"]);

    expect((await vault.loadServices()).map((s) => s.uid)).toEqual(["a"]);
    expect(secretKeys()).toEqual(["service_a"]);
    expect(await index()).toEqual({ version: 2, order: ["a"], written: ["a"] });
  });

  test("a failed index write rejects without deleting anything", async () => {
    await vault.saveServices([service("a"), service("b")]);
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("disk full"));
    await expect(vault.saveServices([service("a")])).rejects.toThrow("disk full");
    expect(secretKeys()).toEqual(["service_a", "service_b"]);
    expect((await index()).order).toEqual(["a", "b"]);
  });
});

describe("loading damaged data", () => {
  test("sweeps orphans listed in `written` but not in `order`", async () => {
    await seed(["a"], ["a", "b"], [service("a"), service("b")]);
    expect((await vault.loadServices()).map((s) => s.uid)).toEqual(["a"]);
    expect(secretKeys()).toEqual(["service_a"]);
    expect(await index()).toEqual({ version: 2, order: ["a"], written: ["a"] });
  });

  test("drops uids whose secret is missing", async () => {
    await seed(["a", "b", "c"], ["a", "b", "c"], [service("a"), service("c")]);
    expect((await vault.loadServices()).map((s) => s.uid)).toEqual(["a", "c"]);
    expect(await index()).toEqual({ version: 2, order: ["a", "c"], written: ["a", "c"] });
  });

  test("drops and sweeps an unreadable secret", async () => {
    await seed(["a", "b"], ["a", "b"], [service("a")]);
    mock.secureStore.set("service_b", "{not json");
    expect((await vault.loadServices()).map((s) => s.uid)).toEqual(["a"]);
    expect(secretKeys()).toEqual(["service_a"]);
    expect(await index()).toEqual({ version: 2, order: ["a"], written: ["a"] });
  });

  test("rejects without modifying anything when SecureStore can't be read", async () => {
    await seed(["a", "b"], ["a", "b", "x"], [service("a"), service("b")]);
    mock.failures.get.add("service_b");
    await expect(vault.loadServices()).rejects.toThrow();
    expect(secretKeys()).toEqual(["service_a", "service_b"]);
    expect(await index()).toEqual({ version: 2, order: ["a", "b"], written: ["a", "b", "x"] });
  });

  test("rejects an unreadable index", async () => {
    await AsyncStorage.setItem("vault.index.v2", "garbage");
    await expect(vault.loadServices()).rejects.toThrow();
  });

  test("does not write when nothing needs repair", async () => {
    await seed(["a"], ["a"], [service("a")]);
    const setItem = jest.spyOn(AsyncStorage, "setItem");
    setItem.mockClear();
    await vault.loadServices();
    expect(setItem).not.toHaveBeenCalled();
    expect(mock.secureStoreMock.deleteItemAsync).not.toHaveBeenCalled();
  });
});

describe("queue", () => {
  test("concurrent saves run one after another; the last one wins", async () => {
    let release!: () => void;
    mock.gate.promise = new Promise((resolve) => (release = resolve));
    const saves = [
      vault.saveServices([service("a")]),
      vault.saveServices([service("a"), service("b")]),
      vault.saveServices([service("b", 0, { name: "final" })]),
    ];
    release();
    await Promise.all(saves);

    expect(await index()).toEqual({ version: 2, order: ["b"], written: ["b"] });
    expect(secretKeys()).toEqual(["service_b"]);
    expect(JSON.parse(mock.secureStore.get("service_b")!).name).toBe("final");
    expect(mock.log).toEqual(["set service_a", "set service_b", "set service_b", "delete service_a"]);
  });

  test("a failed save does not block later ones", async () => {
    mock.failures.set.add("service_a");
    const first = vault.saveServices([service("a")]);
    const second = vault.saveServices([service("b")]);
    await expect(first).rejects.toThrow();
    await second;
    expect((await vault.loadServices()).map((s) => s.uid)).toEqual(["b"]);
  });

  test("a load queued behind a save sees its result", async () => {
    const save = vault.saveServices([service("a")]);
    const load = vault.loadServices();
    await save;
    expect((await load).map((s) => s.uid)).toEqual(["a"]);
  });
});

describe("eraseAllServices", () => {
  test("deletes every tracked secret, including orphans, and the index", async () => {
    await seed(["a", "b"], ["a", "b", "orphan"], [service("a"), service("b"), service("orphan")]);
    await vault.eraseAllServices();
    expect(secretKeys()).toEqual([]);
    expect(await index()).toBeNull();
    expect(await vault.loadServices()).toEqual([]);
  });

  test("keeps tracking entries it couldn't delete and rejects", async () => {
    await vault.saveServices([service("a"), service("b")]);
    mock.failures.delete.add("service_b");
    await expect(vault.eraseAllServices()).rejects.toThrow();
    expect(await index()).toEqual({ version: 2, order: [], written: ["b"] });
    expect(await vault.loadServices()).toEqual([]);
    expect(secretKeys()).toEqual([]);
  });

  test("leaves PIN and unrelated entries alone", async () => {
    mock.secureStore.set("user_pin_hash", "salt:hash");
    await vault.saveServices([service("a")]);
    await vault.eraseAllServices();
    expect(secretKeys()).toEqual(["user_pin_hash"]);
  });

  test("saving after an erase starts from a clean slate", async () => {
    await vault.saveServices([service("a")]);
    await vault.loadServices();
    await vault.eraseAllServices();
    mock.secureStoreMock.setItemAsync.mockClear();
    await vault.saveServices([service("a")]);
    expect(secretWrites()).toEqual(["service_a"]);
  });
});
