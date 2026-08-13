import { describe, expect, it } from "vitest";
import { parseBlockConfig } from "../../core/parseBlockConfig";

describe("parseBlockConfig (JSON)", () => {
  it("parses required fields", () => {
    const cfg = parseBlockConfig('{"date":"2026-03-14"}');
    expect(cfg.date).toBe("2026-03-14");
  });

  it("rejects invalid date", () => {
    expect(() => parseBlockConfig('{"date":"2026/03/14"}')).toThrow(/date/i);
  });

  it("rejects empty string", () => {
    expect(() => parseBlockConfig('')).toThrow(/empty/i);
  });

  it("rejects invalid json", () => {
    const input = '{"date":"2026-03-14"'; // No closing },
    expect(() => parseBlockConfig(input)).toThrow(/json/i);
  });

  it("rejects invalid json 2", () => {
    const input = '{"date":"2026-03-14",,'; // No closing }, extra commas
    expect(() => parseBlockConfig(input)).toThrow(/json/i);
  });

  it("rejects json not parsed as an object", () => {
    const input = '["date","2026-03-14"]'; // Not an object
    expect(() => parseBlockConfig(input)).toThrow(/must be an object/i);
  });

});
