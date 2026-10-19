import { buildExportText, exportFileName } from "@/core/export";
import { parseOtpAuthUri } from "@/core/otp/uri";
import type { Service } from "@/types";

jest.mock("expo-crypto", () => ({ randomUUID: () => "uuid" }));
jest.mock("@/utils/customIconMatcher", () => ({ getCustomIconDomain: () => null }));

const SECRET = "JBSWY3DPEHPK3PXP";

const service = (name: string, issuer: string): Service => ({
  position: 0,
  updatedAt: 0,
  uid: name,
  name,
  secret: SECRET,
  otp: { issuer, algorithm: "SHA-1", digits: 6, period: 30 },
});

describe("buildExportText", () => {
  test("writes one otpauth URI per line, in order", () => {
    const text = buildExportText([service("alice", "Acme"), service("bob", "Globex")]);
    expect(text.split("\n")).toEqual([
      `otpauth://totp/Acme:alice?secret=${SECRET}&issuer=Acme&algorithm=SHA1&digits=6&period=30`,
      `otpauth://totp/Globex:bob?secret=${SECRET}&issuer=Globex&algorithm=SHA1&digits=6&period=30`,
    ]);
  });

  test("lines parse back into the same accounts", () => {
    const text = buildExportText([service("Tom & Jerry", "Acme Corp")]);
    expect(parseOtpAuthUri(text)).toMatchObject({ account: "Tom & Jerry", issuer: "Acme Corp", secret: SECRET });
  });

  test("is empty without services", () => {
    expect(buildExportText([])).toBe("");
  });
});

describe("exportFileName", () => {
  test("includes the ISO timestamp", () => {
    expect(exportFileName(new Date("2026-01-02T03:04:05.000Z"))).toBe("duall-2026-01-02T03:04:05.000Z.txt");
  });
});
