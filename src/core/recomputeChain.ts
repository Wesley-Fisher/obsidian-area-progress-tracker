import type { DailyLog, IsoDate, Scores, SystemConfig } from "./types";
import { addDays } from "./date";
import { buildDailyLog, clampActionsToConfig } from "./scoring";
import type { VaultRepo } from "./vault/repo";

export interface RecomputeChainArgs {
  repo: VaultRepo;
  config: SystemConfig;
  startDate: IsoDate;
  /**
   * If true, stop when a recomputed day's updatedScore matches the prior stored updatedScore.
   * Safe when no future-day actions/config changed.
   */
  earlyExit?: boolean;
}

export function scoresEqual(a: Scores, b: Scores): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    const av = a[k];
    const bv = b[k];
    if (!bv) return false;
    if (av.score !== bv.score || av.daysSince !== bv.daysSince) return false;
    if ((av.decayActive ?? false) !== (bv.decayActive ?? false)) return false;
  }
  return true;
}

export async function seedFromPreviousDay(
    currentDate: IsoDate,
    repo: VaultRepo):
      Promise<Scores | undefined>
  {
    let prevUpdated: Scores | undefined;

    // Seed from startDate-1 if it exists.
    const prevDate = addDays(currentDate, -1);
    if (await repo.existsDailyLog(prevDate)) {
      const prevLog = await repo.readDailyLog(prevDate);
      prevUpdated = prevLog.updatedScore;
    }
    return prevUpdated
};

export async function mergePreviousIntoNextDay(date: IsoDate, existingRaw: Record<string, unknown> | undefined, config: SystemConfig, prevUpdated: Scores | undefined): Promise<{ merged: DailyLog, nextLog: DailyLog, didChange: boolean}> {
    const existing = existingRaw as DailyLog | undefined;

    const actions = clampActionsToConfig(config, existing?.actions ?? {});
    const records = existing?.records ?? {};
    const nextLog = buildDailyLog(config, prevUpdated, actions, records);

    const priorUpdated = existing?.updatedScore;

    // Preserve any non-derived fields already present in the file (future-proofing).
    const merged = existingRaw ? ({ ...existingRaw, ...nextLog, actions, records } as DailyLog) : nextLog;

    const didChange = priorUpdated && scoresEqual(priorUpdated, nextLog.updatedScore) ? false : true;
    return { merged, nextLog, didChange};
}

export async function recomputeForwardChain(args: RecomputeChainArgs): Promise<void> {
  const { repo, config, earlyExit } = args;

  let date = args.startDate;

  let prevUpdated = await seedFromPreviousDay(date, repo);

  // Recompute while the day exists (or the start day), and continue as long as the next day exists.
  // This matches the "naturally exits fast when working on today" approach.
  //
  // v1 behavior: if a day file doesn't exist in the chain, stop.
  for (;;) {
    const exists = await repo.existsDailyLog(date);
    if (!exists && date !== args.startDate) break;

    const existingRaw: Record<string, unknown> | undefined = exists ? await repo.readDailyLogRaw(date) : undefined;
    
    const { merged, nextLog, didChange } = await mergePreviousIntoNextDay(date, existingRaw, config, prevUpdated);
    
    await repo.writeDailyLogRaw(date, merged);

    if (earlyExit && !didChange) {
      break;
    }

    prevUpdated = nextLog.updatedScore;
    const nextDate = addDays(date, 1);
    if (!(await repo.existsDailyLog(nextDate))) break;
    date = nextDate;
  }
}
