import type { ActionConfig, DailyPlanConfig, SystemConfig, WeeklyPlanConfig } from "../../types";
import type { PlanGroupModel, PlanSectionModel } from "../models";
import { buildActionOnlyGroupsFromConfig } from "./grouping";

function finiteNonNegativeNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function parseEffectiveMax(action: ActionConfig): number | undefined {
  const configMax =
    typeof action.max === "number" && Number.isFinite(action.max) && action.max >= 0 ? action.max : undefined;

  const inputMaxRaw = action.input?.type === "number" ? action.input.max : undefined;
  const inputMax =
    typeof inputMaxRaw === "number" && Number.isFinite(inputMaxRaw) && inputMaxRaw >= 0 ? inputMaxRaw : undefined;

  if (configMax !== undefined && inputMax !== undefined) return Math.min(configMax, inputMax);
  return inputMax ?? configMax;
}

export function translatePlanSection(args: {
  scope: "day" | "week";
  config: SystemConfig;
  plan: DailyPlanConfig | WeeklyPlanConfig | null;
}): PlanSectionModel {
  if (args.config.actions.length === 0) {
    return {
      kind: "planNoActions",
      scope: args.scope,
      message: "No actions configured.",
    };
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

      const entry = (() => {
        if (action.input.type === "button") {
          const stepRaw = action.input.step;
          const step = finiteNonNegativeNumber(stepRaw) || 1;
          return {
            kind: "button" as const,
            plus: {
              label: "+",
              disabled: effectiveMax !== undefined ? planned >= effectiveMax : false,
              event: {
                kind: "setPlanTarget",
                scope: args.scope,
                actionId: action.id,
                value: effectiveMax !== undefined ? Math.min(planned + step, effectiveMax) : planned + step,
              } as const,
            },
            minus: {
              label: "-",
              disabled: planned <= 0,
              event: {
                kind: "setPlanTarget",
                scope: args.scope,
                actionId: action.id,
                value: Math.max(0, planned - step),
              } as const,
            },
          };
        }

        if (action.input.type === "checkbox") {
          const disabledByMax = effectiveMax === 0;
          const checked = !disabledByMax && planned > 0;
          const planned01 = checked ? 1 : 0;
          planned = planned01;
          return {
            kind: "checkbox" as const,
            disabled: disabledByMax,
            checked,
            eventOnCheck: { kind: "setPlanTarget", scope: args.scope, actionId: action.id, value: 1 } as const,
            eventOnUncheck: { kind: "setPlanTarget", scope: args.scope, actionId: action.id, value: 0 } as const,
          };
        }

        const min = action.input.min !== undefined ? String(action.input.min) : undefined;
        const max = effectiveMax !== undefined ? String(effectiveMax) : (action.input.max !== undefined ? String(action.input.max) : undefined);
        const step = action.input.step !== undefined ? String(action.input.step) : undefined;
        return {
          kind: "number" as const,
          min,
          max,
          step,
          value: String(planned),
          eventBase,
          current: planned,
        };
      })();

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
