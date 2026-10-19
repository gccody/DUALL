import { generateTotp } from "@/core/otp/totp";
import { parseOtpAuthUri } from "@/core/otp/uri";

const SECRET = "JBSWY3DPEHPK3PXP";
const base = (params: string, label = "Example:alice@example.com", type = "totp") =>
  `otpauth://${type}/${encodeURIComponent(label)}?secret=${SECRET}${params}`;
const parse = (uri: string) => {
  const parsed = parseOtpAuthUri(uri);
  if (!parsed) throw new Error(`expected ${uri} to parse`);
  return parsed;
};

describe("parseOtpAuthUri", () => {
  test("parses a complete TOTP URI", () => {
    expect(
      parseOtpAuthUri(
        `otpauth://totp/ACME%20Co:john.doe@email.com?secret=${SECRET}&issuer=ACME%20Co&algorithm=SHA256&digits=8&period=60`
      )
    ).toEqual({
      type: "totp",
      account: "john.doe@email.com",
      issuer: "ACME Co",
      secret: SECRET,
      algorithm: "SHA-256",
      digits: 8,
      period: 60,
    });
  });

  test("parses a HOTP URI with its counter", () => {
    expect(parseOtpAuthUri(`otpauth://hotp/Example:bob?secret=${SECRET}&counter=42`)).toEqual({
      type: "hotp",
      account: "bob",
      issuer: "Example",
      secret: SECRET,
      algorithm: "SHA-1",
      digits: 6,
      counter: 42,
    });
  });

  test.each(["", "&counter=abc", "&counter=-1"])("HOTP counter %p defaults to 0", (params) => {
    expect(parse(base(params, "Example:bob", "hotp")).counter).toBe(0);
  });

  describe("algorithm", () => {
    test.each([
      ["SHA1", "SHA-1"],
      ["SHA-1", "SHA-1"],
      ["sha256", "SHA-256"],
      ["SHA256", "SHA-256"],
      ["SHA512", "SHA-512"],
    ])("algorithm=%s -> %s", (input, expected) => {
      expect(parse(base(`&algorithm=${input}`)).algorithm).toBe(expected);
    });

    test("missing algorithm defaults to SHA-1", () => {
      expect(parse(base("")).algorithm).toBe("SHA-1");
    });
  });

  test("accepts an uppercase scheme and type", () => {
    const data = parse(`OTPAUTH://TOTP/Example:alice?secret=${SECRET}`);
    expect(data.type).toBe("totp");
    expect(data.period).toBe(30);
  });

  test("ignores surrounding whitespace", () => {
    expect(parse(`  ${base("")}\r\n`).secret).toBe(SECRET);
  });

  test("prefers the issuer param over the label prefix", () => {
    const data = parse(base("&issuer=Param", "Label:alice"));
    expect(data.issuer).toBe("Param");
    expect(data.account).toBe("alice");
  });

  test("falls back to the label prefix for issuer", () => {
    expect(parse(base("", "Label:alice")).issuer).toBe("Label");
  });

  test("extracts the account from Issuer:account", () => {
    expect(parse(base("", "Example:alice@example.com")).account).toBe("alice@example.com");
  });

  test("trims the optional space after the label colon", () => {
    const data = parse(`otpauth://totp/Example:%20alice?secret=${SECRET}`);
    expect(data).toMatchObject({ issuer: "Example", account: "alice" });
  });

  test("a label without a prefix is the account; issuer comes from the param or is empty", () => {
    expect(parse(base("", "alice"))).toMatchObject({ issuer: "", account: "alice" });
    expect(parse(base("&issuer=Example", "alice"))).toMatchObject({ issuer: "Example", account: "alice" });
  });

  test("uses a literal colon as the separator so encoded colons stay in the issuer", () => {
    const data = parse(`otpauth://totp/a%3Ab:c%3Ad?secret=${SECRET}`);
    expect(data).toMatchObject({ issuer: "a:b", account: "c:d" });
  });

  test("accepts an encoded separator colon", () => {
    const data = parse(`otpauth://totp/Example%3Aalice?secret=${SECRET}`);
    expect(data).toMatchObject({ issuer: "Example", account: "alice" });
  });

  test("decodes '+' in query values as a space", () => {
    expect(parse(base("&issuer=Big+Co", "alice")).issuer).toBe("Big Co");
  });

  test("an empty label is allowed", () => {
    expect(parse(`otpauth://totp/?secret=${SECRET}&issuer=Example`)).toMatchObject({ issuer: "Example", account: "" });
  });

  test("tolerates a malformed percent escape in the label", () => {
    expect(parse(`otpauth://totp/100%?secret=${SECRET}`).account).toBe("100%");
  });

  test.each(["abc", "0", "-1", "", "11", "6.5"])("invalid digits=%p -> 6", (digits) => {
    expect(parse(base(`&digits=${digits}`)).digits).toBe(6);
  });

  test.each([1, 8, 10])("valid digits=%i is kept", (digits) => {
    expect(parse(base(`&digits=${digits}`)).digits).toBe(digits);
  });

  test.each(["abc", "0", "-30", "", "1.5"])("invalid period=%p -> 30", (period) => {
    expect(parse(base(`&period=${period}`)).period).toBe(30);
  });

  test("valid period is kept", () => {
    expect(parse(base("&period=60")).period).toBe(60);
  });

  test("normalizes secrets with spaces, lowercase and padding", () => {
    expect(parse("otpauth://totp/Example:alice?secret=jbsw%20y3dp+ehpk%203pxp").secret).toBe(SECRET);
    expect(parse(`otpauth://totp/Example:alice?secret=${SECRET}%3D%3D`).secret).toBe(SECRET);
  });

  test("parameter names are case-insensitive", () => {
    expect(parse(`otpauth://totp/Example:alice?SECRET=${SECRET}&Digits=8`).digits).toBe(8);
  });

  test("ignores unknown parameters", () => {
    expect(parse(base("&codeDisplay=%7B%22trashed%22%3Afalse%7D&image=x")).secret).toBe(SECRET);
  });

  test.each([
    ["a non-otpauth URL", `https://example.com/?secret=${SECRET}`],
    ["an unsupported type", `otpauth://steam/Example?secret=${SECRET}`],
    ["a migration URI", "otpauth-migration://offline?data=abc"],
    ["a missing secret", "otpauth://totp/Example:alice?issuer=Example"],
    ["an empty secret", "otpauth://totp/Example:alice?secret="],
    ["a non-base32 secret", "otpauth://totp/Example:alice?secret=not-base32!"],
    ["an empty string", ""],
    ["text that only contains a URI", `scan otpauth://totp/Example?secret=${SECRET}`],
  ])("returns null for %s", (_, uri) => {
    expect(parseOtpAuthUri(uri)).toBeNull();
  });

  test("never throws for non-string input", () => {
    expect(parseOtpAuthUri(undefined as unknown as string)).toBeNull();
  });

  test("parsed values can be used to generate a code", () => {
    const data = parse(base("&algorithm=SHA256&digits=8&period=60"));
    const { otp } = generateTotp(
      data.secret,
      { algorithm: data.algorithm, digits: data.digits, period: data.period! },
      59_000
    );
    expect(otp).toMatch(/^\d{8}$/);
  });
});
