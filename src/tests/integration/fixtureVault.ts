import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { IsoDate } from "../../core/types";
import { getDataPaths } from "../../core/vault/paths";
import { createVaultRepo, type VaultRepo } from "../../core/vault/repo";
import { MemoryVault } from "../memoryVault";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const sourceRoot = path.join(repoRoot, "src", "tests", "integration", "fixtures", "progress-tracker-source");
const dataFolder = "ProgressTracker";

export async function createFixtureRepo(dates: IsoDate[] = ["2026-02-28", "2026-03-01", "2026-03-02", "2026-03-03"]): Promise<{
  vault: MemoryVault;
  repo: VaultRepo;
}> {
  const runtimeRoot = await fs.mkdtemp(path.join(os.tmpdir(), "area-progress-tracker-integration-"));

  try {
    await fs.cp(sourceRoot, runtimeRoot, { recursive: true });

    const vault = new MemoryVault();
    const repo = createVaultRepo(vault, dataFolder);

    const config = await fs.readFile(path.join(runtimeRoot, "config.json"), "utf8");
    await vault.write(repo.getStaticPaths().configPath, config);

    for (const date of dates) {
      const [year, month] = date.split("-");
      const log = await fs.readFile(path.join(runtimeRoot, "logs", year, month, `apt.${date}.json`), "utf8");
      await vault.write(getDataPaths(dataFolder, date).dailyLogPath, log);
    }

    return { vault, repo };
  } finally {
    await fs.rm(runtimeRoot, { recursive: true, force: true });
  }
}
