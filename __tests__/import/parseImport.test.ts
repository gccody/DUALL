import { importProviders, parseImport } from "@/core/import";

const TOTP = "otpauth://totp/GitHub:octocat?secret=JBSWY3DPEHPK3PXP&issuer=GitHub";
const HOTP = "otpauth://hotp/Yubico:key?secret=MFRGGZDFMZTWQ2LK&counter=1";

describe("importProviders", () => {
  test("exposes every provider with a unique id", () => {
    const ids = importProviders.map((provider) => provider.id);
    expect(ids).toEqual(["google-auth", "2fas", "bitwarden", "ente", "lastpass"]);
    expect(importProviders.every((provider) => provider.displayName.length > 0)).toBe(true);
  });
});

describe("parseImport", () => {
  test("returns TOTP entries", () => {
    const result = parseImport("2fas", TOTP);
    expect(result.skippedHotp).toBe(0);
    expect(result.services).toEqual([expect.objectContaining({ type: "totp", issuer: "GitHub" })]);
  });

  test("filters out and counts HOTP entries", () => {
    const result = parseImport("google-auth", [HOTP, TOTP, HOTP].join("\n"));
    expect(result.services).toHaveLength(1);
    expect(result.services.every((entry) => entry.type === "totp")).toBe(true);
    expect(result.skippedHotp).toBe(2);
  });

  test("counts HOTP entries from Ente exports too", () => {
    expect(parseImport("ente", `${TOTP}\n${HOTP}`).skippedHotp).toBe(1);
  });

  test("throws when a file only has HOTP entries", () => {
    expect(() => parseImport("2fas", HOTP)).toThrow(/HOTP/);
  });

  test("throws a descriptive error when nothing valid is found", () => {
    expect(() => parseImport("2fas", "nothing here")).toThrow(/No valid 2FAS codes found/);
  });

  test("propagates provider errors", () => {
    expect(() => parseImport("lastpass", "not json")).toThrow(/LastPass/);
  });

  test("throws for an unknown provider", () => {
    expect(() => parseImport("authy", TOTP)).toThrow(/Unknown import provider/);
  });
});
