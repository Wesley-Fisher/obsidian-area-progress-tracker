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
  /** Optional per-day cap on how many times this action can be recorded. */
  max?: number;
  /** Optional UI grouping for columns/tabs (independent of Areas). */
  groupIds: ActivityGroupId[];
}

export type RecordInputConfig =
  | { type: "text" }
  | { type: "number"; min?: number; max?: number; step?: number };

export interface RecordConfig {
  id: RecordId;
  name: string;
  input: RecordInputConfig;
  /** Optional UI grouping for columns/tabs (independent of Areas). */
  groupIds: ActivityGroupId[];
}

export interface SystemConfig {
  version: number;
  timezone?: string;
  weekStart?: "monday" | "sunday";
  areas: AreaConfig[];
  /**
   * Optional per-area requirements that, when met for a day, suppress daily decay for that area.
   * Example: { "health": [{ "action": "walk", "req": 2 }] }
   */
  requiredActions?: Partial<Record<AreaId, RequiredAction[]>>;
  /** Optional UI groups for organizing actions/records (morning/work/admin, etc.). */
  groups?: ActivityGroupConfig[];
  actions: ActionConfig[];
  records?: RecordConfig[];
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

export type ActivitiesLayout = "list" | "columns" | "tabs";

export type PossibleModes = "day";

export type ShowableAreas = "areas" | "actions" | "plan-day" | "plan-week";

export interface BlockConfig {
  mode: PossibleModes;
  date: IsoDate;
  show?: Array<ShowableAreas>;
  /** Controls how actions + records are visually grouped. Defaults to "list". */
  activitiesLayout?: ActivitiesLayout;
}


export type PlanFile = { actions?: Partial<Record<string, number>> };
