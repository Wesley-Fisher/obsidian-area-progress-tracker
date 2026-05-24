import { checkConfiguration } from "../checkConfiguration";
import type { RenderBlockArgs } from "../render/renderTypes";
import type { LoadedStatsSectionModel, RenderBodyModel, StatsSectionModel } from "./models";
import { translateAreasSection } from "./inner/translateAreasSection";
import { translateActivitiesSection } from "./inner/translateActivitiesSection";
import { translatePlanSection } from "./inner/translatePlanSection";
import { addDays } from "../date";
import { STATS_DISPLAY_CONFIGS, type DailyLog, type DailyPlanConfig, type IsoDate, type Scores, type StatsConfig, type StatsDisplayConfig, type SystemConfig, type WeeklyPlanConfig } from "../types";

function defaultDailyPlan(): DailyPlanConfig {
  return { actions: {} };
}

function defaultWeeklyPlan(): WeeklyPlanConfig {
  return { startDate: "", actions: {} };
}

type StatsAggregateValues = {
  total: number;
  count: number;
  min: number | undefined;
  max: number | undefined;
};

const validStatsDisplays = new Set<StatsDisplayConfig>(STATS_DISPLAY_CONFIGS);

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

function normalizeStatsConfig(stats: StatsConfig): StatsConfig {
  return {
    startDate: typeof stats.startDate === "string" ? stats.startDate : "",
    entries: Array.isArray(stats.entries)
      ? stats.entries
          .filter((entry): entry is StatsConfig["entries"][number] => typeof entry === "object" && entry !== null)
          .map((entry) => ({
            id: typeof entry.id === "string" ? entry.id : "",
            name: typeof entry.name === "string" ? entry.name : "",
            statNames: Array.isArray(entry.statNames)
              ? entry.statNames.filter((statName): statName is string => typeof statName === "string")
              : [],
            display: Array.isArray(entry.display)
              ? entry.display.filter((display): display is StatsDisplayConfig =>
                  typeof display === "string" && validStatsDisplays.has(display as StatsDisplayConfig)
                )
              : [],
          }))
      : [],
  };
}

function translateStatsSection(config: SystemConfig): StatsSectionModel {
  const stats = normalizeStatsConfig(config.stats);

  return {
    startDate: {
      kind: "statsStartDate",
      label: "Stats start date",
      value: stats.startDate,
      eventBase: { kind: "setStatsStartDate" },
    },
    entries: stats.entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      statNames: entry.statNames,
      display: entry.display,
    })),
  };
}

function formatStatTotal(total: number): string {
  if (Number.isInteger(total)) return String(total);
  return String(Number(total.toFixed(6)));
}

function createEmptyStatsAggregateValues(): StatsAggregateValues {
  return {
    total: 0,
    count: 0,
    min: undefined,
    max: undefined,
  };
}

function addStatsValue(values: StatsAggregateValues, nextValue: number): StatsAggregateValues {
  return {
    total: values.total + nextValue,
    count: values.count + 1,
    min: values.min === undefined ? nextValue : Math.min(values.min, nextValue),
    max: values.max === undefined ? nextValue : Math.max(values.max, nextValue),
  };
}

function formatStatsDisplayLine(display: StatsDisplayConfig, values: StatsAggregateValues): string {
  if (display === "total") return `Total=${formatStatTotal(values.total)}`;
  if (display === "count") return `Count=${values.count}`;
  if (display === "average") {
    return values.count > 0 ? `Average=${formatStatTotal(values.total / values.count)}` : "Average=n/a";
  }

  if (values.min === undefined || values.max === undefined) return "Range=n/a";
  return `Range=${formatStatTotal(values.min)}-${formatStatTotal(values.max)}`;
}

export async function loadStatsSection(args: { repo: RenderBlockArgs["repo"]; endDate: IsoDate }): Promise<LoadedStatsSectionModel> {
  let config: SystemConfig;
  try {
    config = await args.repo.readConfig();
  } catch {
    return { kind: "statsError", message: "Unable to read config for stats." };
  }

  const stats = normalizeStatsConfig(config.stats);
  if (stats.entries.length === 0) {
    return { kind: "statsEmpty", message: "No stats configured." };
  }

  const startDate = tryParseIsoDate(stats.startDate);
  if (!startDate) {
    return { kind: "statsEmpty", message: "Set a stats start date to load stats." };
  }

  if (startDate > args.endDate) {
    return { kind: "statsEmpty", message: "Stats start date is after the current block date." };
  }

  const actionIds = new Set(config.actions.map((action) => action.id));
  const recordIds = new Set(config.records.map((record) => record.id));
  const aggregateValues = new Map<string, StatsAggregateValues>(
    stats.entries.map((entry) => [entry.id, createEmptyStatsAggregateValues()])
  );

  let date = startDate;
  while (date <= args.endDate) {
    if (await args.repo.existsDailyLog(date)) {
      const dayLog = await args.repo.readDailyLog(date);

      for (const entry of stats.entries) {
        let nextValuesTotal = 0;
        let hasValue = false;

        for (const statName of entry.statNames) {
          if (actionIds.has(statName)) {
            const raw = dayLog.actions?.[statName];
            if (typeof raw === "number" && Number.isFinite(raw)) {
              nextValuesTotal += raw;
              hasValue = true;
            }
            continue;
          }

          if (!recordIds.has(statName)) {
            continue;
          }

          const raw = dayLog.records?.[statName];
          const parsed = raw === undefined ? Number.NaN : Number(raw);
          if (Number.isFinite(parsed)) {
            nextValuesTotal += parsed;
            hasValue = true;
          }
        }

        if (hasValue) {
          aggregateValues.set(entry.id, addStatsValue(aggregateValues.get(entry.id) ?? createEmptyStatsAggregateValues(), nextValuesTotal));
        }
      }
    }

    date = addDays(date, 1);
  }

  return {
    kind: "statsTable",
    rows: stats.entries.map((entry) => ({
      name: entry.name,
      valueLines: entry.display.map((display) => formatStatsDisplayLine(display, aggregateValues.get(entry.id) ?? createEmptyStatsAggregateValues())),
    })),
  };
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
      if (weekStartLog?.startingScore && Object.keys(weekStartLog.startingScore).length > 0) {
        weekStartScores = weekStartLog.startingScore;
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
    stats: translateStatsSection(config),
  };
}
