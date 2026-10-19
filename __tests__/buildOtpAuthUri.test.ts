import { buildOtpAuthUri, parseOtpAuthUri } from "@/core/otp/uri";
import type { TOTPAlgorithm } from "@/types";

const SECRET = "JBSWY3DPEHPK3PXP";

describe("buildOtpAuthUri", () => {
  test("produces the Key URI format with lowercase type and issuer prefix", () => {
    expect(
      buildOtpAuthUri({
        type: "totp",
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
    const uri = buildOtpAuthUri({ type: "hotp", secret: SECRET, account: "c", counter: 5, digits: 6 });
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
    expect(parsed?.account).toBe(account);
  });
});

describe("parse/build round-trip", () => {
  test.each([
    `otpauth://totp/GitHub:octocat?secret=${SECRET}&issuer=GitHub&algorithm=SHA1&digits=6&period=30`,
    `otpauth://totp/Acme%20Corp:Tom%20%26%20Jerry?secret=${SECRET}&issuer=Acme%20Corp&algorithm=SHA512&digits=8&period=60`,
    `otpauth://hotp/Example:bob?secret=${SECRET}&issuer=Example&algorithm=SHA256&digits=6&counter=7`,
  ])("%s", (uri) => {
    const parsed = parseOtpAuthUri(uri)!;
    expect(buildOtpAuthUri(parsed)).toBe(uri);
    expect(parseOtpAuthUri(buildOtpAuthUri(parsed))).toEqual(parsed);
  });
});
