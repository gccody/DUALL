/// <reference types="jest" />
import { Service } from "@/types";
import { FileHandler } from "@/utils/fileHandler";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

const mockSecureStore = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecureStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStore.delete(key);
  }),
}));

const makeService = (uid: string, position: number): Service => ({
  position,
  updatedAt: 0,
  name: `Service ${uid}`,
  uid,
  otp: {
    link: `otpauth://totp/${uid}?secret=JBSWY3DPEHPK3PXP`,
    algorithm: "SHA-1",
    period: 30,
    tokenType: "TOTP",
    issuer: uid,
    digits: 6,
  },
  secret: "JBSWY3DPEHPK3PXP",
});

const secretKeys = () => [...mockSecureStore.keys()].sort();

describe("FileHandler service deletion", () => {
  const services = [makeService("a", 0), makeService("b", 1), makeService("c", 2)];

  beforeEach(async () => {
    mockSecureStore.clear();
    await AsyncStorage.clear();
    await FileHandler.updateServices(services);
  });

  it("stores each service under service_<uid>", () => {
    expect(secretKeys()).toEqual(["service_a", "service_b", "service_c"]);
  });

  it("deletes the secret of a service removed by updateServices", async () => {
    await FileHandler.updateServices([services[0], services[2]]);

    expect(secretKeys()).toEqual(["service_a", "service_c"]);
    const data = await FileHandler.loadData();
    expect(data.services.map((s) => s.uid)).toEqual(["a", "c"]);
  });

  it("deletes all secrets when updateServices is called with an empty list", async () => {
    await FileHandler.updateServices([]);

    expect(secretKeys()).toEqual([]);
    expect((await FileHandler.loadData()).services).toEqual([]);
  });

  it("deletes all secrets and the config on removeData", async () => {
    await FileHandler.removeData();

    expect(secretKeys()).toEqual([]);
    expect(await AsyncStorage.getItem("otpConfig")).toBeNull();
  });
});
