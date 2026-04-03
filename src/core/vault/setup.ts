import type { DailyLog, IsoDate, PlanFile, SystemConfig } from "../types";
import { addDays } from "../date";
import { buildDailyLog } from "../scoring";
import { getDataPaths, getStaticDataPaths } from "./paths";
import type { VaultLike } from "./storage";
import { ensureFolder, readJsonFile, writeJsonFile } from "./storage";

export async function ensureVaultSetup(vault: VaultLike, dataFolder: string, date: IsoDate): Promise<void> {
  const paths = getDataPaths(dataFolder, date);

  await ensureDataFolders(vault, dataFolder);
  await ensureConfigFile(vault, paths.configPath);
  await ensurePlanFiles(vault, dataFolder);
  await ensureDailyLogFile(vault, dataFolder, paths.configPath, date);
}

export async function ensureDataFolders(vault: VaultLike, dataFolder: string): Promise<void> {
  const { baseFolder, logsFolder } = getStaticDataPaths(dataFolder);
  await ensureFolder(vault, baseFolder);
  await ensureFolder(vault, logsFolder);
}

export async function ensurePlanFiles(vault: VaultLike, dataFolder: string): Promise<void> {
  const { dayPlanPath, weekPlanPath } = getStaticDataPaths(dataFolder);

  if (!(await vault.exists(dayPlanPath))) {
    await writeJsonFile(vault, dayPlanPath, { actions: {} } satisfies PlanFile);
  }
  if (!(await vault.exists(weekPlanPath))) {
    await writeJsonFile(vault, weekPlanPath, { actions: {} } satisfies PlanFile);
  }
}

export async function ensureConfigFile(vault: VaultLike, configPath: string): Promise<void> {
  if (await vault.exists(configPath)) return;

  const template: SystemConfig = {
    version: 1,
    areas: [],
    groups: [],
    actions: [],
    records: [],
    requiredActions: {},
  };

  await writeJsonFile(vault, configPath, template);
}

export async function ensureDailyLogFile(
  vault: VaultLike,
  dataFolder: string,
  configPath: string,
  date: IsoDate
): Promise<void> {
  const { dailyLogPath } = getDataPaths(dataFolder, date);
  if (await vault.exists(dailyLogPath)) return;

  // Build a seed daily log using previous day if present.
  let config: SystemConfig;
  try {
    config = await readJsonFile<SystemConfig>(vault, configPath);
  } catch {
    config = { version: 1, areas: [], groups: [], actions: [], records: [], requiredActions: {} };
  }

  const prevDate = addDays(date, -1);
  const prevPath = getDataPaths(dataFolder, prevDate).dailyLogPath;
  const prevUpdated = (await vault.exists(prevPath))
    ? (await readJsonFile<DailyLog>(vault, prevPath)).updatedScore
    : undefined;

  const dayLog = buildDailyLog(config, prevUpdated, {}, {});
  await writeJsonFile(vault, dailyLogPath, dayLog);
}
