import { lastPass } from "@/core/import/providers/lastPass";

const account = (overrides: object) => ({
  accountID: "id",
  lmiUserId: "",
  userName: "alice@example.com",
  originalUserName: "alice@example.com",
  issuerName: "Amazon",
  originalIssuerName: "Amazon",
  secret: "JBSWY3DPEHPK3PXP",
  algorithm: "SHA1",
  digits: 6,
  timeStep: 30,
  isFavorite: false,
  creationTimestamp: 1700000000000,
  folderData: { folderId: 0, position: 0 },
  ...overrides,
});

const EXPORT = JSON.stringify({
  version: 3,
  deviceName: "Pixel",
  localDeviceId: null,
  folders: [
    { id: 0, name: "Other Accounts", isOpened: true },
    { id: 1, name: "Work", isOpened: true },
  ],
  accounts: [
    account({}),
    account({
      issuerName: "Slack",
      userName: "bob",
      secret: "gezd gnbv gy3t qojq",
      algorithm: "SHA256",
      digits: 8,
      timeStep: 60,
      isFavorite: true,
      folderData: { folderId: 1, position: 0 },
    }),
    account({ issuerName: "", originalIssuerName: "Fallback", userName: "", originalUserName: "carol" }),
    account({ issuerName: "Broken", secret: "" }),
    account({ issuerName: "Invalid", secret: "not base32!" }),
  ],
});

describe("LastPass Authenticator import", () => {
  const entries = lastPass.parse(EXPORT);

  test("maps accounts to TOTP entries", () => {
    expect(entries[0]).toEqual({
      type: "totp",
      account: "alice@example.com",
      issuer: "Amazon",
      secret: "JBSWY3DPEHPK3PXP",
      algorithm: "SHA-1",
      digits: 6,
      period: 30,
    });
  });

  test("keeps favorites and non-default folders in the account and honours parameters", () => {
    expect(entries[1]).toEqual({
      type: "totp",
      account: "⭐ bob [Work]",
      issuer: "Slack",
      secret: "GEZDGNBVGY3TQOJQ",
      algorithm: "SHA-256",
      digits: 8,
      period: 60,
    });
  });

  test("falls back to the original issuer and user names", () => {
    expect(entries[2]).toMatchObject({ issuer: "Fallback", account: "carol" });
  });

  test("skips accounts without a usable secret", () => {
    expect(entries).toHaveLength(3);
  });

  test("rejects files that are not LastPass JSON", () => {
    expect(() => lastPass.parse("otpauth://totp/x?secret=JBSWY3DPEHPK3PXP")).toThrow(/LastPass/);
    expect(() => lastPass.parse('{"items": []}')).toThrow(/missing accounts/);
  });
});
