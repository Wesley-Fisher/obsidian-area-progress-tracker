import type { DailyLog, DailyPlanConfig, IsoDate, SystemConfig, WeeklyPlanConfig } from "../types";
import { getDataPaths, getStaticDataPaths } from "./paths";
import type { VaultLike } from "./storage";
import { readJsonFile, writeJsonFile } from "./storage";
import { ensureConfigFile, ensureDailyLogFile, ensureDataFolders, ensureVaultSetup } from "./setup";

type PlanScope = "day" | "week";
type PlanConfig = DailyPlanConfig | WeeklyPlanConfig;

function defaultDailyPlan(): DailyPlanConfig {
  return { actions: {} };
}

function defaultWeeklyPlan(): WeeklyPlanConfig {
  return { actions: {} };
}

function getPlansFromConfig(config: SystemConfig | Partial<SystemConfig>): { dailyPlan: DailyPlanConfig; weeklyPlan: WeeklyPlanConfig } {
  const c = config as Partial<SystemConfig>;
  const dailyPlan = (c.dailyPlan && typeof c.dailyPlan === "object") ? (c.dailyPlan as DailyPlanConfig) : defaultDailyPlan();
  const weeklyPlan = (c.weeklyPlan && typeof c.weeklyPlan === "object") ? (c.weeklyPlan as WeeklyPlanConfig) : defaultWeeklyPlan();
  return {
    dailyPlan: { actions: dailyPlan.actions ?? {} },
    weeklyPlan: { actions: weeklyPlan.actions ?? {} },
  };
}

export interface VaultRepo {
  readonly vault: VaultLike;
  readonly dataFolder: string;

  getStaticPaths(): ReturnType<typeof getStaticDataPaths>;
  getPaths(date: IsoDate): ReturnType<typeof getDataPaths>;

  ensureSetup(date: IsoDate): Promise<void>;
  ensureDataFolders(): Promise<void>;
  ensureConfigFile(): Promise<void>;
  ensureDailyLogFile(date: IsoDate): Promise<void>;

  readConfig(): Promise<SystemConfig>;
  readDailyLog(date: IsoDate): Promise<DailyLog>;
  existsDailyLog(date: IsoDate): Promise<boolean>;
  readDailyLogRaw(date: IsoDate): Promise<Record<string, unknown>>;
  writeDailyLog(date: IsoDate, log: unknown): Promise<void>;
  writeDailyLogRaw(date: IsoDate, log: unknown): Promise<void>;

  readPlan(scope: PlanScope): Promise<PlanConfig>;
  writePlan(scope: PlanScope, plan: PlanConfig): Promise<void>;
}

export function createVaultRepo(vault: VaultLike, dataFolder: string): VaultRepo {
  const staticPaths = getStaticDataPaths(dataFolder);

  return {
    vault,
    dataFolder,

    getStaticPaths(): ReturnType<typeof getStaticDataPaths> {
      return staticPaths;
    },

    getPaths(date: IsoDate): ReturnType<typeof getDataPaths> {
      return getDataPaths(dataFolder, date);
    },

    async ensureSetup(date: IsoDate): Promise<void> {
      await ensureVaultSetup(vault, dataFolder, date);
    },

    async ensureDataFolders(): Promise<void> {
      await ensureDataFolders(vault, dataFolder);
    },

    async ensureConfigFile(): Promise<void> {
      await ensureConfigFile(vault, staticPaths.configPath);
    },

    async ensureDailyLogFile(date: IsoDate): Promise<void> {
      await ensureDailyLogFile(vault, dataFolder, staticPaths.configPath, date);
    },

    async readConfig(): Promise<SystemConfig> {
      return readJsonFile<SystemConfig>(vault, staticPaths.configPath);
    },

    async readDailyLog(date: IsoDate): Promise<DailyLog> {
      const { dailyLogPath } = getDataPaths(dataFolder, date);
      return readJsonFile<DailyLog>(vault, dailyLogPath);
    },

    async existsDailyLog(date: IsoDate): Promise<boolean> {
      const { dailyLogPath } = getDataPaths(dataFolder, date);
      return vault.exists(dailyLogPath);
    },

    async readDailyLogRaw(date: IsoDate): Promise<Record<string, unknown>> {
      const { dailyLogPath } = getDataPaths(dataFolder, date);
      return readJsonFile<Record<string, unknown>>(vault, dailyLogPath);
    },

    async writeDailyLog(date: IsoDate, log: unknown): Promise<void> {
      const { dailyLogPath } = getDataPaths(dataFolder, date);
      await writeJsonFile(vault, dailyLogPath, log);
    },

    async writeDailyLogRaw(date: IsoDate, log: unknown): Promise<void> {
      const { dailyLogPath } = getDataPaths(dataFolder, date);
      await writeJsonFile(vault, dailyLogPath, log);
    },

    async readPlan(scope: PlanScope): Promise<PlanConfig> {
      const config = await readJsonFile<SystemConfig>(vault, staticPaths.configPath);
      const plans = getPlansFromConfig(config);
      return scope === "day" ? plans.dailyPlan : plans.weeklyPlan;
    },

    async writePlan(scope: PlanScope, plan: PlanConfig): Promise<void> {
      const config = await readJsonFile<SystemConfig>(vault, staticPaths.configPath);
      const plans = getPlansFromConfig(config);

      const nextConfig: SystemConfig = {
        ...config,
        dailyPlan: scope === "day" ? (plan as DailyPlanConfig) : plans.dailyPlan,
        weeklyPlan: scope === "week" ? (plan as WeeklyPlanConfig) : plans.weeklyPlan,
      };

      await writeJsonFile(vault, staticPaths.configPath, nextConfig);
    },
  };
}
