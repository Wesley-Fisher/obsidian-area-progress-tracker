import { RenderDayModeArgs } from "../renderTypes";
import { RecordConfig, SystemConfig } from "../../types";
import { renderTabbedGroups, renderThreeColumnTable, addThreeColRow } from "./commonTable";

export function renderActivitiesTabs(
  sec: HTMLElement,
  args: RenderDayModeArgs,
  records: RecordConfig[]
): void {
  if (args.config.actions.length === 0 && records.length === 0) {
    sec.createEl("div", { text: "No actions or records configured." });
    return;
  }

  const groups = buildActivityGroups(args, records);
  renderTabbedGroups(sec, groups, (panel, g) => {
    renderActivitiesTable(panel, args, g.actions, g.records);
  });
}


function renderActivitiesTable(
  container: HTMLElement,
  args: RenderDayModeArgs,
  actions: SystemConfig["actions"],
  records: RecordConfig[]
): void {
  renderThreeColumnTable(container, "apt-activities-table", (tbody) => {
    for (const action of actions) {
      const current = Number(args.dayLog?.actions?.[action.id] ?? 0);
      const safeCurrent = Number.isFinite(current) ? current : 0;
      addThreeColRow(tbody, action.name, String(safeCurrent), false, (cell) => {
        renderActionEntry(cell, args, action, safeCurrent);
      });
    }

    for (const rec of records) {
      const current = args.dayLog?.records?.[rec.id] ?? "";
      addThreeColRow(tbody, rec.name, String(current), false, (cell) => {
        renderRecordEntry(cell, args, rec, String(current));
      });
    }
  });
}

function renderActionEntry(
  container: HTMLElement,
  args: RenderDayModeArgs,
  action: SystemConfig["actions"][number],
  current: number
): void {
  const configMax =
    typeof action.max === "number" && Number.isFinite(action.max) && action.max > 0 ? action.max : undefined;

  if (action.input.type === "button") {
    const step = action.input.step;
    const plus = container.createEl("button", { text: "+" });
    if (configMax !== undefined) plus.disabled = current >= configMax;
    plus.onclick = () => {
      void args.onUserAction({
        kind: "adjustActionTotal",
        date: args.blockConfig.date,
        actionId: action.id,
        delta: step,
      });
    };

    const minus = container.createEl("button", { text: "-" });
    minus.disabled = current <= 0;
    minus.onclick = () => {
      void args.onUserAction({
        kind: "adjustActionTotal",
        date: args.blockConfig.date,
        actionId: action.id,
        delta: -step,
      });
    };
    return;
  }

  // number
  const input = container.createEl("input") as HTMLInputElement;
  input.type = "number";
  if (action.input.min !== undefined) input.min = String(action.input.min);
  const inputMax =
    typeof action.input.max === "number" && Number.isFinite(action.input.max) && action.input.max > 0
      ? action.input.max
      : undefined;
  const effectiveMax = inputMax !== undefined && configMax !== undefined ? Math.min(inputMax, configMax) : (inputMax ?? configMax);
  if (effectiveMax !== undefined) input.max = String(effectiveMax);
  if (action.input.step !== undefined) input.step = String(action.input.step);
  input.value = String(current);
  input.onchange = () => {
    const raw = Number(input.value);
    let next = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    if (effectiveMax !== undefined) next = Math.min(next, effectiveMax);
    void args.onUserAction({
      kind: "adjustActionTotal",
      date: args.blockConfig.date,
      actionId: action.id,
      delta: next - current,
    });
  };
}

function renderRecordEntry(container: HTMLElement, args: RenderDayModeArgs, rec: RecordConfig, current: string): void {
  const input = container.createEl("input") as HTMLInputElement;
  input.type = rec.input.type === "number" ? "number" : "text";
  if (rec.input.type === "number") {
    if (rec.input.min !== undefined) input.min = String(rec.input.min);
    if (rec.input.max !== undefined) input.max = String(rec.input.max);
    if (rec.input.step !== undefined) input.step = String(rec.input.step);
  }
  input.value = current;
  input.onchange = () => {
    void args.onUserAction({
      kind: "setRecordValue",
      date: args.blockConfig.date,
      recordId: rec.id,
      value: input.value,
    });
  };
}

export type ActivityGroup = {
  id: string;
  name: string;
  actions: SystemConfig["actions"];
  records: RecordConfig[];
};

export function buildActivityGroups(args: RenderDayModeArgs, records: RecordConfig[]): ActivityGroup[] {
  const groupsInConfig = args.config.groups ?? [];

  const ungroupedActions = args.config.actions.filter((a) => !a.groupIds || a.groupIds.length === 0);
  const ungroupedRecords = records.filter((r) => !r.groupIds || r.groupIds.length === 0);

  const groups: ActivityGroup[] = [];

  for (const group of groupsInConfig) {
    const a = args.config.actions.filter((act) => act.groupIds.includes(group.id));
    const r = records.filter((rec) => rec.groupIds.includes(group.id));
    if (a.length === 0 && r.length === 0) continue;
    groups.push({ id: group.id, name: group.name, actions: a, records: r });
  }

  if (ungroupedActions.length > 0 || ungroupedRecords.length > 0) {
    groups.push({ id: "__ungrouped__", name: "Ungrouped", actions: ungroupedActions, records: ungroupedRecords });
  }

  if (groups.length === 0) {
    groups.push({ id: "__all__", name: "All", actions: args.config.actions, records });
  }

  return groups;
}

export function buildActionOnlyGroups(args: RenderDayModeArgs): ActivityGroup[] {
  const groupsInConfig = args.config.groups ?? [];

  const ungroupedActions = args.config.actions.filter((a) => !a.groupIds || a.groupIds.length === 0);
  const groups: ActivityGroup[] = [];

  for (const group of groupsInConfig) {
    const a = args.config.actions.filter((act) => act.groupIds?.includes(group.id));
    if (a.length === 0) continue;
    groups.push({ id: group.id, name: group.name, actions: a, records: [] });
  }

  if (ungroupedActions.length > 0) {
    groups.push({ id: "__ungrouped__", name: "Ungrouped", actions: ungroupedActions, records: [] });
  }

  if (groups.length === 0) {
    groups.push({ id: "__all__", name: "All", actions: args.config.actions, records: [] });
  }

  return groups;
}


