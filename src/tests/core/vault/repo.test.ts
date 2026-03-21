import { describe, expect, it } from "vitest";
import { createVaultRepo } from "../../../core/vault/repo";
import { MemoryVault } from "../../memoryVault";

describe("core/vault/repo", () => {
  it("exposes paths and supports basic daily log read/write", async () => {
    const vault = new MemoryVault();
    const repo = createVaultRepo(vault as any, "ProgressTrackerBase");

    const staticPaths = repo.getStaticPaths();
    expect(staticPaths.configPath).toContain("config.json");

    const date = "2026-03-16" as any;
    const paths = repo.getPaths(date);
    expect(paths.dailyLogPath).toContain("logs");
    expect(paths.dailyLogPath).toContain("apt.");

    await repo.writeDailyLogRaw(date, { hello: "world" });
    expect(await repo.existsDailyLog(date)).toBe(true);

    const raw = await repo.readDailyLogRaw(date);
    expect(raw).toMatchObject({ hello: "world" });
  });
});
