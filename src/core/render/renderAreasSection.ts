import { RenderDayModeArgs } from "./renderTypes";
import { renderAreasSectionModel } from "./renderFromModel";
import { translateAreasSection } from "../translate/translateAreasSection";

export function renderAreasSection(args: RenderDayModeArgs): void {
  const model = translateAreasSection({
    config: args.config,
    dayLog: args.dayLog,
    dayPlan: args.dayPlan,
    weekPlan: args.weekPlan,
  });

  renderAreasSectionModel(args.container, model);
}
