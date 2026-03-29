import { checkConfiguration } from "../checkConfiguration";
import type { RenderBlockArgs } from "../render/renderTypes";
import type { DaySectionModel, RenderBodyModel } from "./models";
import { translateAreasSection } from "./translateAreasSection";
import { translateActivitiesSection } from "./translateActivitiesSection";
import { translatePlanSection } from "./translatePlanSection";

export async function translateRenderBlock(args: RenderBlockArgs): Promise<RenderBodyModel> {
  const { blockConfig } = args;
  const paths = args.repo.getPaths(blockConfig.date);

  // Load minimal data needed for rendering.
  let config;
  let dayLog;
  let dayPlan;
  let weekPlan;

  try {
    config = await args.repo.readConfig();
  } catch {
    return { kind: "errorText", message: `Missing config: ${paths.configPath}` };
  }

  try {
    dayLog = await args.repo.readDailyLog(blockConfig.date);
  } catch {
    return { kind: "errorText", message: `Missing daily log: ${paths.dailyLogPath}` };
  }

  try {
    dayPlan = await args.repo.readPlan("day");
  } catch {
    return { kind: "errorText", message: `Missing daily plan: ${paths.dayPlanPath}` };
  }

  try {
    weekPlan = await args.repo.readPlan("week");
  } catch {
    return { kind: "errorText", message: `Missing weekly plan: ${paths.weekPlanPath}` };
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
