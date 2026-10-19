import type { ParsedOtpAuth } from "@/core/otp/uri";
import { addService, mergeImported, reindex, removeService, updateService } from "@/core/vault";
import type { Service } from "@/types";

jest.mock("expo-crypto", () => {
  let n = 0;
  return { randomUUID: () => `uuid-${++n}` };
});
jest.mock("@/utils/customIconMatcher", () => ({
  getCustomIconDomain: jest.fn(() => null),
}));

const parsed = (account: string, overrides: Partial<ParsedOtpAuth> = {}): ParsedOtpAuth => ({
  type: "totp",
  account,
  issuer: "Example",
  secret: "JBSWY3DPEHPK3PXP",
  algorithm: "SHA-1",
  digits: 6,
  period: 30,
  ...overrides,
});

const service = (uid: string, position: number, overrides: Partial<Service> = {}): Service => ({
  uid,
  position,
  updatedAt: 0,
  name: uid,
  secret: "JBSWY3DPEHPK3PXP",
  otp: { issuer: "Example", algorithm: "SHA-1", digits: 6, period: 30 },
  ...overrides,
});

describe("addService", () => {
  test("appends a new service at the end with the next position", () => {
    const list = [service("a", 0), service("b", 1)];
    const result = addService(list, parsed("carol"));
    expect(result.duplicate).toBe(false);
    expect(result.index).toBe(2);
    expect(result.list).toHaveLength(3);
    expect(result.list[2]).toMatchObject({ name: "carol", position: 2, otp: { issuer: "Example" } });
  });

  test("does not mutate the input list", () => {
    const list = [service("a", 0)];
    addService(list, parsed("carol"));
    expect(list).toHaveLength(1);
  });

  test("reports a duplicate with the index of the existing service", () => {
    const list = [service("a", 0), service("bob", 1)];
    const result = addService(list, parsed("BOB", { issuer: "example" }));
    expect(result).toEqual({ list, index: 1, duplicate: true });
  });

  test("adds into an empty list", () => {
    const result = addService([], parsed("x"));
    expect(result.index).toBe(0);
    expect(result.list[0].position).toBe(0);
  });
});

describe("mergeImported", () => {
  test("appends new entries with consecutive positions", () => {
    const list = [service("a", 0)];
    const result = mergeImported(list, [parsed("x"), parsed("y")]);
    expect(result.added).toBe(2);
    expect(result.duplicates).toBe(0);
    expect(result.list.map((s) => [s.name, s.position])).toEqual([
      ["a", 0],
      ["x", 1],
      ["y", 2],
    ]);
  });

  test("skips entries that already exist", () => {
    const list = [service("x", 0)];
    const result = mergeImported(list, [parsed("x"), parsed("y")]);
    expect(result.added).toBe(1);
    expect(result.duplicates).toBe(1);
    expect(result.list.map((s) => s.name)).toEqual(["x", "y"]);
  });

  test("skips duplicates within the same batch", () => {
    const result = mergeImported([], [parsed("x"), parsed("X"), parsed("y"), parsed("y")]);
    expect(result.added).toBe(2);
    expect(result.duplicates).toBe(2);
    expect(result.list.map((s) => s.name)).toEqual(["x", "y"]);
  });

  test("treats the same account with a different secret as distinct", () => {
    const result = mergeImported([service("x", 0)], [parsed("x", { secret: "GEZDGNBVGY3TQOJQ" })]);
    expect(result.added).toBe(1);
  });

  test("ignores HOTP entries", () => {
    const result = mergeImported([], [parsed("h", { type: "hotp", period: undefined, counter: 0 })]);
    expect(result).toEqual({ list: [], added: 0, duplicates: 0 });
  });

  test("an empty batch returns an equal list", () => {
    const list = [service("a", 0)];
    expect(mergeImported(list, [])).toEqual({ list, added: 0, duplicates: 0 });
  });
});

describe("updateService", () => {
  const list = [service("a", 0), service("b", 1, { icon: { label: "github.com" } })];

  test("patches name and bumps updatedAt", () => {
    const result = updateService(list, "a", { name: "renamed" }, 42);
    expect(result[0]).toEqual({ ...list[0], name: "renamed", updatedAt: 42 });
    expect(result[1]).toBe(list[1]);
  });

  test("merges otp fields shallowly", () => {
    const result = updateService(list, "a", { otp: { issuer: "NewCo" } }, 1);
    expect(result[0].otp).toEqual({ ...list[0].otp, issuer: "NewCo" });
  });

  test("sets the icon, including the 'none' sentinel", () => {
    expect(updateService(list, "b", { icon: { label: "none" } }, 1)[1].icon).toEqual({ label: "none" });
  });

  test("leaves fields absent from the patch untouched", () => {
    const result = updateService(list, "b", { name: "x" }, 1);
    expect(result[1].icon).toEqual({ label: "github.com" });
    expect(result[1].secret).toBe(list[1].secret);
    expect(result[1].uid).toBe("b");
  });

  test("an unknown uid changes nothing", () => {
    expect(updateService(list, "zzz", { name: "x" }, 1)).toEqual(list);
  });

  test("does not mutate the input", () => {
    updateService(list, "a", { name: "renamed", otp: { issuer: "X" } }, 1);
    expect(list[0].name).toBe("a");
    expect(list[0].otp.issuer).toBe("Example");
  });

  test("defaults updatedAt to now", () => {
    jest.spyOn(Date, "now").mockReturnValueOnce(777);
    expect(updateService(list, "a", {})[0].updatedAt).toBe(777);
  });
});

describe("removeService / reindex", () => {
  test("removes the service and renumbers positions", () => {
    const list = [service("a", 0), service("b", 1), service("c", 2)];
    const result = removeService(list, "a");
    expect(result.map((s) => [s.uid, s.position])).toEqual([
      ["b", 0],
      ["c", 1],
    ]);
  });

  test("keeps services that are already in place", () => {
    const list = [service("a", 0), service("b", 1), service("c", 2)];
    const result = removeService(list, "c");
    expect(result[0]).toBe(list[0]);
    expect(result[1]).toBe(list[1]);
  });

  test("an unknown uid leaves the list as is", () => {
    const list = [service("a", 0)];
    expect(removeService(list, "zzz")).toEqual(list);
  });

  test("reindex fixes gaps left by older versions", () => {
    const result = reindex([service("a", 3), service("b", 7)]);
    expect(result.map((s) => s.position)).toEqual([0, 1]);
  });
});
