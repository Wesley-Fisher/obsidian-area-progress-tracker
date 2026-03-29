import type { ActionConfig, RecordConfig, SystemConfig } from "../types";

export type ActivityGroup = {
  id: string;
  name: string;
  actions: ActionConfig[];
  records: RecordConfig[];
};

export function buildActivityGroupsFromConfig(config: SystemConfig): ActivityGroup[] {
  const groupsInConfig = config.groups ?? [];
  const records = config.records ?? [];

  const ungroupedActions = config.actions.filter((a) => !a.groupIds || a.groupIds.length === 0);
  const ungroupedRecords = records.filter((r) => !r.groupIds || r.groupIds.length === 0);

  const groups: ActivityGroup[] = [];

  for (const group of groupsInConfig) {
    const a = config.actions.filter((act) => act.groupIds.includes(group.id));
    const r = records.filter((rec) => rec.groupIds.includes(group.id));
    if (a.length === 0 && r.length === 0) continue;
    groups.push({ id: group.id, name: group.name, actions: a, records: r });
  }

  if (ungroupedActions.length > 0 || ungroupedRecords.length > 0) {
    groups.push({ id: "__ungrouped__", name: "Ungrouped", actions: ungroupedActions, records: ungroupedRecords });
  }

  if (groups.length === 0) {
    groups.push({ id: "__all__", name: "All", actions: config.actions, records });
  }

  return groups;
}

export type ActionOnlyGroup = {
  id: string;
  name: string;
  actions: ActionConfig[];
};

export function buildActionOnlyGroupsFromConfig(config: SystemConfig): ActionOnlyGroup[] {
  const groupsInConfig = config.groups ?? [];
  const ungroupedActions = config.actions.filter((a) => !a.groupIds || a.groupIds.length === 0);

  const groups: ActionOnlyGroup[] = [];

  for (const group of groupsInConfig) {
    const a = config.actions.filter((act) => act.groupIds.includes(group.id));
    if (a.length === 0) continue;
    groups.push({ id: group.id, name: group.name, actions: a });
  }

  if (ungroupedActions.length > 0) {
    groups.push({ id: "__ungrouped__", name: "Ungrouped", actions: ungroupedActions });
  }

  if (groups.length === 0) {
    groups.push({ id: "__all__", name: "All", actions: config.actions });
  }

  return groups;
}
