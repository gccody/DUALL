import { bitwarden } from "@/core/import/providers/bitwarden";

const JSON_EXPORT = JSON.stringify({
  encrypted: false,
  folders: [],
  items: [
    {
      id: "1",
      type: 1,
      name: "GitHub",
      login: {
        username: "octocat",
        password: "hunter2",
        totp: "otpauth://totp/GitHub:octocat?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&digits=8",
        uris: [{ uri: "https://github.com" }],
      },
    },
    {
      id: "2",
      type: 1,
      name: "AWS",
      login: { username: "admin@corp.com", password: "x", totp: "gezd gnbv gy3t qojq" },
    },
    { id: "3", type: 1, name: "No TOTP", login: { username: "u", password: "p", totp: null } },
    { id: "4", type: 2, name: "Secure note", notes: "hello" },
    { id: "5", type: 1, name: "Steam", login: { username: "gamer", totp: "steam://JBSWY3DPEHPK3PXP" } },
    {
      id: "6",
      type: 1,
      name: "Unlabeled",
      login: { username: "dave", totp: "otpauth://totp/?secret=MFRGGZDFMZTWQ2LK" },
    },
  ],
});

describe("Bitwarden JSON import", () => {
  const entries = bitwarden.parse(JSON_EXPORT);

  test("parses otpauth URIs from login.totp", () => {
    expect(entries[0]).toEqual({
      type: "totp",
      account: "octocat",
      issuer: "GitHub",
      secret: "JBSWY3DPEHPK3PXP",
      algorithm: "SHA-1",
      digits: 8,
      period: 30,
    });
  });

  test("parses bare secrets using the item name and username", () => {
    expect(entries[1]).toEqual({
      type: "totp",
      account: "admin@corp.com",
      issuer: "AWS",
      secret: "GEZDGNBVGY3TQOJQ",
      algorithm: "SHA-1",
      digits: 6,
      period: 30,
    });
  });

  test("fills a missing URI label from the item", () => {
    expect(entries[2]).toMatchObject({ issuer: "Unlabeled", account: "dave", secret: "MFRGGZDFMZTWQ2LK" });
  });

  test("skips items without TOTP and unsupported schemes", () => {
    expect(entries).toHaveLength(3);
  });

  test("rejects JSON without an items array", () => {
    expect(() => bitwarden.parse('{"folders": []}')).toThrow(/missing items/);
  });

  test("explains that encrypted exports are unsupported", () => {
    expect(() => bitwarden.parse('{"encrypted": true, "passwordProtected": true, "data": "x"}')).toThrow(
      /Encrypted Bitwarden exports/
    );
  });
});
