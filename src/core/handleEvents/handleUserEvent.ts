import { UserEvent } from "./types";
import type { VaultRepo } from "../vault/repo";
import { recomputeForwardChain } from "../recomputeChain";

import { handleSetPlanTarget } from "./inner/handleSetPlanTarget";
import { handleAdjustActionTotal } from "./inner/handleAdjustActionTotal";

export async function handleUserEvent(evt: UserEvent, repo: VaultRepo): Promise<void> {
    if (
        evt.kind !== "adjustActionTotal" &&
        evt.kind !== "setRecordValue" &&
    evt.kind !== "setPlanTarget"
    ) {
        return;
    }

    await repo.ensureDataFolders();
  await repo.ensureConfigFile();

    if (evt.kind === "setPlanTarget") {
      await handleSetPlanTarget(repo, evt);
      return;
    }

    await repo.ensureDailyLogFile(evt.date);

    const dayLog = await repo.readDailyLog(evt.date);

    // Load config once; needed for recompute, and for enforcing per-action `max`.
    const config = await repo.readConfig();

    if (evt.kind === "adjustActionTotal") {
      await handleAdjustActionTotal(repo, dayLog, config, evt);
    }

    if (evt.kind === "setRecordValue") {
      const nextRecords = { ...(dayLog.records ?? {}), [evt.recordId]: evt.value };
      await repo.writeDailyLog(evt.date, { ...dayLog, records: nextRecords });
    }

    // Recompute forward until there is no next day file.
    await recomputeForwardChain({
      repo,
      config,
      startDate: evt.date,
      earlyExit: true,
    });
};