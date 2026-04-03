import type { VaultRepo } from "../../vault/repo";
import { UserPlanEvent } from "../types";


export async function handleSetPlanTarget(repo: VaultRepo, evt: UserPlanEvent): Promise<void> {
    const plan = await repo.readPlan(evt.scope);
    const nextActions = { ...plan.actions, [evt.actionId]: evt.value };
    await repo.writePlan(evt.scope, { ...plan, actions: nextActions });
}
