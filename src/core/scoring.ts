import type { DailyLog, RecordId, Scores, SystemConfig } from "./types";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getAreaDailyDecayAlways(area: { dailyDecayAlways?: unknown }): number {
  return isFiniteNonNegativeNumber(area.dailyDecayAlways) ? area.dailyDecayAlways : 0;
}

function getAreaDailyDecayUnattended(area: { dailyDecayUnattended?: unknown }): number {
  return isFiniteNonNegativeNumber(area.dailyDecayUnattended) ? area.dailyDecayUnattended : 0;
}

function initScoresFromConfig(config: SystemConfig): Scores {
  const scores: Scores = {};
  for (const area of config.areas) {
    scores[area.id] = { score: area.baseScore, daysSince: 0, decayActive: false };
  }
  return scores;
}

export function normalizePreviousScores(config: SystemConfig, previous: Scores): Scores {
  const out: Scores = {};
  for (const area of config.areas) {
    const prev = previous[area.id];
    out[area.id] = prev
      ? { ...prev, decayActive: prev.decayActive ?? false }
      : { score: area.baseScore, daysSince: 0, decayActive: false };
  }
  // drop removed areas implicitly
  return out;
}

export interface RecomputeDayArgs {
  config: SystemConfig;
  previousDayUpdatedScore?: Scores; // if missing, seed from config
  actions: Partial<Record<string, number>>;
}

export interface RecomputeDayResult {
  previousScore: Scores;
  startingScore: Scores;
  updatedScore: Scores;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function requirementsMetForArea(config: SystemConfig, areaId: string, actions: Partial<Record<string, number>>): boolean {
  const reqs = config.requiredActions?.[areaId];
  if (!reqs || reqs.length === 0) return true;

  for (const r of reqs) {
    const req = r?.req;
    if (!isFiniteNonNegativeNumber(req) || req <= 0) return false;

    const totalRaw = actions?.[r.action] ?? 0;
    const total = typeof totalRaw === "number" ? totalRaw : Number(totalRaw);
    if (!Number.isFinite(total) || total < req) return false;
  }

  return true;
}

/**
 * Applies config-based constraints to action totals (currently: per-action `max`, and non-negative totals).
 *
 * Note: This intentionally does not delete unknown actionIds, to preserve user history.
 */
export function clampActionsToConfig(
  config: SystemConfig,
  actions: Partial<Record<string, number>>
): Partial<Record<string, number>> {
  const actionById = new Map(config.actions.map((a) => [a.id, a] as const));
  const out: Partial<Record<string, number>> = { ...actions };

  for (const [actionId, totalRaw] of Object.entries(actions ?? {})) {
    const totalNum = typeof totalRaw === "number" ? totalRaw : Number(totalRaw);
    if (!Number.isFinite(totalNum)) continue;

    let next = Math.max(0, totalNum);

    const action = actionById.get(actionId);
    if (action && isFiniteNonNegativeNumber(action.max) && action.max > 0) {
      next = Math.min(next, action.max);
    }

    out[actionId] = next;
  }

  return out;
}

/**
 * Pure function: derives scores for a day from previous day's updated score + action totals.
 * Matches the contract in init_notes_daily_log_files.md.
 */
export function recomputeDayScores(args: RecomputeDayArgs): RecomputeDayResult {
  const { config } = args;

  const clampedActions = clampActionsToConfig(config, args.actions ?? {});

  const previousScore = args.previousDayUpdatedScore
    ? normalizePreviousScores(config, args.previousDayUpdatedScore)
    : initScoresFromConfig(config);

  const startingScore: Scores = {};
  for (const area of config.areas) {
    const prev = previousScore[area.id];
    const shouldDecay = prev.decayActive ?? false;
    const decayed = prev.score - getAreaDailyDecayAlways(area) - (shouldDecay ? getAreaDailyDecayUnattended(area) : 0);
    startingScore[area.id] = {
      score: clamp(decayed, area.minScore, area.maxScore),
      daysSince: prev.daysSince + 1,
      decayActive: shouldDecay,
    };
  }

  const updatedScore: Scores = structuredClone(startingScore);
  const touched = new Set<string>();

  const actionById = new Map(config.actions.map((a) => [a.id, a] as const));
  for (const [actionId, totalRaw] of Object.entries(clampedActions ?? {})) {
    const total = typeof totalRaw === "number" ? totalRaw : Number(totalRaw);
    if (!Number.isFinite(total) || total === 0) continue;

    const action = actionById.get(actionId);
    if (!action) continue;

    // Enforce non-negative totals + optional per-day max.
    let effectiveTotal = Math.max(0, total);
    if (isFiniteNonNegativeNumber(action.max) && action.max > 0) {
      effectiveTotal = Math.min(effectiveTotal, action.max);
    }
    if (effectiveTotal === 0) continue;

    for (const [areaId, effect] of Object.entries(action.effects)) {
      const areaCfg = config.areas.find((a) => a.id === areaId);
      if (!areaCfg) continue;

      updatedScore[areaId].score = clamp(
        updatedScore[areaId].score + effect * effectiveTotal,
        areaCfg.minScore,
        areaCfg.maxScore
      );
      touched.add(areaId);
    }
  }

  for (const areaId of touched) {
    if (updatedScore[areaId]) updatedScore[areaId].daysSince = 0;
  }

  // Determine whether unattended decay should apply into the NEXT day.
  // Important: today's actions must not affect whether decay was applied at the start of today.
  //
  // Rules:
  // - If `requiredActions[areaId]` is configured (non-empty), use it to decide whether decay is suppressed.
  // - Otherwise (default), decay is suppressed if the area was touched by any non-zero action today.
  for (const area of config.areas) {
    const reqs = config.requiredActions?.[area.id];
    const hasExplicitReqs = Array.isArray(reqs) && reqs.length > 0;

    updatedScore[area.id].decayActive = hasExplicitReqs
      ? !requirementsMetForArea(config, area.id, clampedActions)
      : !touched.has(area.id);
  }

  return { previousScore, startingScore, updatedScore };
}

export function buildDailyLog(
  config: SystemConfig,
  previousDayUpdatedScore: Scores | undefined,
  actions: Partial<Record<string, number>>,
  records: Partial<Record<RecordId, string>> = {}
): DailyLog {
  const { previousScore, startingScore, updatedScore } = recomputeDayScores({
    config,
    previousDayUpdatedScore,
    actions,
  });

  return {
    previousScore,
    startingScore,
    updatedScore,
    actions,
    records,
  };
}
