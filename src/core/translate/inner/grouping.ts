import type { ActionConfig, ActivityColumnConfig, ActivityGroupConfig, RecordConfig, SystemConfig } from "../../types";

export type ActivityColumn = {
  id: string;
  name: string;
  config: ActivityColumnConfig;
  actions: ActionConfig[];
  records: RecordConfig[];
};

export type ActivityGroup = {
  id: string;
  name: string;
  columns: ActivityColumn[];
  actions: ActionConfig[];
  records: RecordConfig[];
};

function placementMatches(item: { placements: { groupId: string; columnId: string }[] }, groupId: string, columnId: string): boolean {
  return item.placements.some((placement) => placement.groupId === groupId && placement.columnId === columnId);
}

function groupColumns(group: ActivityGroupConfig): ActivityColumnConfig[] {
  return group.columns;
}

export function buildActivityGroupsFromConfig(config: SystemConfig): ActivityGroup[] {
  const records = config.records ?? [];
  const groups: ActivityGroup[] = [];

  for (const group of config.groups ?? []) {
    const columns = groupColumns(group).map((column) => ({
      id: column.id,
      name: column.name,
      config: column,
      actions: config.actions.filter((action) => placementMatches(action, group.id, column.id)),
      records: records.filter((record) => placementMatches(record, group.id, column.id)),
    }));
    const actions = [...new Map(columns.flatMap((column) => column.actions).map((action) => [action.id, action])).values()];
    const groupRecords = [...new Map(columns.flatMap((column) => column.records).map((record) => [record.id, record])).values()];
    if (actions.length === 0 && groupRecords.length === 0) continue;
    groups.push({ id: group.id, name: group.name, columns, actions, records: groupRecords });
  }

  const ungroupedActions = config.actions.filter((action) => action.placements.length === 0);
  const ungroupedRecords = records.filter((record) => record.placements.length === 0);
  if (ungroupedActions.length > 0 || ungroupedRecords.length > 0) {
    groups.push({
      id: "__ungrouped__",
      name: "Ungrouped",
      columns: [{ id: "default", name: "Ungrouped", config: { id: "default", name: "Ungrouped" }, actions: ungroupedActions, records: ungroupedRecords }],
      actions: ungroupedActions,
      records: ungroupedRecords,
    });
  }

  if (groups.length === 0) {
    groups.push({
      id: "__all__",
      name: "All",
      columns: [{ id: "default", name: "All", config: { id: "default", name: "All" }, actions: config.actions, records }],
      actions: config.actions,
      records,
    });
  }

  return groups;
}

export type ActionOnlyGroup = ActivityGroup;

export function buildActionOnlyGroupsFromConfig(config: SystemConfig): ActionOnlyGroup[] {
  return buildActivityGroupsFromConfig(config).map((group) => ({
    id: group.id,
    name: group.name,
    actions: group.actions,
    records: [],
    columns: group.columns.map((column) => ({ ...column, records: [] })),
  }));
}
