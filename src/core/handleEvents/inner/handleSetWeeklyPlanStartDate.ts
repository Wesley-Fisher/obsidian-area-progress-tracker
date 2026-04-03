import type { VaultRepo } from "../../vault/repo";
import type { UserWeeklyPlanStartDateEvent } from "../types";
import { writeJsonFile } from "../../vault/storage";

export async function handleSetWeeklyPlanStartDate(repo: VaultRepo, evt: UserWeeklyPlanStartDateEvent): Promise<void> {
  await repo.ensureConfigFile();

  const config = await repo.readConfig();
  const weeklyPlan = config.weeklyPlan;

  const nextConfig = {
    ...config,
    weeklyPlan: {
      ...weeklyPlan,
      startDate: evt.value,
    },
  };

  const { configPath } = repo.getStaticPaths();
  await writeJsonFile(repo.vault, configPath, nextConfig);
}
