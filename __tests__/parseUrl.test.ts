/// <reference types="jest" />
import { TOTP } from "@/TOTP";

const SECRET = "JBSWY3DPEHPK3PXP";
const base = (params: string, label = "Example:alice@example.com", type = "totp") =>
  `otpauth://${type}/${encodeURIComponent(label)}?secret=${SECRET}${params}`;

describe("TOTP.parseUrl", () => {
  describe("algorithm", () => {
    test.each([
      ["SHA1", "SHA-1"],
      ["SHA-1", "SHA-1"],
      ["sha256", "SHA-256"],
      ["SHA256", "SHA-256"],
      ["SHA512", "SHA-512"],
    ])("algorithm=%s -> %s", (input, expected) => {
      expect(TOTP.parseUrl(base(`&algorithm=${input}`)).algorithm).toBe(expected);
    });

    test("missing algorithm defaults to SHA-1", () => {
      expect(TOTP.parseUrl(base("")).algorithm).toBe("SHA-1");
    });
  });

  test("accepts an uppercase type", () => {
    const data = TOTP.parseUrl(base("", "Example:alice", "TOTP"));
    expect(data.type).toBe("totp");
    expect(data.period).toBe(30);
  });

  test("prefers the issuer param over the label prefix", () => {
    const data = TOTP.parseUrl(base("&issuer=Param", "Label:alice"));
    expect(data.issuer).toBe("Param");
    expect(data.account).toBe("alice");
  });

  test("falls back to the label prefix for issuer", () => {
    const data = TOTP.parseUrl(base("", "Label:alice"));
    expect(data.issuer).toBe("Label");
  });

  test("extracts the account from Issuer:account", () => {
    const data = TOTP.parseUrl(base("", "Example:alice@example.com"));
    expect(data.account).toBe("alice@example.com");
  });

  test.each(["abc", "0", "-1", ""])("invalid digits=%p -> 6", (digits) => {
    expect(TOTP.parseUrl(base(`&digits=${digits}`)).digits).toBe(6);
  });

  test("valid digits are kept", () => {
    expect(TOTP.parseUrl(base("&digits=8")).digits).toBe(8);
  });

  test.each(["abc", "0", "-30", ""])("invalid period=%p -> 30", (period) => {
    expect(TOTP.parseUrl(base(`&period=${period}`)).period).toBe(30);
  });

  test("valid period is kept", () => {
    expect(TOTP.parseUrl(base("&period=60")).period).toBe(60);
  });

  test("normalizes secrets with spaces and lowercase", () => {
    const data = TOTP.parseUrl("otpauth://totp/Example:alice?secret=jbsw%20y3dp+ehpk%203pxp");
    expect(data.secret).toBe(SECRET);
  });

  test("throws for non-otpauth URLs", () => {
    expect(() => TOTP.parseUrl("https://example.com/?secret=" + SECRET)).toThrow();
  });

  test("throws when the secret is missing", () => {
    expect(() => TOTP.parseUrl("otpauth://totp/Example:alice?issuer=Example")).toThrow(
      /secret/
    );
  });

  test("parsed values can be used to generate a code", () => {
    const data = TOTP.parseUrl(base("&algorithm=SHA256&digits=8&period=60"));
    const { otp } = TOTP.generate(data.secret, {
      algorithm: data.algorithm,
      digits: data.digits,
      period: data.period,
      timestamp: 59_000,
    });
    expect(otp).toMatch(/^\d{8}$/);
  });
});
