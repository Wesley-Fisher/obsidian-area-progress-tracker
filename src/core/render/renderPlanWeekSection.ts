import { RenderDayModeArgs } from "./renderTypes";
import { renderPlanSectionModel } from "./renderFromModel";
import { translatePlanSection } from "./translate/translatePlanSection";

export function renderPlanWeekSection(args: RenderDayModeArgs): void {
  const model = translatePlanSection({
    scope: "week",
    date: args.blockConfig.date,
    config: args.config,
    dayLog: args.dayLog,
    plan: args.weekPlan,
  });

  renderPlanSectionModel(
    args.container,
    { date: args.blockConfig.date, onUserAction: args.onUserAction },
    model
  );
}

