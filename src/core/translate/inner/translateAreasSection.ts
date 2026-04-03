import type { DailyLog, DailyPlanConfig, Scores, SystemConfig, WeeklyPlanConfig } from "../../types";
import type { AreasSectionModel, AreaRowModel } from "../models";

export function translateAreasSection(args: {
  config: SystemConfig;
  dayLog: DailyLog | null;
  dayPlan: DailyPlanConfig | null;
  weekPlan: WeeklyPlanConfig | null;
  weekStartScores?: Scores;
}): AreasSectionModel {
  const scores = args.dayLog?.updatedScore;
  if (!scores || Object.keys(scores).length === 0) {
    return { kind: "areasEmpty", message: "No scores yet (configure areas and/or create the day log)." };
  }

  const rows: AreaRowModel[] = [];
  for (const area of args.config.areas) {
    const s = scores[area.id];
    if (!s) continue;

    const possibleDay = computePossibleScoreForArea({
      areaId: area.id,
      currentUpdatedScore: s.score,
      config: args.config,
      dayLog: args.dayLog,
      plan: args.dayPlan,
      subtractCurrentDayTotals: true,
    });

    const possibleWeek = computePossibleScoreForArea({
      areaId: area.id,
      currentUpdatedScore: args.weekStartScores?.[area.id]?.score ?? area.baseScore,
      config: args.config,
      dayLog: args.dayLog,
      plan: args.weekPlan,
      subtractCurrentDayTotals: false,
    });

    rows.push({
      areaName: area.name,
      daysSinceText: String(s.daysSince),
      updatedScoreText: String(s.score),
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

  const possible = args.currentUpdatedScore + delta;
  return Math.max(areaCfg.minScore, Math.min(areaCfg.maxScore, possible));
}
