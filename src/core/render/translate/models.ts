import type { ActionConfig, IsoDate, RecordConfig } from "../../types";
import type { UserEvent } from "../../handleEvents/types";

export type RenderBodyModel = RenderErrorModel | RenderDayBodyModel;

export type RenderErrorModel =
  | { kind: "errorText"; message: string }
  | { kind: "errorList"; message: string; items: string[] };

export type RenderDayBodyModel = {
  kind: "day";
  sections: DaySectionModel[];
};

export type DaySectionModel =
  | AreasSectionModel
  | ActivitiesSectionModel
  | PlanSectionModel;

export type AreasSectionModel =
  | { kind: "areasEmpty"; message: string }
  | { kind: "areasTable"; rows: AreaRowModel[] };

export type AreaRowModel = {
  areaName: string;
  daysSinceText: string;
  updatedScoreText: string;
  possibleDayText: string;
  possibleWeekText: string;
};

export type ActivitiesSectionModelEmpty = {
  kind: "activitiesEmpty";
  message: string;
}

export type ActivitiesSectionModelFilled = {
  kind: "activitiesTabs";
  groups: ActivitiesGroupModel[];
}

export type ActivitiesSectionModel =
  | ActivitiesSectionModelEmpty
  | ActivitiesSectionModelFilled;

export type ActivitiesGroupModel = {
  id: string;
  name: string;
  rows: Array<ActivityRowModel>;
  numActionsStillRequired: number;
};

export type ActivityRowModel =
  | {
      kind: "action";
      actionId: string;
      name: string;
      currentText: string;
      entry: ActionEntryModel;
      requiredLeft: number;
    }
  | {
      kind: "record";
      recordId: string;
      name: string;
      currentText: string;
      entry: RecordEntryModel;
    };

export type ActionEntryModel =
  | {
      kind: "button";
      plus: { label: string; disabled: boolean; event: UserEvent };
      minus: { label: string; disabled: boolean; event: UserEvent };
    }
  | {
      kind: "checkbox";
      disabled: boolean;
      checked: boolean;
      eventOnCheck: UserEvent;
      eventOnUncheck: UserEvent;
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
  | {
      kind: "button";
      plus: { label: string; disabled: boolean; event: UserEvent };
      minus: { label: string; disabled: boolean; event: UserEvent };
    }
  | {
      kind: "checkbox";
      disabled: boolean;
      checked: boolean;
      eventOnCheck: UserEvent;
      eventOnUncheck: UserEvent;
    }
  | {
      kind: "number";
      min?: string;
      max?: string;
      step?: string;
      value: string;
      eventBase: { kind: "setPlanTarget"; scope: "day" | "week"; actionId: string };
      current: number;
    };

export type PlanSectionModel =
  | { kind: "planHidden"; scope: "day" | "week"; toggle: ToggleModel; message: string }
  | { kind: "planNoActions"; scope: "day" | "week"; toggle: ToggleModel; message: string }
  | { kind: "planTabs"; scope: "day" | "week"; toggle: ToggleModel; groups: PlanGroupModel[] };

export type ToggleModel = {
  label: string;
  event: UserEvent;
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
