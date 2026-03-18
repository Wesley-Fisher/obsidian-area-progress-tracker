import { RenderDayModeArgs } from "./renderTypes";
import { ActivitiesLayout} from "../types";
import { renderActivitiesSectionModel } from "./renderFromModel";
import { translateActivitiesSection } from "./translate/translateActivitiesSection";

export function renderActivitiesSection(args: RenderDayModeArgs): void {
  // v1: tabs-only layout. Keep activitiesLayout in BlockConfig for future development.
  void (args.blockConfig.activitiesLayout satisfies ActivitiesLayout | undefined);

  const model = translateActivitiesSection({
    date: args.blockConfig.date,
    config: args.config,
    dayLog: args.dayLog,
  });

  renderActivitiesSectionModel(
    args.container,
    { date: args.blockConfig.date, onUserAction: args.onUserAction },
    model
  );
}

