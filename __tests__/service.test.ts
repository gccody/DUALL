import type { ParsedOtpAuth } from "@/core/otp/uri";
import { createService, getTotpParams, isDuplicateService, isSameService, serviceToUri } from "@/core/service";
import type { Service } from "@/types";
import { getCustomIconDomain } from "@/utils/customIconMatcher";

jest.mock("expo-crypto", () => {
  let n = 0;
  return { randomUUID: () => `uuid-${++n}` };
});
jest.mock("@/utils/customIconMatcher", () => ({
  getCustomIconDomain: jest.fn(() => null),
}));

const mockedIconDomain = jest.mocked(getCustomIconDomain);
const SECRET = "JBSWY3DPEHPK3PXP";

const parsed = (overrides: Partial<ParsedOtpAuth> = {}): ParsedOtpAuth => ({
  type: "totp",
  account: "alice@example.com",
  issuer: "Example",
  secret: SECRET,
  algorithm: "SHA-256",
  digits: 8,
  period: 60,
  ...overrides,
});

function makeService(overrides: Partial<Service> = {}, otp: Partial<Service["otp"]> = {}): Service {
  return {
    position: 0,
    updatedAt: 0,
    uid: "uid",
    name: "alice@example.com",
    secret: SECRET,
    ...overrides,
    otp: {
      algorithm: "SHA-1",
      period: 30,
      issuer: "Example",
      digits: 6,
      ...otp,
    },
  };
}

/** Simulates data persisted by older app versions. */
const legacy = (otp: Record<string, unknown>) => makeService({}, otp as Partial<Service["otp"]>);

describe("createService", () => {
  beforeEach(() => mockedIconDomain.mockReset().mockReturnValue(null));

  test("maps parsed otpauth data onto a Service", () => {
    jest.spyOn(Date, "now").mockReturnValueOnce(1234);
    const service = createService(parsed(), 3);
    expect(service).toEqual({
      position: 3,
      updatedAt: 1234,
      name: "alice@example.com",
      uid: expect.stringMatching(/^uuid-/),
      secret: SECRET,
      otp: { issuer: "Example", algorithm: "SHA-256", digits: 8, period: 60 },
    });
    expect(service).not.toHaveProperty("icon");
  });

  test("does not store a link or token type", () => {
    const service = createService(parsed(), 0);
    expect(service.otp).not.toHaveProperty("link");
    expect(service.otp).not.toHaveProperty("tokenType");
  });

  test("assigns a fresh uid to every service", () => {
    expect(createService(parsed(), 0).uid).not.toBe(createService(parsed(), 0).uid);
  });

  test("defaults the period to 30 when the parsed entry has none", () => {
    expect(createService(parsed({ period: undefined }), 0).otp.period).toBe(30);
  });

  test("attaches the auto-matched icon", () => {
    mockedIconDomain.mockReturnValue("github.com");
    const service = createService(parsed({ issuer: "GitHub" }), 0);
    expect(mockedIconDomain).toHaveBeenCalledWith(expect.objectContaining({ otp: expect.objectContaining({ issuer: "GitHub" }) }));
    expect(service.icon).toEqual({ label: "github.com" });
  });
});

describe("isSameService / isDuplicateService", () => {
  const existing = [makeService({ uid: "a" }), makeService({ uid: "b", name: "bob" }, { issuer: "Other" })];

  test("matches name and issuer case-insensitively with the same secret", () => {
    const candidate = makeService({ uid: "new", name: "ALICE@example.com" }, { issuer: "EXAMPLE" });
    expect(isSameService(existing[0], candidate)).toBe(true);
    expect(isDuplicateService(existing, candidate)).toBe(true);
  });

  test.each<[string, Partial<Service>, Partial<Service["otp"]>]>([
    ["a different secret", { secret: "GEZDGNBVGY3TQOJQ" }, {}],
    ["a different name", { name: "carol" }, {}],
    ["a different issuer", {}, { issuer: "Elsewhere" }],
  ])("is not a duplicate with %s", (_, overrides, otp) => {
    expect(isDuplicateService(existing, makeService(overrides, otp))).toBe(false);
  });

  test("ignores TOTP parameters", () => {
    expect(isDuplicateService(existing, makeService({}, { digits: 8, period: 60 }))).toBe(true);
  });

  test("an empty list has no duplicates", () => {
    expect(isDuplicateService([], makeService())).toBe(false);
  });
});

describe("getTotpParams", () => {
  test("returns the stored parameters", () => {
    expect(getTotpParams(makeService({}, { algorithm: "SHA-512", digits: 8, period: 60 }))).toEqual({
      algorithm: "SHA-512",
      digits: 8,
      period: 60,
    });
  });

  test.each([
    ["SHA1", "SHA-1"],
    ["sha256", "SHA-256"],
    ["SHA512", "SHA-512"],
    ["bogus", "SHA-1"],
    [undefined, "SHA-1"],
  ])("normalizes legacy algorithm %p -> %s", (algorithm, expected) => {
    expect(getTotpParams(legacy({ algorithm })).algorithm).toBe(expected);
  });

  test.each([undefined, null, 0, -30, NaN, 1.5, "abc"])("invalid period %p -> 30", (period) => {
    expect(getTotpParams(legacy({ period })).period).toBe(30);
  });

  test("accepts a numeric string period", () => {
    expect(getTotpParams(legacy({ period: "60" })).period).toBe(60);
  });

  test.each([undefined, 0, 11, 6.5, "x"])("invalid digits %p -> 6", (digits) => {
    expect(getTotpParams(legacy({ digits })).digits).toBe(6);
  });

  test("handles a service without otp data", () => {
    const service = { ...makeService(), otp: undefined } as unknown as Service;
    expect(getTotpParams(service)).toEqual({ algorithm: "SHA-1", digits: 6, period: 30 });
  });
});

describe("serviceToUri", () => {
  test("builds a spec-compliant URI from a Service", () => {
    const uri = serviceToUri(makeService({ name: "Tom & Jerry" }, { issuer: "Acme Corp", algorithm: "SHA-512" }));
    expect(uri).toBe(
      `otpauth://totp/Acme%20Corp:Tom%20%26%20Jerry?secret=${SECRET}&issuer=Acme%20Corp&algorithm=SHA512&digits=6&period=30`
    );
  });

  test("emits normalized parameters for legacy data", () => {
    const uri = serviceToUri(legacy({ algorithm: "sha256", period: undefined, link: "otpauth://totp/stale?secret=OLD" }));
    expect(uri).not.toContain("undefined");
    expect(uri).not.toContain("stale");
    expect(uri).toContain("algorithm=SHA256");
    expect(uri).toContain("period=30");
  });

  test("reflects edits made after creation", () => {
    const service = createService(parsed(), 0);
    const edited = { ...service, name: "renamed", otp: { ...service.otp, issuer: "NewCo" } };
    expect(serviceToUri(edited)).toBe(
      `otpauth://totp/NewCo:renamed?secret=${SECRET}&issuer=NewCo&algorithm=SHA256&digits=8&period=60`
    );
  });

  test("does not double the issuer prefix for legacy imported names", () => {
    const uri = serviceToUri(makeService({ name: "Acme:alice" }, { issuer: "Acme" }));
    expect(uri.startsWith("otpauth://totp/Acme:alice?")).toBe(true);
  });
});
