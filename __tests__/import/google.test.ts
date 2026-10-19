import { googleAuthenticator } from "@/core/import/providers/google";

const LINES = [
  "otpauth://totp/Google:alice%40gmail.com?secret=JBSWY3DPEHPK3PXP&issuer=Google",
  "",
  "otpauth://totp/GitHub:octocat?secret=gezd gnbv gy3t qojq&issuer=GitHub&algorithm=SHA1&digits=6&period=30",
  "not a uri",
  "otpauth://totp/Broken?issuer=NoSecret",
  "otpauth://hotp/Legacy:bob?secret=MFRGGZDFMZTWQ2LK&counter=3",
].join("\r\n");

describe("Google Authenticator import", () => {
  test("parses one otpauth URI per line, skipping blanks and invalid lines", () => {
    expect(googleAuthenticator.parse(LINES)).toEqual([
      {
        type: "totp",
        account: "alice@gmail.com",
        issuer: "Google",
        secret: "JBSWY3DPEHPK3PXP",
        algorithm: "SHA-1",
        digits: 6,
        period: 30,
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
        account: "bob",
        issuer: "Legacy",
        secret: "MFRGGZDFMZTWQ2LK",
        algorithm: "SHA-1",
        digits: 6,
        counter: 3,
      },
    ]);
  });

  test("parses the JSON accounts[].otpauth shape", () => {
    const json = JSON.stringify({
      accounts: [
        { otpauth: "otpauth://totp/Dropbox:carol?secret=JBSWY3DPEHPK3PXP&issuer=Dropbox&digits=8" },
        { name: "missing link" },
        { otpauth: "https://example.com" },
      ],
    });
    expect(googleAuthenticator.parse(json)).toEqual([
      expect.objectContaining({ issuer: "Dropbox", account: "carol", digits: 8 }),
    ]);
  });

  test("returns nothing for JSON without accounts", () => {
    expect(googleAuthenticator.parse('{"version": 1}')).toEqual([]);
  });

  test("rejects malformed JSON with a descriptive error", () => {
    expect(() => googleAuthenticator.parse("{ nope")).toThrow(/Google Authenticator/);
  });

  test("explains that migration QR payloads are unsupported", () => {
    expect(() => googleAuthenticator.parse("otpauth-migration://offline?data=CjEKCkhlbGxvId6tvu8")).toThrow(
      /otpauth-migration/
    );
  });
});
