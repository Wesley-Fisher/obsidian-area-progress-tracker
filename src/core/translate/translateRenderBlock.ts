import { checkConfiguration } from "../checkConfiguration";
import type { RenderBlockArgs } from "../render/renderTypes";
import type { RenderBodyModel } from "./models";
import { translateAreasSection } from "./inner/translateAreasSection";
import { translateActivitiesSection } from "./inner/translateActivitiesSection";
import { translatePlanSection } from "./inner/translatePlanSection";
import type { DailyLog, DailyPlanConfig, IsoDate, Scores, SystemConfig, WeeklyPlanConfig } from "../types";

function defaultDailyPlan(): DailyPlanConfig {
  return { actions: {} };
}

function defaultWeeklyPlan(): WeeklyPlanConfig {
  return { startDate: "", actions: {} };
}

function tryParseIsoDate(raw: string): IsoDate | undefined {
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  const [y, m, d] = trimmed.split("-").map((n) => Number(n));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return undefined;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const yyyy = dt.getUTCFullYear();
  const mm = dt.getUTCMonth() + 1;
  const dd = dt.getUTCDate();
  // Reject impossible dates (e.g. 2026-02-30) that would roll over.
  if (yyyy !== y || mm !== m || dd !== d) return undefined;
  return trimmed as IsoDate;
}

export async function translateRenderBlock(args: RenderBlockArgs): Promise<RenderBodyModel> {
  const { blockConfig } = args;
  const paths = args.repo.getPaths(blockConfig.date);

  // Load minimal data needed for rendering.
  let config: SystemConfig;
  let dayLog: DailyLog;
  let dayPlan: DailyPlanConfig;
  let weekPlan: WeeklyPlanConfig;

  try {
    config = await args.repo.readConfig();
  } catch {
    return { kind: "errorText", message: `Missing config: ${paths.configPath}` };
  }

  // Backward-compatible defaults if older configs are missing these fields.
  dayPlan = (config as Partial<SystemConfig>).dailyPlan ?? defaultDailyPlan();
  weekPlan = (config as Partial<SystemConfig>).weeklyPlan ?? defaultWeeklyPlan();
  dayPlan = { actions: dayPlan.actions ?? {} };
  weekPlan = { startDate: typeof weekPlan.startDate === "string" ? weekPlan.startDate : "", actions: weekPlan.actions ?? {} };

  try {
    dayLog = await args.repo.readDailyLog(blockConfig.date);
  } catch {
    return { kind: "errorText", message: `Missing daily log: ${paths.dailyLogPath}` };
  }

  let weekStartScores: Scores | undefined;
  const weekStartDate = tryParseIsoDate(weekPlan.startDate);
  if (weekStartDate) {
    try {
      const weekStartLog = await args.repo.readDailyLog(weekStartDate);
      if (weekStartLog?.updatedScore && Object.keys(weekStartLog.updatedScore).length > 0) {
        weekStartScores = weekStartLog.updatedScore;
      }
    } catch {
      // Missing or unreadable daily log: fall back to area defaults.
    }
  }

  const configIssues = checkConfiguration(config);
  if (configIssues.length > 0) {
    return {
      kind: "errorList",
      message: `Invalid config (${configIssues.length} issue(s)) in ${paths.configPath}:`,
      items: configIssues.map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message)),
    };
  }

  return {
    kind: "dashboard",
    areas: translateAreasSection({ config, dayLog, dayPlan, weekPlan, weekStartScores }),
    actions: translateActivitiesSection({ date: blockConfig.date, config, dayLog }),
    planDay: translatePlanSection({ scope: "day", config, plan: dayPlan }),
    planWeek: translatePlanSection({ scope: "week", config, plan: weekPlan }),
  };
}
