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
