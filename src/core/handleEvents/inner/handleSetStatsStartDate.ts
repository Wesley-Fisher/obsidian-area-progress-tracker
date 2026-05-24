import type { VaultRepo } from "../../vault/repo";
import type { UserStatsStartDateEvent } from "../types";
import { writeJsonFile } from "../../vault/storage";

export async function handleSetStatsStartDate(repo: VaultRepo, evt: UserStatsStartDateEvent): Promise<void> {
  await repo.ensureConfigFile();

  const config = await repo.readConfig();

  const nextConfig = {
    ...config,
    stats: {
      ...config.stats,
      startDate: evt.value,
    },
  };

  const { configPath } = repo.getStaticPaths();
  await writeJsonFile(repo.vault, configPath, nextConfig);
}