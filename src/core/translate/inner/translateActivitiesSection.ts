import type { ActionConfig, DailyLog, IsoDate, RecordConfig, SystemConfig } from "../../types";
import type { ActivitiesColumnModel, ActivitiesSectionModel, ActivityRowModel, ActionEntryModel, RecordEntryModel } from "../models";
import { buildActivityGroupsFromConfig } from "./grouping";

function translateAction(args: { date: IsoDate; action: ActionConfig; dayLog: DailyLog | null; config: SystemConfig }): ActivityRowModel {
  const currentRaw = Number(args.dayLog?.actions?.[args.action.id] ?? 0);
  const current = Number.isFinite(currentRaw) ? currentRaw : 0;
  let needed = 0;
  for (const reqs of Object.values(args.config.requiredActions ?? {})) {
    for (const req of reqs ?? []) {
      if (req.action === args.action.id) needed = Math.max(req.req - current, needed);
    }
  }

  const configMax = typeof args.action.max === "number" && Number.isFinite(args.action.max) && args.action.max > 0 ? args.action.max : undefined;
  const entry: ActionEntryModel = args.action.input.type === "button"
    ? {
        kind: "button",
        plus: { label: "+", disabled: configMax !== undefined ? current >= configMax : false, event: { kind: "adjustActionTotal", date: args.date, actionId: args.action.id, delta: args.action.input.step } },
        minus: { label: "-", disabled: current <= 0, event: { kind: "adjustActionTotal", date: args.date, actionId: args.action.id, delta: -args.action.input.step } },
      }
    : (() => {
        const inputMax = typeof args.action.input.max === "number" && Number.isFinite(args.action.input.max) && args.action.input.max > 0 ? args.action.input.max : undefined;
        const effectiveMax = inputMax !== undefined && configMax !== undefined ? Math.min(inputMax, configMax) : (inputMax ?? configMax);
        return {
          kind: "number" as const,
          min: args.action.input.min !== undefined ? String(args.action.input.min) : undefined,
          max: effectiveMax !== undefined ? String(effectiveMax) : undefined,
          step: args.action.input.step !== undefined ? String(args.action.input.step) : undefined,
          value: String(current),
          eventBase: { kind: "adjustActionTotal" as const, date: args.date, actionId: args.action.id },
          current,
        };
      })();

  return { kind: "action", actionId: args.action.id, name: args.action.name, currentText: String(current), entry, requiredLeft: Math.max(needed, 0) };
}

function translateRecord(args: { date: IsoDate; record: RecordConfig; dayLog: DailyLog | null }): ActivityRowModel {
  const currentText = String(args.dayLog?.records?.[args.record.id] ?? "");
  const input = args.record.input;
  const entry: RecordEntryModel = {
    kind: "recordInput",
    inputType: input.type === "number" ? "number" : "text",
    min: input.type === "number" && input.min !== undefined ? String(input.min) : undefined,
    max: input.type === "number" && input.max !== undefined ? String(input.max) : undefined,
    step: input.type === "number" && input.step !== undefined ? String(input.step) : undefined,
    value: currentText,
    eventBase: { kind: "setRecordValue", date: args.date, recordId: args.record.id },
  };
  return { kind: "record", recordId: args.record.id, name: args.record.name, currentText, entry };
}

export function translateActivitiesSection(args: { date: IsoDate; config: SystemConfig; dayLog: DailyLog | null }): ActivitiesSectionModel {
  const records = args.config.records ?? [];
  if (args.config.actions.length === 0 && records.length === 0) return { kind: "activitiesEmpty", message: "No actions or records configured." };

  const groups = buildActivityGroupsFromConfig(args.config);
  const outGroups = groups.map((group) => {
    const columns: ActivitiesColumnModel[] = group.columns.map((column) => {
      const rows = [
        ...column.actions.map((action) => translateAction({ date: args.date, action, dayLog: args.dayLog, config: args.config })),
        ...column.records.map((record) => translateRecord({ date: args.date, record, dayLog: args.dayLog })),
      ];
      return {
        id: column.id,
        name: column.name,
        width: column.config.width,
        tableWidths: column.config.tableWidths,
        rows,
        numActionsStillRequired: rows.filter((row) => row.kind === "action" && row.requiredLeft > 0).length,
      };
    });
    return {
      id: group.id,
      name: group.name,
      columns,
      numActionsStillRequired: columns.reduce((total, column) => total + column.numActionsStillRequired, 0),
    };
  });

  return { kind: "activitiesTabs", groups: outGroups };
}
