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

  const areaIds = config.areas.map((a) => a.id);
  const actionIds = config.actions.map((a) => a.id);

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
