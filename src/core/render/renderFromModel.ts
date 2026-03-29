import type { IsoDate } from "../types";
import type { UserEvent } from "../handleEvents/types";
import type {
  ActivitiesSectionModel,
  ActionEntryModel,
  AreasSectionModel,
  PlanEntryModel,
  PlanSectionModel,
  RecordEntryModel,
  RenderBodyModel,
  RenderErrorModel,
  ActivitiesSectionModelEmpty,
  ActivitiesSectionModelFilled,
} from "../translate/models";
import { addThreeColRow, renderTabbedGroups, renderThreeColumnTable } from "./inner/commonTable";

export type RenderRuntime = {
  date: IsoDate;
  onUserAction: (evt: UserEvent) => Promise<void>;
  uiRoot?: HTMLElement;
  instanceId?: string;
};

// Unsure of proper handling here; Will revisit later.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
function ensureDataset(el: HTMLElement): any {
  // Unsure of proper handling here; Will revisit later.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyEl = el as any;
  if (!anyEl.dataset) anyEl.dataset = {};
  // Unsure of proper handling here; Will revisit later.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return anyEl.dataset as any;
}

function setFocusKey(el: HTMLElement, focusKey: string): void {
  // Unsure of proper handling here; Will revisit later.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ds: any = (el as any).dataset ?? ((el as any).dataset = {});
  ds.aptFocusKey = focusKey;
}

export function renderProgressTrackerBody(container: HTMLElement, runtime: RenderRuntime, model: RenderBodyModel): void {
  if (model.kind === "day") {
    renderDayBody(container, runtime, model.sections);
    return;
  }

  renderError(container, model);
}

export function renderAreasSectionModel(container: HTMLElement, model: AreasSectionModel): void {
  if (model.kind === "areasEmpty") renderAreasEmpty(container, model);
  else renderAreasTable(container, model);
}

export function renderActivitiesSectionModel(container: HTMLElement, runtime: RenderRuntime, model: ActivitiesSectionModel): void {
  if (model.kind === "activitiesEmpty") renderActivitiesEmpty(container, model);
  else renderActivitiesTabs(container, runtime, model);
}

export function renderPlanSectionModel(container: HTMLElement, runtime: RenderRuntime, model: PlanSectionModel): void {
  if (model.kind === "planHidden") renderPlanHidden(container, runtime, model);
  else if (model.kind === "planNoActions") renderPlanNoActions(container, runtime, model);
  else renderPlanTabs(container, runtime, model);
}

function renderError(container: HTMLElement, model: RenderErrorModel): void {
  const err = container.createDiv({ cls: "apt-error" });

  if (model.kind === "errorText") {
    err.createEl("div", { text: model.message });
    return;
  }

  err.createEl("div", { text: model.message });
  const ul = err.createEl("ul");
  for (const item of model.items) ul.createEl("li", { text: item });
}

function renderDayBody(container: HTMLElement, runtime: RenderRuntime, sections: Array<AreasSectionModel | ActivitiesSectionModel | PlanSectionModel>): void {
  for (const sec of sections) {
    if (sec.kind === "areasEmpty") renderAreasEmpty(container, sec);
    else if (sec.kind === "areasTable") renderAreasTable(container, sec);
    else if (sec.kind === "activitiesEmpty") renderActivitiesEmpty(container, sec);
    else if (sec.kind === "activitiesTabs") renderActivitiesTabs(container, runtime, sec);
    else if (sec.kind === "planHidden") renderPlanHidden(container, runtime, sec);
    else if (sec.kind === "planNoActions") renderPlanNoActions(container, runtime, sec);
    else if (sec.kind === "planTabs") renderPlanTabs(container, runtime, sec);
  }
}

function renderAreasEmpty(container: HTMLElement, model: Extract<AreasSectionModel, { kind: "areasEmpty" }>): void {
  const sec = container.createDiv({ cls: "apt-section" });
  sec.createEl("h4", { text: "Areas" });
  sec.createEl("div", { text: model.message });
}

function renderAreasTable(container: HTMLElement, model: Extract<AreasSectionModel, { kind: "areasTable" }>): void {
  const sec = container.createDiv({ cls: "apt-section" });
  sec.createEl("h4", { text: "Areas" });

  const table = sec.createEl("table");
  table.addClass("apt-areas-table");

  const thead = table.createEl("thead");
  const hr = thead.createEl("tr");
  hr.createEl("th", { text: "Area" });
  hr.createEl("th", { text: "Days since" });
  hr.createEl("th", { text: "Updated score" });
  hr.createEl("th", { text: "Possible (day plan)" });
  hr.createEl("th", { text: "Possible (week plan)" });

  const tbody = table.createEl("tbody");
  for (const row of model.rows) {
    const tr = tbody.createEl("tr");
    tr.createEl("td", { text: row.areaName });
    tr.createEl("td", { text: row.daysSinceText });
    tr.createEl("td", { text: row.updatedScoreText });
    tr.createEl("td", { text: row.possibleDayText });
    tr.createEl("td", { text: row.possibleWeekText });
  }
}

