import { twoFas } from "@/core/import/providers/twoFas";

const EXPORT = `otpauth://totp/Twitter:%40jack?secret=JBSWY3DPEHPK3PXP&issuer=Twitter&algorithm=SHA1&digits=6&period=30
otpauth://totp/Microsoft:jane%40outlook.com?secret=GEZDGNBVGY3TQOJQ&issuer=Microsoft&algorithm=SHA256&digits=8&period=60
otpauth://hotp/Yubico:key?secret=MFRGGZDFMZTWQ2LK&issuer=Yubico&counter=12
`;

describe("2FAS import", () => {
  test("parses every otpauth line with its parameters", () => {
    expect(twoFas.parse(EXPORT)).toEqual([
      {
        type: "totp",
        account: "@jack",
        issuer: "Twitter",
        secret: "JBSWY3DPEHPK3PXP",
        algorithm: "SHA-1",
        digits: 6,
        period: 30,
      },
      {
        type: "totp",
        account: "jane@outlook.com",
        issuer: "Microsoft",
        secret: "GEZDGNBVGY3TQOJQ",
        algorithm: "SHA-256",
        digits: 8,
        period: 60,
      },
      {
        type: "hotp",
        account: "key",
        issuer: "Yubico",
        secret: "MFRGGZDFMZTWQ2LK",
        algorithm: "SHA-1",
        digits: 6,
        counter: 12,
      },
    ]);
  });

  test("returns nothing for a file without otpauth lines", () => {
    expect(twoFas.parse("hello\nworld")).toEqual([]);
  });
});

const BACKUP = JSON.stringify({
  services: [
    {
      name: "GitHub",
      secret: "gezd gnbv gy3t qojq",
      otp: { account: "octocat", issuer: "GitHub", digits: 6, period: 30, algorithm: "SHA1", tokenType: "TOTP" },
      order: { position: 1 },
    },
    {
      name: "Proton",
      secret: "JBSWY3DPEHPK3PXP",
      otp: { account: "me@proton.me", digits: 8, period: 60, algorithm: "SHA256", tokenType: "TOTP" },
      order: { position: 0 },
    },
    {
      name: "Yubico",
      secret: "MFRGGZDFMZTWQ2LK",
      otp: { account: "key", issuer: "Yubico", tokenType: "HOTP", counter: 7 },
      order: { position: 2 },
    },
    { name: "Steam", secret: "JBSWY3DPEHPK3PXP", otp: { tokenType: "STEAM" }, order: { position: 3 } },
    { name: "Broken", secret: "not base32!", otp: { tokenType: "TOTP" }, order: { position: 4 } },
  ],
  groups: [],
  schemaVersion: 4,
});

describe("2FAS JSON backup import", () => {
  test("parses services in backup order and falls back to the service name for issuer", () => {
    expect(twoFas.parse(BACKUP)).toEqual([
      {
        type: "totp",
        account: "me@proton.me",
        issuer: "Proton",
        secret: "JBSWY3DPEHPK3PXP",
        algorithm: "SHA-256",
        digits: 8,
        period: 60,
      },
      {
        type: "totp",
        account: "octocat",
        issuer: "GitHub",
        secret: "GEZDGNBVGY3TQOJQ",
        algorithm: "SHA-1",
        digits: 6,
        period: 30,
      },
      {
        type: "hotp",
        account: "key",
        issuer: "Yubico",
        secret: "MFRGGZDFMZTWQ2LK",
        algorithm: "SHA-1",
        digits: 6,
        counter: 7,
      },
    ]);
  });

  test("rejects encrypted backups with a clear message", () => {
    const encrypted = JSON.stringify({ services: [], servicesEncrypted: "abc:def:ghi", schemaVersion: 4 });
    expect(() => twoFas.parse(encrypted)).toThrow(/Encrypted 2FAS backups/);
  });

  test("rejects JSON without a services array", () => {
    expect(() => twoFas.parse("{}")).toThrow(/missing services/);
  });
});
