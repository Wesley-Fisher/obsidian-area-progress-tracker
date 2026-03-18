import { RenderDayModeArgs } from "./renderTypes";
import { renderPlanSectionModel } from "./renderFromModel";
import { translatePlanSection } from "./translate/translatePlanSection";

export function renderPlanDaySection(args: RenderDayModeArgs): void {
  const model = translatePlanSection({
    scope: "day",
    date: args.blockConfig.date,
    config: args.config,
    dayLog: args.dayLog,
    plan: args.dayPlan,
  });

  renderPlanSectionModel(
    args.container,
    { date: args.blockConfig.date, onUserAction: args.onUserAction },
    model
  );
}