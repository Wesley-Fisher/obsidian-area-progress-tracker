import type { ActionConfig, IsoDate, RecordConfig } from "../types";
import type { UserEvent } from "../handleEvents/types";

export type RenderBodyModel = RenderErrorModel | RenderDashboardBodyModel;

export type RenderErrorModel =
  | { kind: "errorText"; message: string }
  | { kind: "errorList"; message: string; items: string[] };

export type RenderDashboardBodyModel = {
  kind: "dashboard";
  areas: AreasSectionModel;
  actions: ActivitiesSectionModel;
  planDay: PlanSectionModel;
  planWeek: PlanSectionModel;
};

export type AreasSectionModelEmpty = {
  kind: "areasEmpty";
  message: string;
};

export type AreasSectionModelFilled = {
  kind: "areasTable";
  rows: AreaRowModel[];
};

export type AreasSectionModel =
  | AreasSectionModelEmpty
  | AreasSectionModelFilled;

export type AreaRowModel = {
  areaName: string;
  daysSinceText: string;
  startingScoreText: string;
  updatedScoreText: string;
  possibleDayText: string;
  possibleWeekText: string;
};

export type ActivitiesSectionModelEmpty = {
  kind: "activitiesEmpty";
  message: string;
};

export type ActivitiesSectionModelFilled = {
  kind: "activitiesTabs";
  groups: ActivitiesGroupModel[];
};

export type ActivitiesSectionModel =
  | ActivitiesSectionModelEmpty
  | ActivitiesSectionModelFilled;

export type ActivitiesGroupModel = {
  id: string;
  name: string;
  rows: Array<ActivityRowModel>;
  numActionsStillRequired: number;
};

export type ActivityRowModelAction = {
      kind: "action";
      actionId: string;
      name: string;
      currentText: string;
      entry: ActionEntryModel;
      requiredLeft: number;
};

export type ActivityRowModelRecord = {
      kind: "record";
      recordId: string;
      name: string;
      currentText: string;
      entry: RecordEntryModel;
};

export type ActivityRowModel =
  | ActivityRowModelAction
  | ActivityRowModelRecord
  ;

export type ActionEntryModel =
  | {
      kind: "button";
      plus: { label: string; disabled: boolean; event: UserEvent };
      minus: { label: string; disabled: boolean; event: UserEvent };
    }
  | {
      kind: "number";
      min?: string;
      max?: string;
      step?: string;
      value: string;
      eventBase: { kind: "adjustActionTotal"; date: IsoDate; actionId: string };
      current: number;
    };

export type RecordEntryModel = {
  kind: "recordInput";
  inputType: "text" | "number";
  min?: string;
  max?: string;
  step?: string;
  value: string;
  eventBase: { kind: "setRecordValue"; date: IsoDate; recordId: string };
};

export type PlanEntryModel =
  {
      kind: "stepperNumber";
      plus: { label: string; disabled: boolean; event: UserEvent };
      minus: { label: string; disabled: boolean; event: UserEvent };
      min?: string;
      max?: string;
      step?: string;
      value: string;
      eventBase: { kind: "setPlanTarget"; scope: "day" | "week"; actionId: string };
      current: number;
    };

export type PlanSectionModel =
  | { kind: "planNoActions"; scope: "day"; message: string }
  | { kind: "planTabs"; scope: "day"; groups: PlanGroupModel[] }
  | { kind: "planNoActions"; scope: "week"; weekStartDate: WeekStartDateModel; message: string }
  | { kind: "planTabs"; scope: "week"; weekStartDate: WeekStartDateModel; groups: PlanGroupModel[] };

export type WeekStartDateModel = {
  kind: "weekStartDate";
  label: string;
  value: string;
  eventBase: { kind: "setWeeklyPlanStartDate" };
};

export type PlanGroupModel = {
  id: string;
  name: string;
  rows: PlanRowModel[];
};

export type PlanRowModel = {
  actionId: string;
  name: string;
  plannedText: string;
  scope: "day" | "week";
  eventBase: { kind: "setPlanTarget"; scope: "day" | "week"; actionId: string };
  entry: PlanEntryModel;
};

export type GroupingInputs = {
  groupsInConfig: Array<{ id: string; name: string }>;
  actions: ActionConfig[];
  records: RecordConfig[];
};
