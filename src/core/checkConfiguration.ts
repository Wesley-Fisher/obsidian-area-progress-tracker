import type { SystemConfig } from "./types";

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
    if (typeof obj.startDate !== "string") {
      issues.push({ message: "weeklyPlan.startDate must be a string", path: "weeklyPlan.startDate" });
    }
    const actions = obj.actions;
    if (!actions || typeof actions !== "object" || Array.isArray(actions)) {
      issues.push({ message: "weeklyPlan.actions must be an object", path: "weeklyPlan.actions" });
    }
  }

  const areaIds = config.areas.map((a) => a.id);
  const actionIds = config.actions.map((a) => a.id);

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
