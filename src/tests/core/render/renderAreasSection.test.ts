import { describe, expect, it } from "vitest";
import type { DailyLog, PlanFile, SystemConfig } from "../../../core/types";
import { renderAreasSection } from "../../../core/render/renderAreasSection";
import { FakeElement, asHTMLElement } from "./fakeDom";

function mkArgs(overrides: Partial<any> = {}): any {
  return {
    container: asHTMLElement(new FakeElement("div")),
    blockConfig: { mode: "day", date: "2026-03-16" },
    config: { version: 1, areas: [], actions: [], records: [] } as SystemConfig,
    dayLog: null as DailyLog | null,
    dayPlan: null as PlanFile | null,
    weekPlan: null as PlanFile | null,
    onUserAction: async () => {},
    ...overrides,
  };
}

describe("renderAreasSection", () => {
  it("shows a friendly message when scores are missing", () => {
    const args = mkArgs({
      config: { version: 1, areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 100, baseScore: 50, dailyDecay: 1 }], actions: [], records: [] },
      dayLog: { updatedScore: {} } as any,
    });

    renderAreasSection(args);

    const root = args.container as unknown as FakeElement;
    expect(root.textContent()).toContain("No scores yet");
  });

  it("renders possible score columns for day/week plans", () => {
    const root = new FakeElement("div");

    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 100, baseScore: 50, dailyDecay: 1 }],
      actions: [
        { id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 10 } },
      ],
      records: [],
    };

    const dayLog: DailyLog = {
      updatedScore: { health: { score: 40, daysSince: 2 } },
      previousScore: { health: { score: 40, daysSince: 2 } },
      startingScore: { health: { score: 39, daysSince: 3 } },
      actions: { walk: 1 },
      records: {},
    };

    const dayPlan: PlanFile = { actions: { walk: 3 } }; // remaining = 2 => +20 => 60
    const weekPlan: PlanFile = { actions: { walk: 3 } }; // no subtract => +30 => 70

    const args = mkArgs({
      container: asHTMLElement(root),
      config,
      dayLog,
      dayPlan,
      weekPlan,
    });

    renderAreasSection(args);

    const tds = root.findAllByTag("td").map((n) => n.text);

    // Row: [Area name, daysSince, updatedScore, possibleDay, possibleWeek]
    expect(tds).toContain("Health");
    expect(tds).toContain("2");
    expect(tds).toContain("40");
    expect(tds).toContain("60");
    expect(tds).toContain("70");
  });
});
