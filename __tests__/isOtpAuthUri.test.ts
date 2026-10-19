import { isOtpAuthUri } from "@/core/otp/uri";

describe("isOtpAuthUri", () => {
  it.each([
    "otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example",
    "otpauth://hotp/Example?secret=JBSWY3DPEHPK3PXP&counter=0",
    "OTPAUTH://TOTP/Example?secret=JBSWY3DPEHPK3PXP",
    "  otpauth://totp/Example?secret=JBSWY3DPEHPK3PXP\n",
  ])("accepts %j", (value) => {
    expect(isOtpAuthUri(value)).toBe(true);
  });

  it.each([
    "",
    "https://example.com",
    "otpauth-migration://offline?data=abc",
    "otpauth:/totp/Example",
    "WIFI:S:network;T:WPA;P:password;;",
    "hello otpauth://totp/Example",
  ])("rejects %j", (value) => {
    expect(isOtpAuthUri(value)).toBe(false);
  });
});
