import { PlanFile } from "../types";
import type { VaultRepo } from "../vault/repo";
import { UserPlanEvent } from "./types";


export async function handleSetPlanTarget(repo: VaultRepo, evt: UserPlanEvent): Promise<void> {
    let plan: PlanFile;
    try {
        plan = await repo.readPlan(evt.scope);
    } catch {
        plan = { actions: {} };
    }

    const nextActions = { ...(plan.actions ?? {}), [evt.actionId]: evt.value };
    await repo.writePlan(evt.scope, { ...plan, actions: nextActions });
}
