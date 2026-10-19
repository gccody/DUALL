/// <reference types="jest" />
import { convertToService, parseLabel, parseOtpAuthUri } from "@/parsers/utils";
import type { Service, TOTPAlgorithm } from "@/types";
import { buildOtpAuthUri, generateTOTPUrl } from "@/utils";

jest.mock("expo-crypto", () => ({ randomUUID: () => "test-uuid" }));

const SECRET = "JBSWY3DPEHPK3PXP";

function makeService(overrides: Partial<Service> = {}, otp: Partial<Service["otp"]> = {}): Service {
  return {
    position: 0,
    updatedAt: 0,
    uid: "uid",
    name: "alice@example.com",
    secret: SECRET,
    ...overrides,
    otp: {
      link: "",
      algorithm: "SHA-1",
      period: 30,
      tokenType: "TOTP",
      issuer: "Example",
      digits: 6,
      ...otp,
    },
  };
}

describe("buildOtpAuthUri", () => {
  test("produces the Key URI format with lowercase type and issuer prefix", () => {
    expect(
      buildOtpAuthUri({
        type: "TOTP",
        secret: SECRET,
        account: "alice@example.com",
        issuer: "Example",
        algorithm: "SHA-1",
        digits: 6,
        period: 30,
      })
    ).toBe(
      `otpauth://totp/Example:alice%40example.com?secret=${SECRET}&issuer=Example&algorithm=SHA1&digits=6&period=30`
    );
  });

  test.each<[TOTPAlgorithm, string]>([
    ["SHA-1", "SHA1"],
    ["SHA-256", "SHA256"],
    ["SHA-384", "SHA384"],
    ["SHA-512", "SHA512"],
  ])("maps %s to %s and round-trips", (algorithm, expected) => {
    const uri = buildOtpAuthUri({ type: "totp", secret: SECRET, account: "a", algorithm, digits: 6, period: 30 });
    expect(uri).toContain(`algorithm=${expected}`);
    expect(uri).not.toContain("SHA-");
    expect(parseOtpAuthUri(uri)?.algorithm).toBe(algorithm);
  });

  test("omits issuer prefix and param when issuer is empty", () => {
    const uri = buildOtpAuthUri({ type: "totp", secret: SECRET, account: "bob", issuer: "", digits: 6, period: 30 });
    expect(uri).toBe(`otpauth://totp/bob?secret=${SECRET}&digits=6&period=30`);
    expect(uri).not.toContain("issuer");
  });

  test("never emits undefined values", () => {
    const uri = buildOtpAuthUri({ type: "totp", secret: SECRET, account: "bob" });
    expect(uri).not.toContain("undefined");
    expect(uri).not.toContain("period=");
    expect(uri).toBe(`otpauth://totp/bob?secret=${SECRET}`);
  });

  test("does not double the issuer prefix when the account already has it", () => {
    const uri = buildOtpAuthUri({ type: "totp", secret: SECRET, account: "GitHub:octocat", issuer: "GitHub" });
    expect(uri.startsWith("otpauth://totp/GitHub:octocat?")).toBe(true);
  });

  test("includes counter for hotp", () => {
    const uri = buildOtpAuthUri({ type: "HOTP", secret: SECRET, account: "c", counter: 5, digits: 6 });
    expect(uri.startsWith("otpauth://hotp/")).toBe(true);
    expect(parseOtpAuthUri(uri)?.counter).toBe(5);
  });

  test.each([
    ["Tom & Jerry", "Acme Corp"],
    ["a:b/c?d#e", "My Issuer"],
    ["user name+tag@example.com", "Big & Co. Ltd"],
    ["José 日本語 🙂", "Ünïcödé Bank"],
    ["100% legit", "50/50"],
  ])("round-trips account %j with issuer %j", (account, issuer) => {
    const uri = buildOtpAuthUri({ type: "totp", secret: SECRET, account, issuer, algorithm: "SHA-256", digits: 8, period: 60 });
    // Only the single separator colon may appear unencoded in the label
    const path = uri.slice("otpauth://totp/".length, uri.indexOf("?"));
    expect(path.split(":")).toHaveLength(2);
    expect(uri).not.toMatch(/[ #]/);

    const parsed = parseOtpAuthUri(uri);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("totp");
    expect(parsed?.secret).toBe(SECRET);
    expect(parsed?.issuer).toBe(issuer);
    expect(parsed?.algorithm).toBe("SHA-256");
    expect(parsed?.digits).toBe(8);
    expect(parsed?.period).toBe(60);
    expect(parseLabel(parsed!.label)).toEqual({ issuer, account });
  });
});

describe("generateTOTPUrl", () => {
  test("builds a spec-compliant URI from a Service", () => {
    const uri = generateTOTPUrl(makeService({ name: "Tom & Jerry" }, { issuer: "Acme Corp", algorithm: "SHA-512" }));
    expect(uri).toBe(
      `otpauth://totp/Acme%20Corp:Tom%20%26%20Jerry?secret=${SECRET}&issuer=Acme%20Corp&algorithm=SHA512&digits=6&period=30`
    );
  });

  test("omits period when undefined", () => {
    const uri = generateTOTPUrl(makeService({}, { period: undefined }));
    expect(uri).not.toContain("undefined");
    expect(uri).not.toContain("period=");
  });
});

describe("convertToService", () => {
  test("stores a spec-compliant otp.link", () => {
    const service = convertToService({
      type: "totp",
      label: "Acme:alice",
      secret: SECRET,
      issuer: "Acme",
      algorithm: "SHA-256",
      digits: 6,
      period: 30,
    });
    expect(service.otp.link).toBe(
      `otpauth://totp/Acme:alice?secret=${SECRET}&issuer=Acme&algorithm=SHA256&digits=6&period=30`
    );
  });
});
