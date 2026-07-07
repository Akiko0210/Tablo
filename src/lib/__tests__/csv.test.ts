import { describe, it, expect } from "vitest";
import { csvEscape, csvRow, buildCsv } from "../csv";

describe("csvEscape", () => {
  it("passes plain values through", () => {
    expect(csvEscape("Margherita")).toBe("Margherita");
    expect(csvEscape(14.5)).toBe("14.5");
    expect(csvEscape(true)).toBe("true");
  });

  it("renders null/undefined/NaN as empty", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
    expect(csvEscape(Number.NaN)).toBe("");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });

  it("defuses spreadsheet formula injection", () => {
    // Defused first, then quoted because of the embedded quotes.
    expect(csvEscape('=HYPERLINK("http://evil")')).toBe(
      '"\'=HYPERLINK(""http://evil"")"',
    );
    expect(csvEscape("=1+2")).toBe("'=1+2");
    expect(csvEscape("+1")).toBe("'+1");
    expect(csvEscape("@cmd")).toBe("'@cmd");
    expect(csvEscape("-2")).toBe("'-2");
    // Negative numbers are numbers, not text — they stay numeric.
    expect(csvEscape(-2)).toBe("-2");
  });
});

describe("csvRow / buildCsv", () => {
  it("joins with commas and ends rows with CRLF", () => {
    expect(csvRow(["a", 1, null])).toBe("a,1,\r\n");
  });

  it("builds header + rows", () => {
    const csv = buildCsv(
      ["item", "qty"],
      [
        ["Margherita", 2],
        ['Large · 16", extra', 1],
      ],
    );
    expect(csv).toBe(
      'item,qty\r\nMargherita,2\r\n"Large · 16"", extra",1\r\n',
    );
  });
});
