import { describe, expect, it } from "vitest";
import type { DailyLog, IsoDate, SystemConfig } from "../../../core/types";
import { handleSetDayUIFlag } from "../../../core/handleEvents/handleSetDayUIFlag";
import { buildDailyLog } from "../../../core/scoring";
import { createVaultRepo } from "../../../core/vault/repo";
import { getStaticDataPaths } from "../../../core/vault/paths";
import { MemoryVault } from "../../memoryVault";


describe("handleSetDayUIFlag", () => {
  it("sets a UI flag and preserves other fields", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const repo = createVaultRepo(vault, dataFolder);

    const date = "2026-03-16" as IsoDate;

    const config: SystemConfig = {
      version: 1,
      areas: [],
      actions: [],
      records: [],
    };

    // Pre-seed an existing daily log file.
    const base: DailyLog = buildDailyLog(config, undefined, {}, { weight: "180" });
    const seeded: DailyLog = { ...base, ui: { hidePlanWeek: true } };

    const paths = repo.getPaths(date);
    await vault.write(paths.dailyLogPath, JSON.stringify(seeded));

    await handleSetDayUIFlag(repo, {
      kind: "setDayUiFlag",
      date,
      flag: "hidePlanDay",
      value: true,
    });

    const next = JSON.parse(await vault.read(paths.dailyLogPath)) as DailyLog;
    expect(next.ui?.hidePlanDay).toBe(true);
    expect(next.ui?.hidePlanWeek).toBe(true);
    expect(next.records?.weight).toBe("180");
  });

  it("creates config + daily log if missing", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const repo = createVaultRepo(vault, dataFolder);

    const date = "2026-03-16" as IsoDate;

    await handleSetDayUIFlag(repo, {
      kind: "setDayUiFlag",
      date,
      flag: "hidePlanWeek",
      value: true,
    });

    const staticPaths = getStaticDataPaths(dataFolder);
    expect(await vault.exists(staticPaths.configPath)).toBe(true);

    const dailyLogPath = repo.getPaths(date).dailyLogPath;
    const next = JSON.parse(await vault.read(dailyLogPath)) as DailyLog;
    expect(next.ui?.hidePlanWeek).toBe(true);
  });
});