function renderActivitiesEmpty(container: HTMLElement, model: ActivitiesSectionModelEmpty): void {
  const sec = container.createDiv({ cls: "apt-section" });
  sec.createEl("h4", { text: "Actions" });
  sec.createEl("div", { text: model.message });
}

function renderActivitiesTabs(
  container: HTMLElement,
  runtime: RenderRuntime,
  model: ActivitiesSectionModelFilled
): void {
  const sec = container.createDiv({ cls: "apt-section" });
  sec.createEl("h4", { text: "Actions" });

  const uiRoot = runtime.uiRoot ?? container;
  const ds = ensureDataset(uiRoot);
  const instanceId = runtime.instanceId ?? ds.aptInstanceId ?? "apt";

  const tabStateKey = "aptActivitiesActiveGroupId";
  const initialActiveGroupId = ds[tabStateKey];

  renderTabbedGroups(
    sec,
    model.groups,
    (panel, g) => {
    renderThreeColumnTable(panel, "apt-activities-table", (tbody) => {
      for (const row of g.rows) {
        if (row.kind === "action") {
          const doUnderline = row.requiredLeft > 0;
          const focusKeyBase = `${instanceId}:activities:${g.id}:action:${row.actionId}`;
          addThreeColRow(tbody, row.name, row.currentText, doUnderline, (cell) => renderActionEntry(cell, runtime, row.entry, focusKeyBase));
        } else {
          const focusKey = `${instanceId}:activities:${g.id}:record:${row.recordId}`;
          addThreeColRow(tbody, row.name, row.currentText, false, (cell) => renderRecordEntry(cell, runtime, row.entry, focusKey));
        }
      }
    });
    },
    {
      tabGroupKey: "activities",
      initialActiveGroupId,
      onActiveGroupIdChange: (groupId) => {
        ds[tabStateKey] = groupId;
      },
      getButtonText: (g) => {
        let buttonName = g.name;
        if (g.numActionsStillRequired > 0) buttonName += ` (${g.numActionsStillRequired})`;
        return buttonName;
      },
    }
  );
}

function renderActionEntry(
  container: HTMLElement,
  runtime: RenderRuntime,
  model: ActionEntryModel,
  focusKeyBase: string
): void {
  if (model.kind === "button") {
    const plus = container.createEl("button", { text: model.plus.label }) as HTMLButtonElement;
    setFocusKey(plus, `${focusKeyBase}:plus`);
    plus.disabled = model.plus.disabled;
    plus.onclick = () => {
      void runtime.onUserAction(model.plus.event);
    };

    const minus = container.createEl("button", { text: model.minus.label }) as HTMLButtonElement;
    setFocusKey(minus, `${focusKeyBase}:minus`);
    minus.disabled = model.minus.disabled;
    minus.onclick = () => {
      void runtime.onUserAction(model.minus.event);
    };
    return;
  }

  if (model.kind === "checkbox") {
    const input = container.createEl("input") as HTMLInputElement;
    input.type = "checkbox";
    setFocusKey(input, `${focusKeyBase}:input`);
    input.disabled = model.disabled;
    input.checked = model.checked;
    input.onchange = () => {
      void runtime.onUserAction(input.checked ? model.eventOnCheck : model.eventOnUncheck);
    };
    return;
  }

  const input = container.createEl("input") as HTMLInputElement;
  input.type = "number";
  setFocusKey(input, `${focusKeyBase}:input`);
  if (model.min !== undefined) input.min = model.min;
  if (model.max !== undefined) input.max = model.max;
  if (model.step !== undefined) input.step = model.step;
  input.value = model.value;
  input.onchange = () => {
    const raw = Number(input.value);
    let next = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    if (model.max !== undefined) {
      const parsedMax = Number(model.max);
      if (Number.isFinite(parsedMax)) next = Math.min(next, parsedMax);
    }
    void runtime.onUserAction({ ...model.eventBase, delta: next - model.current });
  };
}

function renderRecordEntry(container: HTMLElement, runtime: RenderRuntime, model: RecordEntryModel, focusKey: string): void {
  const input = container.createEl("input") as HTMLInputElement;
  input.type = model.inputType;
  setFocusKey(input, `${focusKey}:input`);
  if (model.min !== undefined) input.min = model.min;
  if (model.max !== undefined) input.max = model.max;
  if (model.step !== undefined) input.step = model.step;
  input.value = model.value;
  input.onchange = () => {
    void runtime.onUserAction({ ...model.eventBase, value: input.value });
  };
}

