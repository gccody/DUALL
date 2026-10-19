import { describe, expect, test } from "@jest/globals";
import { formatOtp, maskOtp } from "@/utils/formatOtp";

describe("formatOtp", () => {
  test.each([
    ["123456", "123 456"],
    ["1234567", "1234 567"],
    ["12345678", "1234 5678"],
    ["12345", "12345"],
  ])("%s -> %s", (code, expected) => {
    expect(formatOtp(code)).toBe(expected);
  });

  test("leaves non-numeric values unchanged", () => {
    expect(formatOtp("Error!")).toBe("Error!");
    expect(formatOtp("------")).toBe("------");
  });
});

describe("maskOtp", () => {
  test.each([
    [6, "• • •  • • •"],
    [7, "• • • •  • • •"],
    [8, "• • • •  • • • •"],
  ])("%i digits -> %s", (digits, expected) => {
    expect(maskOtp(digits)).toBe(expected);
  });
});
