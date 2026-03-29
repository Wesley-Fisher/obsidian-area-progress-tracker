import { describe, expect, it } from "vitest";
import type { DailyLog, IsoDate, PlanFile, ShowableAreas, SystemConfig } from "../../../core/types";
import { onRenderProgressTrackerBlock } from "../../../core/render/renderBlock";
import { getDataPaths } from "../../../core/vault/paths";
import { buildDailyLog } from "../../../core/scoring";
import { createVaultRepo } from "../../../core/vault/repo";
import { MemoryVault } from "../../memoryVault";
import { FakeElement, asHTMLElement } from "./fakeDom";
import { RenderBlockArgs } from "../../../core/render/renderTypes";

function mkArgs(opts: {
  vault: MemoryVault;
  dataFolder: string;
  date: string;
  mode?: string;
  show?: ShowableAreas[];
}): RenderBlockArgs  & { __root: FakeElement } {
  const el = new FakeElement("div");
  const repo = createVaultRepo(opts.vault, opts.dataFolder);
  return {
    el: asHTMLElement(el),
    blockConfig: {
      mode: "day",
      date: opts.date as IsoDate,
      show: opts.show,
    },
    repo,
    onUserAction: async () => {},
    __root: el,
  } as RenderBlockArgs & { __root: FakeElement };
}

describe("onRenderProgressTrackerBlock", () => {
  it("renders an error when config is missing", async () => {
    const vault = new MemoryVault();
    const args = mkArgs({ vault, dataFolder: "ProgressTracker", date: "2026-03-16" });

    await onRenderProgressTrackerBlock(args);

    expect(args.__root.textContent()).toContain("Missing config:");
  });

  it("renders config validation issues", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const date = "2026-03-16";

    const paths = getDataPaths(dataFolder, date as IsoDate);

    const badConfig: SystemConfig = {
      version: 1,
      areas: [],
      actions: [
        { id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, groupIds: [] },
        { id: "walk", name: "Walk2", input: { type: "button", step: 1 }, effects: {}, groupIds: [] },
      ],
      records: [],
    };

    const dayLog: DailyLog = buildDailyLog({ ...badConfig, actions: [] }, undefined, {}, {}) as DailyLog;
    const dayPlan: PlanFile = { actions: {} };
    const weekPlan: PlanFile = { actions: {} };

    await vault.write(paths.configPath, JSON.stringify(badConfig));
    await vault.write(paths.dailyLogPath, JSON.stringify(dayLog));
    await vault.write(paths.dayPlanPath, JSON.stringify(dayPlan));
    await vault.write(paths.weekPlanPath, JSON.stringify(weekPlan));

    const args = mkArgs({ vault, dataFolder, date });
    await onRenderProgressTrackerBlock(args);

    const text = args.__root.textContent();
    expect(text).toContain("Invalid config");
    expect(text).toContain("Duplicate action id: walk");
  });

  it("renders unsupported mode error", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const date = "2026-03-16";
    const paths = getDataPaths(dataFolder, date as IsoDate);

    const config: SystemConfig = { version: 1, areas: [], actions: [], records: [] };
    const dayLog: DailyLog = buildDailyLog(config, undefined, {}, {});
    const plan: PlanFile = { actions: {} };

    await vault.write(paths.configPath, JSON.stringify(config));
    await vault.write(paths.dailyLogPath, JSON.stringify(dayLog));
    await vault.write(paths.dayPlanPath, JSON.stringify(plan));
    await vault.write(paths.weekPlanPath, JSON.stringify(plan));

    const args = mkArgs({ vault, dataFolder, date, mode: "week" });

    // Allow testing an incorrect mode string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args.blockConfig.mode = "week" as any;
    await onRenderProgressTrackerBlock(args);

    expect(args.__root.textContent()).toContain("Unsupported mode: week");
  });

  it("renders only requested sections via blockConfig.show", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const date = "2026-03-16";
    const paths = getDataPaths(dataFolder, date as IsoDate);

    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 100, baseScore: 50, dailyDecay: 1 }],
      actions: [],
      records: [],
    };

    const dayLog: DailyLog = {
      ...buildDailyLog(config, undefined, {}, {}),
      updatedScore: { health: { score: 50, daysSince: 1 } },
    };

    await vault.write(paths.configPath, JSON.stringify(config));
    await vault.write(paths.dailyLogPath, JSON.stringify(dayLog));
    await vault.write(paths.dayPlanPath, JSON.stringify({ actions: {} }));
    await vault.write(paths.weekPlanPath, JSON.stringify({ actions: {} }));

    const args = mkArgs({ vault, dataFolder, date, show: ["areas"] });
    await onRenderProgressTrackerBlock(args);

    const text = args.__root.textContent();
    expect(text).toContain("Area Progress Tracker");
    expect(text).toContain("Areas");
    expect(text).not.toContain("Actions");
    expect(text).not.toContain("Plan (day)");
  });

  it("renders actions + plan sections when show is omitted (default)", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const date = "2026-03-16";
    const paths = getDataPaths(dataFolder, date as IsoDate);

    const config: SystemConfig = {
      version: 1,
      areas: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, groupIds: [] }],
      records: [],
    };

    const dayLog: DailyLog = {
      ...buildDailyLog(config, undefined, {}, {}),
      ui: {},
      actions: { walk: 0 },
    } as DailyLog;

    await vault.write(paths.configPath, JSON.stringify(config));
    await vault.write(paths.dailyLogPath, JSON.stringify(dayLog));
    await vault.write(paths.dayPlanPath, JSON.stringify({ actions: { walk: 0 } }));
    await vault.write(paths.weekPlanPath, JSON.stringify({ actions: { walk: 0 } }));

    const args = mkArgs({ vault, dataFolder, date });
    await onRenderProgressTrackerBlock(args);

    const text = args.__root.textContent();
    expect(text).toContain("Actions");
    expect(text).toContain("Plan (day)");
    expect(text).toContain("Plan (week)");
  });
});
