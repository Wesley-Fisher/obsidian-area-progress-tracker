import { describe, expect, it } from "vitest";
import type { DailyLog, IsoDate, SystemConfig } from "../../../core/types";
import { renderActivitiesSection } from "../../../core/render/renderActivitiesSection";
import { FakeElement, asHTMLElement } from "./fakeDom";

function mkArgs(overrides: Partial<any> = {}): any {
  const root = new FakeElement("div");

  const baseConfig: SystemConfig = {
    version: 1,
    areas: [],
    actions: [],
    // records intentionally omitted in some tests
    records: [],
  };

  const baseDayLog: DailyLog = {
    previousScore: {},
    startingScore: {},
    updatedScore: {},
    actions: {},
    records: {},
  };

  return {
    container: asHTMLElement(root),
    blockConfig: { mode: "day", date: "2026-03-16" as IsoDate },
    config: baseConfig,
    dayLog: baseDayLog,
    dayPlan: null,
    weekPlan: null,
    onUserAction: async () => {},
    __root: root,
    ...overrides,
  };
}

describe("renderActivitiesSection", () => {
  it("creates an Actions section header", () => {
    const args = mkArgs();

    renderActivitiesSection(args);

    expect(args.__root.textContent()).toContain("Actions");
  });

  it("treats missing config.records as empty and shows the empty message", () => {
    const args = mkArgs({
      config: {
        version: 1,
        areas: [],
        actions: [],
        records: undefined,
      } as any,
    });

    renderActivitiesSection(args);

    // Message originates in renderActivitiesTabs when no actions/records exist.
    expect(args.__root.textContent()).toContain("No actions or records configured");
  });

  it("renders record entry UI when records exist", () => {
    const args = mkArgs({
      config: {
        version: 1,
        areas: [],
        actions: [],
        records: [{ id: "weight", name: "Weight", input: { type: "number" } }],
      },
      dayLog: {
        previousScore: {},
        startingScore: {},
        updatedScore: {},
        actions: {},
        records: { weight: "180" },
      },
    });

    renderActivitiesSection(args);

    expect(args.__root.textContent()).toContain("Weight");
    // Table should create an input for the record.
    expect(args.__root.findAllByTag("input").length).toBeGreaterThan(0);
  });
});
