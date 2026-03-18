import type { DailyLog, IsoDate, PlanFile, SystemConfig } from "../types";
import { getDataPaths, getStaticDataPaths } from "./paths";
import type { VaultLike } from "./storage";
import { readJsonFile, writeJsonFile } from "./storage";
import { ensureConfigFile, ensureDailyLogFile, ensureDataFolders, ensurePlanFiles, ensureVaultSetup } from "./setup";

export interface VaultRepo {
  readonly vault: VaultLike;
  readonly dataFolder: string;

  getStaticPaths(): ReturnType<typeof getStaticDataPaths>;
  getPaths(date: IsoDate): ReturnType<typeof getDataPaths>;

  ensureSetup(date: IsoDate): Promise<void>;
  ensureDataFolders(): Promise<void>;
  ensurePlanFiles(): Promise<void>;
  ensureConfigFile(): Promise<void>;
  ensureDailyLogFile(date: IsoDate): Promise<void>;

  readConfig(): Promise<SystemConfig>;
  readDailyLog(date: IsoDate): Promise<DailyLog>;
  existsDailyLog(date: IsoDate): Promise<boolean>;
  readDailyLogRaw(date: IsoDate): Promise<Record<string, unknown>>;
  writeDailyLog(date: IsoDate, log: unknown): Promise<void>;
  writeDailyLogRaw(date: IsoDate, log: unknown): Promise<void>;

  readPlan(scope: "day" | "week"): Promise<PlanFile>;
  writePlan(scope: "day" | "week", plan: PlanFile): Promise<void>;
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

    async ensurePlanFiles(): Promise<void> {
      await ensurePlanFiles(vault, dataFolder);
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

    async readPlan(scope: "day" | "week"): Promise<PlanFile> {
      const planPath = scope === "day" ? staticPaths.dayPlanPath : staticPaths.weekPlanPath;
      return readJsonFile<PlanFile>(vault, planPath);
    },

    async writePlan(scope: "day" | "week", plan: PlanFile): Promise<void> {
      const planPath = scope === "day" ? staticPaths.dayPlanPath : staticPaths.weekPlanPath;
      await writeJsonFile(vault, planPath, plan);
    },
  };
}
