import type { VaultRepo } from "../../vault/repo";
import { UserDayUiEvent } from "../types";

export async function handleSetDayUIFlag(repo: VaultRepo, evt: UserDayUiEvent): Promise<void> {
    await repo.ensureConfigFile();
    await repo.ensureDailyLogFile(evt.date);

    const dayLog = await repo.readDailyLog(evt.date);
    const nextUi = { ...(dayLog.ui ?? {}), [evt.flag]: evt.value };
    await repo.writeDailyLog(evt.date, { ...dayLog, ui: nextUi });
}