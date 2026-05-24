import { describe, expect, it } from "vitest";
import type { DailyLog, IsoDate, SystemConfig } from "../../../core/types";
import { loadStatsSection, translateRenderBlock } from "../../../core/translate/translateRenderBlock";
import { getDataPaths } from "../../../core/vault/paths";
import { createVaultRepo } from "../../../core/vault/repo";
import { MemoryVault } from "../../memoryVault";
import { buildDailyLog } from "../../../core/scoring";
import { RenderBlockArgs } from "../../../core/render/renderTypes";

function mkArgs(opts: { vault: MemoryVault; dataFolder: string; date: string; mode?: string; show?: string[] }): RenderBlockArgs {
  const repo = createVaultRepo(opts.vault, opts.dataFolder);
  return {
    el: {} as HTMLElement,
    blockConfig: {
      date: opts.date as IsoDate,
    },
    repo,
    onUserAction: async () => {},
  };
}

describe("render/translate/translateRenderBlock", () => {
  it("returns errorText when config is missing", async () => {
    const vault = new MemoryVault();
    const args = mkArgs({ vault, dataFolder: "ProgressTracker", date: "2026-03-16" });

    const model = await translateRenderBlock(args);

    expect(model.kind).toBe("errorText");
    if (model.kind !== "errorText") throw new Error("expected errorText");
    expect(model.message).toContain("Missing config:");
  });

  it("returns errorText when daily log is missing", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const date = "2026-03-16" as IsoDate;
    const paths = getDataPaths(dataFolder, date);

    const config: SystemConfig = {
      version: 1,
      areas: [],
      groups: [],
      actions: [],
      records: [],
      requiredActions: {},
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: { startDate: "", entries: [] },
    };
    await vault.write(paths.configPath, JSON.stringify(config));

    const args = mkArgs({ vault, dataFolder, date });
    const model = await translateRenderBlock(args);

    expect(model.kind).toBe("errorText");
    if (model.kind !== "errorText") throw new Error("expected errorText");
    expect(model.message).toContain("Missing daily log:");
  });

  it("returns errorList when config is invalid", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const date = "2026-03-16" as IsoDate;
    const paths = getDataPaths(dataFolder, date);

    const badConfig: SystemConfig = {
      version: 1,
      areas: [],
      groups: [],
      actions: [
        { id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, groupIds: [], max: 0  },
        { id: "walk", name: "Walk2", input: { type: "button", step: 1 }, effects: {}, groupIds: [], max: 0  },
      ],
      records: [],
      requiredActions: {},
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: { startDate: "", entries: [] },

    };

    const dayLog: DailyLog = buildDailyLog({ ...badConfig, actions: [] }, undefined, {}, {});
    await vault.write(paths.configPath, JSON.stringify(badConfig));
    await vault.write(paths.dailyLogPath, JSON.stringify(dayLog));

    const args = mkArgs({ vault, dataFolder, date });
    const model = await translateRenderBlock(args);

    expect(model.kind).toBe("errorList");
    if (model.kind !== "errorList") throw new Error("expected errorList");
    expect(model.message).toContain("Invalid config");
    expect(model.items.join("\n")).toContain("Duplicate action id: walk");
  });

  it("honors blockConfig.show to select translated sections", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const date = "2026-03-16" as IsoDate;
    const paths = getDataPaths(dataFolder, date);

    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 100, baseScore: 50, dailyDecayAlways: 0, dailyDecayUnattended: 1 }],
      groups: [],
      actions: [],
      records: [],
      requiredActions: {},
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: { startDate: "", entries: [] },
    };

    const dayLog: DailyLog = {
      ...buildDailyLog(config, undefined, {}, {}),
      updatedScore: { health: { score: 50, daysSince: 1 } },
    };

    await vault.write(paths.configPath, JSON.stringify(config));
    await vault.write(paths.dailyLogPath, JSON.stringify(dayLog));

    const args = mkArgs({ vault, dataFolder, date, show: ["areas"] });
    const model = await translateRenderBlock(args);

    // UI now always renders Areas + fixed tabs (Actions / Plan Day / Plan Week).
    // blockConfig.show is intentionally ignored.
    expect(model.kind).toBe("dashboard");
    if (model.kind !== "dashboard") throw new Error("expected dashboard");
    expect(model.areas.kind).toMatch(/areas/);
    expect(model.actions.kind).toMatch(/activities/);
    expect(model.planDay.scope).toBe("day");
    expect(model.planWeek.scope).toBe("week");
    expect(model.stats.startDate.kind).toBe("statsStartDate");
  });

  it("loads total stats across actions and numeric records only within the configured date range", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const startDate = "2026-03-14" as IsoDate;
    const endDate = "2026-03-16" as IsoDate;
    const repo = createVaultRepo(vault, dataFolder);

    const config: SystemConfig = {
      version: 1,
      areas: [],
      groups: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, groupIds: [], max: 0 }],
      records: [{ id: "weight", name: "Weight", input: { type: "number" }, groupIds: [] }],
      requiredActions: {},
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: {
        startDate,
        entries: [
          { id: "walk-total", name: "Walk", statNames: ["walk"], display: ["total", "average", "count", "range"] },
          { id: "weight-total", name: "Weight", statNames: ["weight"], display: ["total", "average", "count", "range"] },
        ],
      },
    };

    await vault.write(repo.getStaticPaths().configPath, JSON.stringify(config));
    await repo.writeDailyLog(startDate, {
      previousScore: {},
      startingScore: {},
      updatedScore: {},
      actions: { walk: 2 },
      records: { weight: "100.5" },
    });
    await repo.writeDailyLog("2026-03-15" as IsoDate, {
      previousScore: {},
      startingScore: {},
      updatedScore: {},
      actions: { walk: 3 },
      records: { weight: "oops" },
    });
    await repo.writeDailyLog(endDate, {
      previousScore: {},
      startingScore: {},
      updatedScore: {},
      actions: { walk: 1 },
      records: { weight: "101.25" },
    });

    const model = await loadStatsSection({ repo, endDate });

    expect(model).toEqual({
      kind: "statsTable",
      rows: [
        { name: "Walk", valueLines: ["Total=6", "Average=2", "Count=3", "Range=1-3"] },
        { name: "Weight", valueLines: ["Total=201.75", "Average=100.875", "Count=2", "Range=100.5-101.25"] },
      ],
    });
  });

  it("combines multiple statNames and skips missing daily entries without dropping the row", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const startDate = "2026-03-14" as IsoDate;
    const endDate = "2026-03-16" as IsoDate;
    const repo = createVaultRepo(vault, dataFolder);

    const config: SystemConfig = {
      version: 1,
      areas: [],
      groups: [],
      actions: [
        { id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, groupIds: [], max: 0 },
        { id: "stretch", name: "Stretch", input: { type: "button", step: 1 }, effects: {}, groupIds: [], max: 0 },
      ],
      records: [],
      requiredActions: {},
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: {
        startDate,
        entries: [
          { id: "movement-total", name: "Movement", statNames: ["walk", "stretch"], display: ["total", "average", "count", "range"] },
        ],
      },
    };

    await vault.write(repo.getStaticPaths().configPath, JSON.stringify(config));
    await repo.writeDailyLog(startDate, {
      previousScore: {},
      startingScore: {},
      updatedScore: {},
      actions: { walk: 2 },
      records: {},
    });
    await repo.writeDailyLog("2026-03-15" as IsoDate, {
      previousScore: {},
      startingScore: {},
      updatedScore: {},
      actions: { stretch: 3 },
      records: {},
    });
    await repo.writeDailyLog(endDate, {
      previousScore: {},
      startingScore: {},
      updatedScore: {},
      actions: {},
      records: {},
    });

    const model = await loadStatsSection({ repo, endDate });

    expect(model).toEqual({
      kind: "statsTable",
      rows: [
        { name: "Movement", valueLines: ["Total=5", "Average=2.5", "Count=2", "Range=2-3"] },
      ],
    });
  });
});
