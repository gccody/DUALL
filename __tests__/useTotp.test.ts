import { generateTotp, type TotpParams } from "@/core/otp/totp";
import { computePeriodCodes, getPeriodCounter, TOTP_ERROR_CODE } from "@/hooks/useTotp";

// useTotp reads params through core/service, which pulls in native modules.
jest.mock("expo-crypto", () => ({}));

const SECRET = "JBSWY3DPEHPK3PXP";
const PARAMS: TotpParams = { algorithm: "SHA-1", digits: 6, period: 30 };

describe("getPeriodCounter", () => {
  test("counts whole periods since the epoch", () => {
    expect(getPeriodCounter(0, 30)).toBe(0);
    expect(getPeriodCounter(29_999, 30)).toBe(0);
    expect(getPeriodCounter(30_000, 30)).toBe(1);
    expect(getPeriodCounter(119_999, 60)).toBe(1);
  });

  test("matches the time step generateTotp uses", () => {
    const now = 1_700_000_012_345;
    const counter = getPeriodCounter(now, 30);
    expect(computePeriodCodes(SECRET, PARAMS, counter).code).toBe(generateTotp(SECRET, PARAMS, now).otp);
  });
});

describe("computePeriodCodes", () => {
  test("returns the period's code, the next period's code and the expiry", () => {
    const result = computePeriodCodes(SECRET, PARAMS, 10);
    expect(result).toEqual({
      code: generateTotp(SECRET, PARAMS, 300_000).otp,
      nextCode: generateTotp(SECRET, PARAMS, 330_000).otp,
      expires: 330_000,
      error: false,
    });
  });

  test("the next code becomes the code of the following period", () => {
    expect(computePeriodCodes(SECRET, PARAMS, 11).code).toBe(computePeriodCodes(SECRET, PARAMS, 10).nextCode);
  });

  test("honours the account's period and digits", () => {
    const params: TotpParams = { algorithm: "SHA-256", digits: 8, period: 60 };
    const result = computePeriodCodes(SECRET, params, 3);
    expect(result.code).toHaveLength(8);
    expect(result.code).toBe(generateTotp(SECRET, params, 180_000).otp);
    expect(result.expires).toBe(240_000);
  });

  test("reports an invalid secret instead of throwing", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(computePeriodCodes("not-base32!", PARAMS, 1)).toEqual({
      code: TOTP_ERROR_CODE,
      nextCode: "",
      expires: 60_000,
      error: true,
    });
    spy.mockRestore();
  });
});
