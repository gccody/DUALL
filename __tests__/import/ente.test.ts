import { ente } from "@/core/import/providers/ente";

const display = (value: object) => encodeURIComponent(JSON.stringify(value));

const EXPORT = [
  `otpauth://totp/GitHub:octocat?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=sha1&digits=6&period=30&codeDisplay=${display({
    pinned: true,
    trashed: false,
    lastUsedAt: 0,
    tapCount: 4,
    tags: ["work", "dev"],
    note: "",
    position: 0,
    iconSrc: "",
    iconID: "",
  })}`,
  `otpauth://totp/Old:account?secret=GEZDGNBVGY3TQOJQ&issuer=Old&codeDisplay=${display({ trashed: true, tags: [] })}`,
  `otpauth://totp/Proton:me%40proton.me?codeDisplay=${display({ trashed: false, tags: [] })}&secret=MFRGGZDFMZTWQ2LK&issuer=Proton&digits=8&period=60`,
  "otpauth://totp/Plain:entry?secret=JBSWY3DPEHPK3PXP&issuer=Plain",
  "otpauth://totp/BadMeta:entry?secret=JBSWY3DPEHPK3PXP&issuer=BadMeta&codeDisplay=%7Bnot-json",
  "",
].join("\n");

describe("Ente Auth import", () => {
  const entries = ente.parse(EXPORT);

  test("skips trashed entries", () => {
    expect(entries.map((entry) => entry.issuer)).toEqual(["GitHub", "Proton", "Plain", "BadMeta"]);
  });

  test("appends tags to the account", () => {
    expect(entries[0]).toEqual({
      type: "totp",
      account: "octocat [work, dev]",
      issuer: "GitHub",
      secret: "JBSWY3DPEHPK3PXP",
      algorithm: "SHA-1",
      digits: 6,
      period: 30,
    });
  });

  test("handles codeDisplay as the first query parameter", () => {
    expect(entries[1]).toMatchObject({ account: "me@proton.me", secret: "MFRGGZDFMZTWQ2LK", digits: 8, period: 60 });
  });

  test("imports entries without or with unreadable metadata", () => {
    expect(entries[2]).toMatchObject({ account: "entry", issuer: "Plain" });
    expect(entries[3]).toMatchObject({ account: "entry", issuer: "BadMeta" });
  });

  test("rejects encrypted exports with a descriptive error", () => {
    const encrypted = JSON.stringify({
      version: 1,
      kdfParams: { memLimit: 1, opsLimit: 1, salt: "c2FsdA==" },
      encryptedData: "Y2lwaGVy",
      encryptionNonce: "bm9uY2U=",
    });
    expect(() => ente.parse(encrypted)).toThrow(/encrypted exports are not supported/);
  });
});
