import { describe, expect, it } from "vitest";

import { csvCell, egp, toCsv } from "@/lib/csv";

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("SW-4821")).toBe("SW-4821");
    expect(csvCell(42)).toBe("42");
  });

  it("writes nothing for missing values", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes commas, quotes and line breaks so columns cannot shift", () => {
    expect(csvCell("Maadi, Cairo")).toBe('"Maadi, Cairo"');
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvCell("Line one\nLine two")).toBe('"Line one\nLine two"');
  });

  it("defuses cells a spreadsheet would run as a formula", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell("+20 100 000 0000")).toBe("'+20 100 000 0000");
    expect(csvCell("-5")).toBe("'-5");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });
});

describe("toCsv", () => {
  it("starts with a byte-order mark so Excel reads Arabic correctly", () => {
    expect(toCsv(["a"], [["محمد"]]).startsWith("﻿")).toBe(true);
  });

  it("joins rows with CRLF and ends with one", () => {
    expect(toCsv(["a", "b"], [[1, 2]])).toBe("﻿a,b\r\n1,2\r\n");
  });
});

describe("egp", () => {
  it("prints piastres as two-decimal pounds", () => {
    expect(egp(122_000)).toBe("1220.00");
    expect(egp(-5_050)).toBe("-50.50");
    expect(egp(null)).toBe("0.00");
  });
});
