import { IsoDate, ActionId, RecordId } from "../types";

export interface UserActionEvent {
  kind: "adjustActionTotal";
  date: IsoDate;
  actionId: ActionId;
  delta: number;
}

export interface UserRecordEvent {
  kind: "setRecordValue";
  date: IsoDate;
  recordId: RecordId;
  value: string;
}

export interface UserPlanEvent {
  kind: "setPlanTarget";
  scope: "day" | "week";
  actionId: ActionId;
  value: number;
}

export interface UserDayUiEvent {
  kind: "setDayUiFlag";
  date: IsoDate;
  flag: "hidePlanDay" | "hidePlanWeek";
  value: boolean;
}

export type UserEvent = UserActionEvent | UserRecordEvent | UserPlanEvent | UserDayUiEvent;