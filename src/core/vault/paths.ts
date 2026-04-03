import type { IsoDate } from "../types";
import { normalizeFolderPath } from "./normalize";

export interface DataPaths {
  configPath: string;
  dailyLogPath: string;
}

export interface StaticDataPaths {
  baseFolder: string;
  logsFolder: string;
  configPath: string;
}

export function getStaticDataPaths(dataFolder: string): StaticDataPaths {
  const baseFolder = normalizeFolderPath(dataFolder);
  return {
    baseFolder,
    logsFolder: `${baseFolder}/logs`,
    configPath: `${baseFolder}/config.json`,
  };
}

/**
 * Computes vault-relative paths within a configured data folder.
 *
 * Note: the plugin setting surface area is intentionally small; for now we hardcode
 * the default folder name and let callers override later.
 */
export function getDataPaths(dataFolder: string, date: IsoDate): DataPaths {
  const { configPath, logsFolder } = getStaticDataPaths(dataFolder);
  return {
    configPath,
    dailyLogPath: `${logsFolder}/apt.${date}.json`,
  };
}
