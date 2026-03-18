import type { Plugin, MarkdownPostProcessorContext } from "obsidian";
import {
  BlockConfig,
  DailyLog,
  PlanFile,
  SystemConfig,
} from "../types";
import type { VaultRepo } from "../vault/repo";
import { UserEvent } from "../handleEvents/types";



export interface RenderBlockArgs {
  plugin: Plugin;
  el: HTMLElement;
  ctx: MarkdownPostProcessorContext;
  blockConfig: BlockConfig;
  repo: VaultRepo;
  onUserAction: (evt: UserEvent) => Promise<void>;
}

export interface RenderDayModeArgs extends RenderBlockArgs {
  container: HTMLElement;
  config: SystemConfig;
  dayLog: DailyLog | null;
  dayPlan: PlanFile | null;
  weekPlan: PlanFile | null;
}