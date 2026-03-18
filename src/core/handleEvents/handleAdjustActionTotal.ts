import { DailyLog, SystemConfig } from "../types";
import type { VaultRepo } from "../vault/repo";
import { UserActionEvent } from "./types";


export async function handleAdjustActionTotal(repo: VaultRepo, dayLog: DailyLog, config: SystemConfig, evt: UserActionEvent) {
    const current = dayLog.actions?.[evt.actionId] ?? 0;
    let next = Math.max(0, current + evt.delta);

    const action = config.actions.find((a) => a.id === evt.actionId);
    const max = action?.max;
    if (typeof max === "number" && Number.isFinite(max) && max >= 0) {
    next = Math.min(next, max);
    }
    const nextActions = { ...(dayLog.actions ?? {}), [evt.actionId]: next };

    // Save the totals immediately; recomputeChain will overwrite derived score fields.
    await repo.writeDailyLog(evt.date, { ...dayLog, actions: nextActions });
}

