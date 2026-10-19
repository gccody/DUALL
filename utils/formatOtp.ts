/**
 * Splits a code into two display groups (6 -> 3+3, 7 -> 4+3, 8 -> 4+4).
 * Codes shorter than 6 characters are left as a single group.
 */
function groupOtp(code: string): string[] {
  if (code.length < 6) return [code];
  const mid = Math.ceil(code.length / 2);
  return [code.slice(0, mid), code.slice(mid)];
}

/**
 * Formats a numeric OTP code for display, e.g. "123456" -> "123 456".
 * Non-numeric values (placeholders, errors) are returned unchanged.
 */
export function formatOtp(code: string): string {
  if (!/^\d+$/.test(code)) return code;
  return groupOtp(code).join(" ");
}

/**
 * Builds the hidden-token mask for a code of the given length,
 * e.g. 6 -> "• • •  • • •".
 */
export function maskOtp(digits: number): string {
  return groupOtp("•".repeat(digits))
    .map((group) => group.split("").join(" "))
    .join("  ");
}
