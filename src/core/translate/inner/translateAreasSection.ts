import type { DailyLog, DailyPlanConfig, Scores, SystemConfig, WeeklyPlanConfig } from "../../types";
import type { AreasSectionModel, AreaRowModel } from "../models";

export function translateAreasSection(args: {
  config: SystemConfig;
  dayLog: DailyLog | null;
  dayPlan: DailyPlanConfig | null;
  weekPlan: WeeklyPlanConfig | null;
  weekStartScores?: Scores;
}): AreasSectionModel {
  const updatedScores = args.dayLog?.updatedScore;
  if (!updatedScores || Object.keys(updatedScores).length === 0) {
    return { kind: "areasEmpty", message: "No scores yet (configure areas and/or create the day log)." };
  }

  const startingScores = args.dayLog?.startingScore;

  const rows: AreaRowModel[] = [];
  for (const area of args.config.areas) {
    const updated = updatedScores[area.id];
    if (!updated) continue;

    const start = startingScores?.[area.id];
    // Baseline for "possible" calculations is the day's starting score (decay applied).
    // Fall back to updated score if starting scores are missing for this area.
    const dayStartScore = start?.score ?? updated.score;

    const possibleDay = computePossibleScoreForArea({
      areaId: area.id,
      currentUpdatedScore: dayStartScore,
      config: args.config,
      dayLog: args.dayLog,
      plan: args.dayPlan,
      subtractCurrentDayTotals: false,
    });

    const possibleWeek = computePossibleScoreForArea({
      areaId: area.id,
      currentUpdatedScore: args.weekStartScores?.[area.id]?.score ?? dayStartScore,
      config: args.config,
      dayLog: args.dayLog,
      plan: args.weekPlan,
      subtractCurrentDayTotals: false,
      alwaysDecayApplications: 7,
    });

    rows.push({
      areaName: area.name,
      daysSinceText: String(updated.daysSince),
      startingScoreText: String(dayStartScore),
      updatedScoreText: String(updated.score),
      possibleDayText: possibleDay === null ? "—" : String(possibleDay),
      possibleWeekText: possibleWeek === null ? "—" : String(possibleWeek),
    });
  }

  if (rows.length === 0) {
    return { kind: "areasEmpty", message: "No scores yet (configure areas and/or create the day log)." };
  }

  return { kind: "areasTable", rows };
}

function computePossibleScoreForArea(args: {
  areaId: string;
  currentUpdatedScore: number;
  config: SystemConfig;
  dayLog: DailyLog | null;
  plan: DailyPlanConfig | WeeklyPlanConfig | null;
  subtractCurrentDayTotals: boolean;
  alwaysDecayApplications?: number;
}): number | null {
  const planActions = args.plan?.actions;
  if (!planActions || Object.keys(planActions).length === 0) return null;

  const areaCfg = args.config.areas.find((a) => a.id === args.areaId);
  if (!areaCfg) return null;

  let delta = 0;
  const currentTotals = args.dayLog?.actions ?? {};

  const actionById = new Map(args.config.actions.map((a) => [a.id, a] as const));
  for (const [actionId, plannedRaw] of Object.entries(planActions)) {
    const planned = typeof plannedRaw === "number" ? plannedRaw : Number(plannedRaw);
    if (!Number.isFinite(planned) || planned <= 0) continue;

    const action = actionById.get(actionId);
    if (!action) continue;

    const done = args.subtractCurrentDayTotals ? Number(currentTotals[actionId] ?? 0) : 0;
    const remaining = Math.max(0, planned - (Number.isFinite(done) ? done : 0));
    if (remaining === 0) continue;

    const effect = action.effects[args.areaId];
    if (typeof effect !== "number" || !Number.isFinite(effect) || effect === 0) continue;

    delta += effect * remaining;
  }

  const alwaysDecayApplications = typeof args.alwaysDecayApplications === "number" ? args.alwaysDecayApplications : 0;
  const alwaysDecay = typeof areaCfg.dailyDecayAlways === "number" && Number.isFinite(areaCfg.dailyDecayAlways)
    ? areaCfg.dailyDecayAlways
    : 0;
  const possible = args.currentUpdatedScore + delta - alwaysDecay * alwaysDecayApplications;
  return Math.max(areaCfg.minScore, Math.min(areaCfg.maxScore, possible));
}
