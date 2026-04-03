import { describe, expect, it } from "vitest";
import type { DailyLog, IsoDate, PlanFile, PossibleModes, ShowableAreas, SystemConfig } from "../../../core/types";
import { translateRenderBlock } from "../../../core/translate/translateRenderBlock";
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
      mode: "day" as PossibleModes,
      date: opts.date as IsoDate,
      show: opts.show as Array<ShowableAreas>,
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

    const config: SystemConfig = { version: 1, areas: [], groups: [], actions: [], records: [] };
    await vault.write(paths.configPath, JSON.stringify(config));
    await vault.write(paths.dayPlanPath, JSON.stringify({ actions: {} }));
    await vault.write(paths.weekPlanPath, JSON.stringify({ actions: {} }));

    const args = mkArgs({ vault, dataFolder, date });
    const model = await translateRenderBlock(args);

    expect(model.kind).toBe("errorText");
    if (model.kind !== "errorText") throw new Error("expected errorText");
    expect(model.message).toContain("Missing daily log:");
  });

  it("returns errorText when day plan is missing", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const date = "2026-03-16" as IsoDate;
    const paths = getDataPaths(dataFolder, date);

    const config: SystemConfig = { version: 1, areas: [], groups: [], actions: [], records: [] };
    const dayLog: DailyLog = buildDailyLog(config, undefined, {}, {});
    await vault.write(paths.configPath, JSON.stringify(config));
    await vault.write(paths.dailyLogPath, JSON.stringify(dayLog));
    await vault.write(paths.weekPlanPath, JSON.stringify({ actions: {} }));

    const args = mkArgs({ vault, dataFolder, date });
    const model = await translateRenderBlock(args);

    expect(model.kind).toBe("errorText");
    if (model.kind !== "errorText") throw new Error("expected errorText");
    expect(model.message).toContain("Missing daily plan:");
  });

  it("returns errorText when week plan is missing", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const date = "2026-03-16" as IsoDate;
    const paths = getDataPaths(dataFolder, date);

    const config: SystemConfig = { version: 1, areas: [], groups: [], actions: [], records: [] };
    const dayLog: DailyLog = buildDailyLog(config, undefined, {}, {});
    await vault.write(paths.configPath, JSON.stringify(config));
    await vault.write(paths.dailyLogPath, JSON.stringify(dayLog));
    await vault.write(paths.dayPlanPath, JSON.stringify({ actions: {} }));

    const args = mkArgs({ vault, dataFolder, date });
    const model = await translateRenderBlock(args);

    expect(model.kind).toBe("errorText");
    if (model.kind !== "errorText") throw new Error("expected errorText");
    expect(model.message).toContain("Missing weekly plan:");
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
    };

    const dayLog: DailyLog = buildDailyLog({ ...badConfig, actions: [] }, undefined, {}, {});
    const dayPlan: PlanFile = { actions: {} };
    const weekPlan: PlanFile = { actions: {} };

    await vault.write(paths.configPath, JSON.stringify(badConfig));
    await vault.write(paths.dailyLogPath, JSON.stringify(dayLog));
    await vault.write(paths.dayPlanPath, JSON.stringify(dayPlan));
    await vault.write(paths.weekPlanPath, JSON.stringify(weekPlan));

    const args = mkArgs({ vault, dataFolder, date });
    const model = await translateRenderBlock(args);

    expect(model.kind).toBe("errorList");
    if (model.kind !== "errorList") throw new Error("expected errorList");
    expect(model.message).toContain("Invalid config");
    expect(model.items.join("\n")).toContain("Duplicate action id: walk");
  });

  it("returns errorText for unsupported mode", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const date = "2026-03-16" as IsoDate;
    const paths = getDataPaths(dataFolder, date);

    const config: SystemConfig = { version: 1, areas: [], groups: [], actions: [], records: [] };
    const dayLog: DailyLog = buildDailyLog(config, undefined, {}, {});
    const plan: PlanFile = { actions: {} };

    await vault.write(paths.configPath, JSON.stringify(config));
    await vault.write(paths.dailyLogPath, JSON.stringify(dayLog));
    await vault.write(paths.dayPlanPath, JSON.stringify(plan));
    await vault.write(paths.weekPlanPath, JSON.stringify(plan));

    const args = mkArgs({ vault, dataFolder, date, mode: "week" });

    // Allow testing an incorrect mode string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args.blockConfig.mode = "wrong-mode" as any; // Test robustness against incorrect modes

    const model = await translateRenderBlock(args);

    expect(model.kind).toBe("errorText");
    if (model.kind !== "errorText") throw new Error("expected errorText");
    expect(model.message).toContain("Unsupported mode: wrong-mode");
  });

  it("honors blockConfig.show to select translated sections", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const date = "2026-03-16" as IsoDate;
    const paths = getDataPaths(dataFolder, date);

    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 100, baseScore: 50, dailyDecay: 1 }],
      groups: [],
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
    const model = await translateRenderBlock(args);

    expect(model.kind).toBe("day");
    if (model.kind !== "day") throw new Error("expected day");

    expect(model.sections).toHaveLength(1);
    expect(model.sections[0].kind).toMatch(/areas/);
  });
});
