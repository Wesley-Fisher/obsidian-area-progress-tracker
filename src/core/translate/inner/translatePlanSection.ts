import type { ActionConfig, DailyPlanConfig, SystemConfig, WeeklyPlanConfig } from "../../types";
import type { PlanGroupModel, PlanSectionModel } from "../models";
import { buildActionOnlyGroupsFromConfig } from "./grouping";

function finiteNonNegativeNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function parseEffectiveMax(action: ActionConfig): number | undefined {
  const configMax =
    typeof action.max === "number" && Number.isFinite(action.max) && action.max > 0 ? action.max : undefined;

  const inputMaxRaw = action.input?.type === "number" ? action.input.max : undefined;
  const inputMax =
    typeof inputMaxRaw === "number" && Number.isFinite(inputMaxRaw) && inputMaxRaw > 0 ? inputMaxRaw : undefined;

  if (configMax !== undefined && inputMax !== undefined) return Math.min(configMax, inputMax);
  return inputMax ?? configMax;
}

function parsePlanMin(action: ActionConfig): string {
  const inputMinRaw = action.input.type === "number" ? action.input.min : undefined;
  const inputMin = typeof inputMinRaw === "number" && Number.isFinite(inputMinRaw) ? inputMinRaw : 0;
  return String(Math.max(0, inputMin));
}

function parsePlanStep(action: ActionConfig): string {
  const inputStepRaw = action.input.type === "number" ? action.input.step : undefined;
  const inputStep =
    typeof inputStepRaw === "number" && Number.isFinite(inputStepRaw) && inputStepRaw > 0
      ? inputStepRaw
      : 1;
  return String(inputStep);
}

export function translatePlanSection(args: {
  scope: "day" | "week";
  config: SystemConfig;
  plan: DailyPlanConfig | WeeklyPlanConfig | null;
}): PlanSectionModel {
  if (args.config.actions.length === 0) {
    return { kind: "planNoActions", scope: args.scope, message: "No actions configured." };
  }

  const planActions = args.plan?.actions ?? {};
  const groups = buildActionOnlyGroupsFromConfig(args.config);
  const outGroups: PlanGroupModel[] = [];

  for (const g of groups) {
    const rows = g.actions.map((action) => {
      const effectiveMax = parseEffectiveMax(action);
      const plannedRaw = planActions[action.id] ?? 0;
      let planned = finiteNonNegativeNumber(plannedRaw);
      if (effectiveMax !== undefined) planned = Math.min(planned, effectiveMax);

      const eventBase = { kind: "setPlanTarget", scope: args.scope, actionId: action.id } as const;

      const entry = {
        kind: "stepperNumber" as const,
        plus: {
          label: "+1",
          disabled: effectiveMax !== undefined ? planned >= effectiveMax : false,
          event: {
            kind: "setPlanTarget",
            scope: args.scope,
            actionId: action.id,
            value: effectiveMax !== undefined ? Math.min(planned + 1, effectiveMax) : planned + 1,
          } as const,
        },
        minus: {
          label: "-1",
          disabled: planned <= 0,
          event: {
            kind: "setPlanTarget",
            scope: args.scope,
            actionId: action.id,
            value: Math.max(0, planned - 1),
          } as const,
        },
        min: parsePlanMin(action),
        max: effectiveMax !== undefined ? String(effectiveMax) : undefined,
        step: parsePlanStep(action),
        value: String(planned),
        eventBase,
        current: planned,
      };

      return {
        actionId: action.id,
        name: action.name,
        plannedText: String(planned),
        scope: args.scope,
        eventBase,
        entry,
      };
    });
    outGroups.push({ id: g.id, name: g.name, rows });
  }

  return { kind: "planTabs", scope: args.scope, groups: outGroups };
}
