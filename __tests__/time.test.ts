/// <reference types="jest" />
import { getTimeRemaining } from "@/utils/time";

describe("getTimeRemaining", () => {
  test("full period at the start of a window", () => {
    expect(getTimeRemaining(60_000, 30_000, 30)).toEqual({ seconds: 30, fraction: 1 });
  });

  test("halfway through a window", () => {
    expect(getTimeRemaining(60_000, 45_000, 30)).toEqual({ seconds: 15, fraction: 0.5 });
  });

  test("rounds displayed seconds up during the final second", () => {
    const { seconds, fraction } = getTimeRemaining(60_000, 59_750, 30);
    expect(seconds).toBe(1);
    expect(fraction).toBeCloseTo(250 / 30_000);
  });

  test("uses the account's period", () => {
    expect(getTimeRemaining(60_000, 30_000, 60)).toEqual({ seconds: 30, fraction: 0.5 });
  });

  test("clamps to zero once expired", () => {
    expect(getTimeRemaining(60_000, 61_000, 30)).toEqual({ seconds: 0, fraction: 0 });
  });

  test("clamps to one period when expires is too far ahead", () => {
    expect(getTimeRemaining(100_000, 0, 30)).toEqual({ seconds: 30, fraction: 1 });
  });

  test.each([undefined, 0, -5, NaN, Infinity])("falls back to 30s for period=%p", (period) => {
    expect(getTimeRemaining(60_000, 45_000, period)).toEqual({ seconds: 15, fraction: 0.5 });
  });
});
