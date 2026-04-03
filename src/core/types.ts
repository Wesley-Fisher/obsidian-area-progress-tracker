export const CODE_BLOCK_NAME = "progress-tracker" as const;

export type IsoDate = `${number}-${number}-${number}`;

export type AreaId = string;
export type ActionId = string;
export type RecordId = string;
export type ActivityGroupId = string;

export interface ActivityGroupConfig {
  id: ActivityGroupId;
  name: string;
}

export interface AreaConfig {
  id: AreaId;
  name: string;
  minScore: number;
  maxScore: number;
  baseScore: number;
  dailyDecay: number;
}

export interface RequiredAction {
  action: ActionId;
  req: number;
}

export type ActionInputConfig =
  | { type: "checkbox" }
  | { type: "button"; step: number }
  | { type: "number"; min?: number; max?: number; step?: number };

export interface ActionConfig {
  id: ActionId;
  name: string;
  input: ActionInputConfig;
  effects: Record<AreaId, number>;
  max: number;
  groupIds: ActivityGroupId[];
}

export type RecordInputConfig =
  | { type: "text" }
  | { type: "number"; min?: number; max?: number; step?: number };

export interface RecordConfig {
  id: RecordId;
  name: string;
  input: RecordInputConfig;
  groupIds: ActivityGroupId[];
}

export interface DailyPlanConfig {
  /** Planned per-day action targets. Required to exist; may be empty. */
  actions: Partial<Record<ActionId, number>>;
}

export interface WeeklyPlanConfig {
  /** Planned per-week action targets. Required to exist; may be empty. */
  actions: Partial<Record<ActionId, number>>;
}

export interface SystemConfig {
  version: number;
  areas: AreaConfig[];
  groups: ActivityGroupConfig[];
  requiredActions: Partial<Record<AreaId, RequiredAction[]>>;
  actions: ActionConfig[];
  records: RecordConfig[];

  /** Planning targets are stored in config.json for easier future extension. */
  dailyPlan: DailyPlanConfig;
  weeklyPlan: WeeklyPlanConfig;
}

export interface AreaScore {
  score: number;
  daysSince: number;
  /**
   * Whether daily decay should be applied when rolling this score forward to the next day.
   *
   * Semantics: this flag is determined by the day's actions (typically via `requiredActions`) and
   * then consumed by the next day's `startingScore` computation.
   *
   * If missing in stored data, callers should treat it as `false`.
   */
  decayActive?: boolean;
}

export type Scores = Record<AreaId, AreaScore>;

export interface DailyLog {
  previousScore: Scores;
  startingScore: Scores;
  updatedScore: Scores;
  actions: Partial<Record<ActionId, number>>;
  /** Per-day record values (text-entry fields), not used for scoring. */
  records?: Partial<Record<RecordId, string>>;
  /** Per-day UI prefs (stored so they can differ per note/day). */
  ui?: {
    hidePlanDay?: boolean;
    hidePlanWeek?: boolean;
  };
}

export interface BlockConfig {
  date: IsoDate;
}
