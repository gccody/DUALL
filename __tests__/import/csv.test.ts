import { parseCsv } from "@/core/import/csv";

describe("parseCsv", () => {
  test("splits simple rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  test("keeps commas, quotes and line breaks inside quoted fields", () => {
    expect(parseCsv('name,notes\n"Acme, Inc.","He said ""hi""\nsecond line"\n')).toEqual([
      ["name", "notes"],
      ["Acme, Inc.", 'He said "hi"\nsecond line'],
    ]);
  });

  test("accepts CRLF and CR line endings and drops empty lines", () => {
    expect(parseCsv("a,b\r\n1,2\r\n\r\n3,4\r5,6\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
      ["5", "6"],
    ]);
  });

  test("preserves empty fields, including a trailing one", () => {
    expect(parseCsv("a,,c,\n,,,")).toEqual([
      ["a", "", "c", ""],
      ["", "", "", ""],
    ]);
  });

  test("strips a UTF-8 BOM", () => {
    expect(parseCsv("﻿name,totp\nx,y")[0]).toEqual(["name", "totp"]);
  });

  test("returns no rows for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});
