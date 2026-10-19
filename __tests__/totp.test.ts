import { TOTP } from "@/TOTP";

// RFC 6238 Appendix B test vectors (8 digits, 30s period)
const SEEDS = {
  "SHA-1": "12345678901234567890",
  "SHA-256": "12345678901234567890123456789012",
  "SHA-512": "1234567890123456789012345678901234567890123456789012345678901234",
} as const;

const VECTORS: [number, keyof typeof SEEDS, string][] = [
  [59, "SHA-1", "94287082"],
  [59, "SHA-256", "46119246"],
  [59, "SHA-512", "90693936"],
  [1111111109, "SHA-1", "07081804"],
  [1111111109, "SHA-256", "68084774"],
  [1111111109, "SHA-512", "25091201"],
  [20000000000, "SHA-1", "65353130"],
  [20000000000, "SHA-256", "77737706"],
  [20000000000, "SHA-512", "47863826"],
];

describe("TOTP.generate", () => {
  test.each(VECTORS)("T=%i %s -> %s", (seconds, algorithm, expected) => {
    const { otp } = TOTP.generate(SEEDS[algorithm], {
      encoding: "ascii",
      digits: 8,
      algorithm,
      timestamp: seconds * 1000,
    });
    expect(otp).toBe(expected);
  });

  test("expires at the end of the current period", () => {
    const { expires } = TOTP.generate("JBSWY3DPEHPK3PXP", { timestamp: 59_000 });
    expect(expires).toBe(60_000);
  });
});
