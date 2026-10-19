import { generateTotp, normalizeAlgorithm } from "@/core/otp/totp";
import base32 from "hi-base32";

// RFC 6238 Appendix B test vectors (8 digits, 30s period). The RFC seeds are
// ASCII strings; the app only handles base32 secrets, so encode them first.
const SEEDS = {
  "SHA-1": base32.encode("12345678901234567890"),
  "SHA-256": base32.encode("12345678901234567890123456789012"),
  "SHA-512": base32.encode("1234567890123456789012345678901234567890123456789012345678901234"),
} as const;

const VECTORS: [number, keyof typeof SEEDS, string][] = [
  [59, "SHA-1", "94287082"],
  [59, "SHA-256", "46119246"],
  [59, "SHA-512", "90693936"],
  [1111111109, "SHA-1", "07081804"],
  [1111111109, "SHA-256", "68084774"],
  [1111111109, "SHA-512", "25091201"],
  [1234567890, "SHA-1", "89005924"],
  [2000000000, "SHA-1", "69279037"],
  [20000000000, "SHA-1", "65353130"],
  [20000000000, "SHA-256", "77737706"],
  [20000000000, "SHA-512", "47863826"],
];

describe("generateTotp", () => {
  test.each(VECTORS)("T=%i %s -> %s", (seconds, algorithm, expected) => {
    const { otp } = generateTotp(SEEDS[algorithm], { algorithm, digits: 8, period: 30 }, seconds * 1000);
    expect(otp).toBe(expected);
  });

  test("truncates to the requested number of digits", () => {
    const { otp } = generateTotp(SEEDS["SHA-1"], { algorithm: "SHA-1", digits: 6, period: 30 }, 59_000);
    expect(otp).toBe("287082");
  });

  test("expires at the end of the current period", () => {
    const { expires } = generateTotp("JBSWY3DPEHPK3PXP", { algorithm: "SHA-1", digits: 6, period: 30 }, 59_000);
    expect(expires).toBe(60_000);
  });

  test("a timestamp on a period boundary belongs to the next window", () => {
    const { expires } = generateTotp("JBSWY3DPEHPK3PXP", { algorithm: "SHA-1", digits: 6, period: 30 }, 60_000);
    expect(expires).toBe(90_000);
  });

  test("honours a custom period", () => {
    const params = { algorithm: "SHA-1", digits: 6, period: 60 } as const;
    expect(generateTotp("JBSWY3DPEHPK3PXP", params, 59_000).expires).toBe(60_000);
    expect(generateTotp("JBSWY3DPEHPK3PXP", params, 30_000).otp).toBe(
      generateTotp("JBSWY3DPEHPK3PXP", params, 59_999).otp
    );
  });

  test("tolerates lowercase, spaced and padded secrets", () => {
    const params = { algorithm: "SHA-1", digits: 6, period: 30 } as const;
    const expected = generateTotp("JBSWY3DPEHPK3PXP", params, 59_000).otp;
    expect(generateTotp("jbsw y3dp ehpk 3pxp", params, 59_000).otp).toBe(expected);
    expect(generateTotp("JBSWY3DPEHPK3PXP====", params, 59_000).otp).toBe(expected);
  });

  test("throws for a secret that is not base32", () => {
    expect(() => generateTotp("not-base32!", { algorithm: "SHA-1", digits: 6, period: 30 })).toThrow();
  });
});

describe("normalizeAlgorithm", () => {
  test.each([
    ["SHA1", "SHA-1"],
    ["SHA-1", "SHA-1"],
    ["sha256", "SHA-256"],
    ["SHA-256", "SHA-256"],
    ["sha-384", "SHA-384"],
    ["SHA512", "SHA-512"],
    ["sha_512", "SHA-512"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeAlgorithm(input)).toBe(expected);
  });

  test.each([undefined, null, "", "MD5", 256])("falls back to SHA-1 for %p", (input) => {
    expect(normalizeAlgorithm(input)).toBe("SHA-1");
  });
});
