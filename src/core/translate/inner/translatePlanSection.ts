import type { ActionConfig, DailyPlanConfig, SystemConfig, WeeklyPlanConfig } from "../../types";
import type { PlanColumnModel, PlanGroupModel, PlanRowModel, PlanSectionModel } from "../models";
import { buildActionOnlyGroupsFromConfig } from "./grouping";

function finiteNonNegativeNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function parseEffectiveMax(action: ActionConfig): number | undefined {
  const configMax = typeof action.max === "number" && Number.isFinite(action.max) && action.max > 0 ? action.max : undefined;
  const inputMax = action.input?.type === "number" && typeof action.input.max === "number" && Number.isFinite(action.input.max) && action.input.max > 0 ? action.input.max : undefined;
  if (configMax !== undefined && inputMax !== undefined) return Math.min(configMax, inputMax);
  return inputMax ?? configMax;
}

function planRow(scope: "day" | "week", action: ActionConfig, planActions: Partial<Record<string, number>>): PlanRowModel {
  const effectiveMax = parseEffectiveMax(action);
  const planned = effectiveMax === undefined ? finiteNonNegativeNumber(planActions[action.id] ?? 0) : Math.min(finiteNonNegativeNumber(planActions[action.id] ?? 0), effectiveMax);
  const eventBase = { kind: "setPlanTarget" as const, scope, actionId: action.id };
  const inputMin = action.input.type === "number" && typeof action.input.min === "number" && Number.isFinite(action.input.min) ? Math.max(0, action.input.min) : 0;
  const inputStep = action.input.type === "number" && typeof action.input.step === "number" && Number.isFinite(action.input.step) && action.input.step > 0 ? action.input.step : 1;
  return {
    actionId: action.id,
    name: action.name,
    plannedText: String(planned),
    scope,
    eventBase,
    entry: {
      kind: "stepperNumber",
      plus: { label: "+1", disabled: effectiveMax !== undefined ? planned >= effectiveMax : false, event: { ...eventBase, value: effectiveMax !== undefined ? Math.min(planned + 1, effectiveMax) : planned + 1 } },
      minus: { label: "-1", disabled: planned <= 0, event: { ...eventBase, value: Math.max(0, planned - 1) } },
      min: String(inputMin),
      max: effectiveMax !== undefined ? String(effectiveMax) : undefined,
      step: String(inputStep),
      value: String(planned),
      eventBase,
      current: planned,
    },
  };
}

export function translatePlanSection(args: { scope: "day" | "week"; config: SystemConfig; plan: DailyPlanConfig | WeeklyPlanConfig | null }): PlanSectionModel {
  if (args.config.actions.length === 0) return { kind: "planNoActions", scope: args.scope, message: "No actions configured." };
  const planActions = args.plan?.actions ?? {};
  const groups = buildActionOnlyGroupsFromConfig(args.config);
  const outGroups: PlanGroupModel[] = groups.map((group) => {
    const columns: PlanColumnModel[] = group.columns.map((column) => ({
      id: column.id,
      name: column.name,
      width: column.config.width,
      tableWidths: column.config.tableWidths,
      rows: column.actions.map((action) => planRow(args.scope, action, planActions)),
    }));
    return { id: group.id, name: group.name, columns };
  });
  return { kind: "planTabs", scope: args.scope, groups: outGroups };
}