function renderPlanHidden(container: HTMLElement, runtime: RenderRuntime, model: Extract<PlanSectionModel, { kind: "planHidden" }>): void {
  const sec = container.createDiv({ cls: "apt-section" });
  sec.createEl("h4", { text: model.scope === "day" ? "Plan (day)" : "Plan (week)" });
  const toggle = sec.createEl("button", { text: model.toggle.label });
  toggle.onclick = () => {
    void runtime.onUserAction(model.toggle.event);
  };
  sec.createEl("div", { text: model.message });
}

function renderPlanNoActions(
  container: HTMLElement,
  runtime: RenderRuntime,
  model: Extract<PlanSectionModel, { kind: "planNoActions" }>
): void {
  const sec = container.createDiv({ cls: "apt-section" });
  sec.createEl("h4", { text: model.scope === "day" ? "Plan (day)" : "Plan (week)" });
  const toggle = sec.createEl("button", { text: model.toggle.label });
  toggle.onclick = () => {
    void runtime.onUserAction(model.toggle.event);
  };
  sec.createEl("div", { text: model.message });
}

function renderPlanTabs(container: HTMLElement, runtime: RenderRuntime, model: Extract<PlanSectionModel, { kind: "planTabs" }>): void {
  const sec = container.createDiv({ cls: "apt-section" });
  sec.createEl("h4", { text: model.scope === "day" ? "Plan (day)" : "Plan (week)" });
  const toggle = sec.createEl("button", { text: model.toggle.label });
  toggle.onclick = () => {
    void runtime.onUserAction(model.toggle.event);
  };

  const uiRoot = runtime.uiRoot ?? container;
  const ds = ensureDataset(uiRoot);
  const instanceId = runtime.instanceId ?? ds.aptInstanceId ?? "apt";

  const tabStateKey = model.scope === "day" ? "aptPlanDayActiveGroupId" : "aptPlanWeekActiveGroupId";
  const initialActiveGroupId = ds[tabStateKey];

  renderTabbedGroups(
    sec,
    model.groups,
    (panel, g) => {
    renderThreeColumnTable(panel, "apt-plan-table", (tbody) => {
      for (const row of g.rows) {
        const focusKeyBase = `${instanceId}:plan:${model.scope}:${g.id}:action:${row.actionId}`;
        addThreeColRow(tbody, row.name, row.plannedText, false, (cell) => renderPlanEntry(cell, runtime, row.entry, focusKeyBase));
      }
    });
    },
    {
      tabGroupKey: model.scope === "day" ? "plan-day" : "plan-week",
      initialActiveGroupId,
      onActiveGroupIdChange: (groupId) => {
        ds[tabStateKey] = groupId;
      },
    }
  );
}

function renderPlanEntry(
  container: HTMLElement,
  runtime: RenderRuntime,
  model: PlanEntryModel,
  focusKeyBase: string
): void {
  if (model.kind === "button") {
    const plus = container.createEl("button", { text: model.plus.label }) as HTMLButtonElement;
    setFocusKey(plus, `${focusKeyBase}:plus`);
    plus.disabled = model.plus.disabled;
    plus.onclick = () => {
      void runtime.onUserAction(model.plus.event);
    };

    const minus = container.createEl("button", { text: model.minus.label }) as HTMLButtonElement;
    setFocusKey(minus, `${focusKeyBase}:minus`);
    minus.disabled = model.minus.disabled;
    minus.onclick = () => {
      void runtime.onUserAction(model.minus.event);
    };
    return;
  }

  if (model.kind === "checkbox") {
    const input = container.createEl("input") as HTMLInputElement;
    input.type = "checkbox";
    setFocusKey(input, `${focusKeyBase}:input`);
    input.disabled = model.disabled;
    input.checked = model.checked;
    input.onchange = () => {
      void runtime.onUserAction(input.checked ? model.eventOnCheck : model.eventOnUncheck);
    };
    return;
  }

  const input = container.createEl("input") as HTMLInputElement;
  input.type = "number";
  setFocusKey(input, `${focusKeyBase}:input`);
  if (model.min !== undefined) input.min = model.min;
  if (model.max !== undefined) input.max = model.max;
  if (model.step !== undefined) input.step = model.step;
  input.value = model.value;
  input.onchange = () => {
    const raw = Number(input.value);
    let next = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    if (model.max !== undefined) {
      const parsedMax = Number(model.max);
      if (Number.isFinite(parsedMax)) next = Math.min(next, parsedMax);
    }
    void runtime.onUserAction({ ...model.eventBase, value: next });
  };
}
