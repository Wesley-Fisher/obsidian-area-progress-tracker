import {
  BlockConfig,
  DailyLog,
  DailyPlanConfig,
  SystemConfig,
  WeeklyPlanConfig,
} from "../types";
import type { VaultRepo } from "../vault/repo";
import { UserEvent } from "../handleEvents/types";



export interface RenderBlockArgs {
  el: HTMLElement;
  blockConfig: BlockConfig;
  repo: VaultRepo;
  onUserAction: (evt: UserEvent) => Promise<void>;
}

export interface RenderDayModeArgs extends RenderBlockArgs {
  container: HTMLElement;
  config: SystemConfig;
  dayLog: DailyLog | null;
  dayPlan: DailyPlanConfig | null;
  weekPlan: WeeklyPlanConfig | null;
}