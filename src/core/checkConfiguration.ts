import { STATS_DISPLAY_CONFIGS, type StatsDisplayConfig, type SystemConfig } from "./types";

export interface ConfigurationIssue {
  message: string;
  path?: string;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isFiniteNonNegativeNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) dups.add(v);
    seen.add(v);
  }
  return [...dups];
}

const validStatsDisplays = new Set<StatsDisplayConfig>(STATS_DISPLAY_CONFIGS);

/**
 * Checks the overall configuration for validity.
 *
 * Returns a list of issues (empty means valid).
 * This is intended for UI error rendering.
 */
export function checkConfiguration(config: SystemConfig): ConfigurationIssue[] {
  const issues: ConfigurationIssue[] = [];

  // Planning config must exist (may be empty).
  const dailyPlan = (config as Partial<SystemConfig>).dailyPlan as unknown;
  if (!dailyPlan || typeof dailyPlan !== "object") {
    issues.push({ message: "Missing dailyPlan (expected object)", path: "dailyPlan" });
  } else {
    const actions = (dailyPlan as Record<string, unknown>).actions;
    if (!actions || typeof actions !== "object" || Array.isArray(actions)) {
      issues.push({ message: "dailyPlan.actions must be an object", path: "dailyPlan.actions" });
    }
  }

  const weeklyPlan = (config as Partial<SystemConfig>).weeklyPlan as unknown;
  if (!weeklyPlan || typeof weeklyPlan !== "object") {
    issues.push({ message: "Missing weeklyPlan (expected object)", path: "weeklyPlan" });
  } else {
    const obj = weeklyPlan as Record<string, unknown>;
    const actions = obj.actions;
    if (!actions || typeof actions !== "object" || Array.isArray(actions)) {
      issues.push({ message: "weeklyPlan.actions must be an object", path: "weeklyPlan.actions" });
    }
  }

  const areaIds = config.areas.map((a) => a.id);
  const actionIds = config.actions.map((a) => a.id);
  const recordIds = config.records.map((r) => r.id);
  const configuredGroupIds = config.groups.map((group) => group.id);
  const columnsByGroup = new Map<string, Set<string>>();
  for (let i = 0; i < config.groups.length; i++) {
    const group = config.groups[i];
    const columns = group.columns ?? [{ id: "default", name: group.name }];
    const columnIds = columns.map((column) => column.id);
    columnsByGroup.set(group.id, new Set(columnIds));
    for (const duplicate of findDuplicates(columnIds)) {
      issues.push({ message: `Duplicate column id: ${duplicate}`, path: `groups[${i}].columns[id=${duplicate}]` });
    }
  }

  const checkPlacements = (items: Array<{ placements: Array<{ groupId: string; columnId: string }> }>, path: string): void => {
    items.forEach((item, index) => {
      for (const [placementIndex, placement] of (item.placements ?? []).entries()) {
        const columns = columnsByGroup.get(placement.groupId);
        if (!configuredGroupIds.includes(placement.groupId)) {
          issues.push({ message: `Unknown placement group: ${placement.groupId}`, path: `${path}[${index}].placements[${placementIndex}].groupId` });
        } else if (!columns || !columns.has(placement.columnId)) {
          issues.push({ message: `Unknown placement column: ${placement.columnId}`, path: `${path}[${index}].placements[${placementIndex}].columnId` });
        }
      }
    });
  };
  checkPlacements(config.actions, "actions");
  checkPlacements(config.records, "records");

  const stats = (config as Partial<SystemConfig>).stats as unknown;
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) {
    issues.push({ message: "Missing stats (expected object)", path: "stats" });
  } else {
    const statsObj = stats as Record<string, unknown>;
    const entries = statsObj.entries;
    if (!Array.isArray(entries)) {
      issues.push({ message: "stats.entries must be an array", path: "stats.entries" });
    } else {
      const statsIds: string[] = [];
      const statTargets = new Set<string>([...actionIds, ...recordIds]);

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i] as unknown;
        const basePath = `stats.entries[${i}]`;
        const obj = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};

        if (!isNonEmptyString(obj.id)) {
          issues.push({ message: `${basePath}.id must be a non-empty string`, path: `${basePath}.id` });
        } else {
          statsIds.push(obj.id);
        }

        if (!isNonEmptyString(obj.name)) {
          issues.push({ message: `${basePath}.name must be a non-empty string`, path: `${basePath}.name` });
        }

        if (!Array.isArray(obj.statNames)) {
          issues.push({ message: `${basePath}.statNames must be an array`, path: `${basePath}.statNames` });
        } else if (obj.statNames.length === 0) {
          issues.push({ message: `${basePath}.statNames must contain at least one action or record id`, path: `${basePath}.statNames` });
        } else {
          for (let j = 0; j < obj.statNames.length; j++) {
            const statName = obj.statNames[j];
            if (!isNonEmptyString(statName)) {
              issues.push({ message: `${basePath}.statNames[${j}] must be a non-empty string`, path: `${basePath}.statNames[${j}]` });
            } else if (!statTargets.has(statName)) {
              issues.push({ message: `${basePath}.statNames[${j}] references unknown action or record: ${statName}`, path: `${basePath}.statNames[${j}]` });
            }
          }
        }

        if (!Array.isArray(obj.display)) {
          issues.push({ message: `${basePath}.display must be an array`, path: `${basePath}.display` });
        } else {
          for (let j = 0; j < obj.display.length; j++) {
            const displayValue = obj.display[j];
            if (typeof displayValue !== "string" || !validStatsDisplays.has(displayValue as StatsDisplayConfig)) {
              issues.push({
                message: `${basePath}.display[${j}] must be one of: ${STATS_DISPLAY_CONFIGS.join(", ")}`,
                path: `${basePath}.display[${j}]`,
              });
            }
          }
        }
      }

      for (const dup of findDuplicates(statsIds)) {
        issues.push({ message: `Duplicate stats entry id: ${dup}`, path: `stats.entries[id=${dup}]` });
      }
    }
  }

  for (let i = 0; i < config.areas.length; i++) {
    const area = config.areas[i] as unknown as Record<string, unknown>;
    if (!isFiniteNonNegativeNumber(area.dailyDecayAlways)) {
      issues.push({ message: `areas[${i}].dailyDecayAlways must be a finite non-negative number`, path: `areas[${i}].dailyDecayAlways` });
    }
    if (!isFiniteNonNegativeNumber(area.dailyDecayUnattended)) {
      issues.push({ message: `areas[${i}].dailyDecayUnattended must be a finite non-negative number`, path: `areas[${i}].dailyDecayUnattended` });
    }
  }

  for (const dup of findDuplicates(areaIds)) {
    issues.push({ message: `Duplicate area id: ${dup}`, path: `areas[id=${dup}]` });
  }
  for (const dup of findDuplicates(actionIds)) {
    issues.push({ message: `Duplicate action id: ${dup}`, path: `actions[id=${dup}]` });
  }

  const areaIdSet = new Set(areaIds);
  const actionIdSet = new Set(actionIds);

  const required = config.requiredActions;
  if (required) {
    for (const [areaId, reqList] of Object.entries(required)) {
      if (!areaIdSet.has(areaId)) {
        issues.push({ message: `requiredActions references unknown area: ${areaId}`, path: `requiredActions.${areaId}` });
        continue;
      }

      if (!Array.isArray(reqList)) {
        issues.push({ message: `requiredActions.${areaId} must be an array`, path: `requiredActions.${areaId}` });
        continue;
      }

      for (let i = 0; i < reqList.length; i++) {
        const raw = reqList[i] as unknown;
        const entry: Record<string, unknown> =
          typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
        const action = entry.action;
        const req = entry.req;

        const basePath = `requiredActions.${areaId}[${i}]`;

        if (!isNonEmptyString(action)) {
          issues.push({ message: `${basePath}.action must be a non-empty string`, path: `${basePath}.action` });
        } else if (!actionIdSet.has(action)) {
          issues.push({ message: `${basePath}.action references unknown action: ${action}`, path: `${basePath}.action` });
        }

        if (!isFiniteNonNegativeNumber(req)) {
          issues.push({ message: `${basePath}.req must be a finite non-negative number`, path: `${basePath}.req` });
        }
      }
    }
  }

  return issues;
}
