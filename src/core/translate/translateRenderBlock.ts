import { checkConfiguration } from "../checkConfiguration";
import type { RenderBlockArgs } from "../render/renderTypes";
import type { DaySectionModel, RenderBodyModel } from "./models";
import { translateAreasSection } from "./inner/translateAreasSection";
import { translateActivitiesSection } from "./inner/translateActivitiesSection";
import { translatePlanSection } from "./inner/translatePlanSection";
import type { DailyPlanConfig, SystemConfig, WeeklyPlanConfig } from "../types";

function defaultDailyPlan(): DailyPlanConfig {
  return { actions: {} };
}

function defaultWeeklyPlan(): WeeklyPlanConfig {
  return { actions: {} };
}

export async function translateRenderBlock(args: RenderBlockArgs): Promise<RenderBodyModel> {
  const { blockConfig } = args;
  const paths = args.repo.getPaths(blockConfig.date);

  // Load minimal data needed for rendering.
  let config: SystemConfig;
  let dayLog;
  let dayPlan: DailyPlanConfig;
  let weekPlan: WeeklyPlanConfig;

  try {
    config = await args.repo.readConfig();
  } catch {
    return { kind: "errorText", message: `Missing config: ${paths.configPath}` };
  }

  // Backward-compatible defaults if older configs are missing these fields.
  dayPlan = (config as Partial<SystemConfig>).dailyPlan ?? defaultDailyPlan();
  weekPlan = (config as Partial<SystemConfig>).weeklyPlan ?? defaultWeeklyPlan();
  dayPlan = { actions: dayPlan.actions ?? {} };
  weekPlan = { actions: weekPlan.actions ?? {} };

  try {
    dayLog = await args.repo.readDailyLog(blockConfig.date);
  } catch {
    return { kind: "errorText", message: `Missing daily log: ${paths.dailyLogPath}` };
  }

  const configIssues = checkConfiguration(config);
  if (configIssues.length > 0) {
    return {
      kind: "errorList",
      message: `Invalid config (${configIssues.length} issue(s)) in ${paths.configPath}:`,
      items: configIssues.map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message)),
    };
  }

  if (blockConfig.mode !== "day") {
    return { kind: "errorText", message: `Unsupported mode: ${blockConfig.mode}` };
  }

  const show = blockConfig.show ?? ["areas", "actions", "plan-day", "plan-week"];
  const sections: DaySectionModel[] = [];
  for (const part of show) {
    switch (part){
      case "areas":
        sections.push(translateAreasSection({config,dayLog,dayPlan,weekPlan,}));
        break;
      case "actions":
        sections.push(translateActivitiesSection({ date: blockConfig.date, config, dayLog }));
        break;
      case "plan-day":
        sections.push(translatePlanSection({ scope: "day", date: blockConfig.date, config, dayLog, plan: dayPlan }));
        break;
      case "plan-week":
        sections.push(translatePlanSection({ scope: "week", date: blockConfig.date, config, dayLog, plan: weekPlan }));
        break;
      default:
        break;
    }
  }

  return { kind: "day", sections };
}
