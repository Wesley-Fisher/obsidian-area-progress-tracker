import { describe, expect, it } from "vitest";
import type { IsoDate, SystemConfig } from "../../../core/types";
import { ensureVaultSetup } from "../../../core/vault/setup";
import { getDataPaths, getStaticDataPaths } from "../../../core/vault/paths";

class MemoryVault {
  private readonly files = new Map<string, string>();
  private readonly folders = new Set<string>();

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.folders.has(path);
  }

  async read(path: string): Promise<string> {
    const v = this.files.get(path);
    if (v === undefined) throw new Error(`missing: ${path}`);
    return v;
  }

  async write(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async createFolder(path: string): Promise<void> {
    this.folders.add(path);
  }
}

describe("vault setup", () => {
  it("creates base folders and seed files when missing", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTrackerBase";
    const date = "2026-03-16" as IsoDate;

    await ensureVaultSetup(vault, dataFolder, date);

    const staticPaths = getStaticDataPaths(dataFolder);
    expect(await vault.exists(staticPaths.baseFolder)).toBe(true);
    expect(await vault.exists(staticPaths.logsFolder)).toBe(true);
    expect(await vault.exists(staticPaths.configPath)).toBe(true);

    const dataPaths = getDataPaths(dataFolder, date);
    expect(await vault.exists(dataPaths.dailyLogYearFolder)).toBe(true);
    expect(await vault.exists(dataPaths.dailyLogFolder)).toBe(true);
    expect(await vault.exists(dataPaths.dailyLogPath)).toBe(true);
  });

  it("writes a config template with version=1", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTrackerBase";
    const date = "2026-03-16" as IsoDate;

    await ensureVaultSetup(vault, dataFolder, date);

    const staticPaths = getStaticDataPaths(dataFolder);
    const config = JSON.parse(await vault.read(staticPaths.configPath)) as SystemConfig;
    expect(config.version).toBe(1);
    expect(config.dailyPlan).toBeDefined();
    expect(config.weeklyPlan).toBeDefined();
    expect(config.stats).toBeDefined();
    expect(config.dailyPlan.actions).toBeDefined();
    expect(config.weeklyPlan.actions).toBeDefined();
    expect(config.stats.entries).toBeDefined();
  });
});
