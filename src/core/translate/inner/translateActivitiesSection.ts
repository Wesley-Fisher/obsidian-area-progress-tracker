import type { DailyLog, IsoDate, SystemConfig } from "../../types";
import type { ActivitiesSectionModel, ActivitiesGroupModel, ActivityRowModel, ActionEntryModel, RecordEntryModel } from "../models";
import { buildActivityGroupsFromConfig } from "./grouping";

export function translateActivitiesSection(args: {
  date: IsoDate;
  config: SystemConfig;
  dayLog: DailyLog | null;
}): ActivitiesSectionModel {
  const records = args.config.records ?? [];
  if (args.config.actions.length === 0 && records.length === 0) {
    return { kind: "activitiesEmpty", message: "No actions or records configured." };
  }

  const groups = buildActivityGroupsFromConfig(args.config);
  const outGroups: ActivitiesGroupModel[] = [];

  for (const g of groups) {
    const rows: ActivityRowModel[] = [];
    let numActionsStillRequired = 0;

    for (const action of g.actions) {
      const currentRaw = Number(args.dayLog?.actions?.[action.id] ?? 0);
      const current = Number.isFinite(currentRaw) ? currentRaw : 0;
      const currentText = String(current);

      // Find the maximum required count of this action, across all possible requirements
      let needed = 0;
      if (args.config.requiredActions) {
        for (const areaReqKey in args.config.requiredActions) {
          if (args.config.requiredActions[areaReqKey])
          {
            for (const req of args.config.requiredActions[areaReqKey]) {
              if (req.action === action.id) {
                needed = Math.max(req.req - current, needed);
              }
            }
          }
        }
      }
      if (needed > 0)
      {
        numActionsStillRequired += 1;
      }

      const configMax =
        typeof action.max === "number" && Number.isFinite(action.max) && action.max > 0 ? action.max : undefined;

      const entry: ActionEntryModel = (() => {
        if (action.input.type === "button") {
          const step = action.input.step;
          return {
            kind: "button",
            plus: {
              label: "+",
              disabled: configMax !== undefined ? current >= configMax : false,
              event: { kind: "adjustActionTotal", date: args.date, actionId: action.id, delta: step },
            },
            minus: {
              label: "-",
              disabled: current <= 0,
              event: { kind: "adjustActionTotal", date: args.date, actionId: action.id, delta: -step },
            },
          };
        }

        const inputMax =
          typeof action.input.max === "number" && Number.isFinite(action.input.max) && action.input.max > 0
            ? action.input.max
            : undefined;
        const effectiveMax = inputMax !== undefined && configMax !== undefined ? Math.min(inputMax, configMax) : (inputMax ?? configMax);

        return {
          kind: "number",
          min: action.input.min !== undefined ? String(action.input.min) : undefined,
          max: effectiveMax !== undefined ? String(effectiveMax) : undefined,
          step: action.input.step !== undefined ? String(action.input.step) : undefined,
          value: String(current),
          eventBase: { kind: "adjustActionTotal", date: args.date, actionId: action.id },
          current,
        };
      })();

      rows.push({ kind: "action", actionId: action.id, name: action.name, currentText, entry, requiredLeft: Math.max(needed, 0)});
    }

    for (const rec of g.records) {
      const currentText = String(args.dayLog?.records?.[rec.id] ?? "");
      const entry: RecordEntryModel = {
        kind: "recordInput",
        inputType: rec.input.type === "number" ? "number" : "text",
        min: rec.input.type === "number" && rec.input.min !== undefined ? String(rec.input.min) : undefined,
        max: rec.input.type === "number" && rec.input.max !== undefined ? String(rec.input.max) : undefined,
        step: rec.input.type === "number" && rec.input.step !== undefined ? String(rec.input.step) : undefined,
        value: currentText,
        eventBase: { kind: "setRecordValue", date: args.date, recordId: rec.id },
      };
      rows.push({ kind: "record", recordId: rec.id, name: rec.name, currentText, entry });
    }

    outGroups.push({ id: g.id, name: g.name, rows, numActionsStillRequired: numActionsStillRequired});
  }

  return { kind: "activitiesTabs", groups: outGroups };
}
