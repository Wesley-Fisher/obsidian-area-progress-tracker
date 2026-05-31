import type { IsoDate } from "../types";
import type { UserEvent } from "../handleEvents/types";
import type {
  ActivitiesSectionModel,
  ActionEntryModel,
  AreasSectionModel,
  LoadedStatsSectionModel,
  PlanEntryModel,
  PlanSectionModel,
  RecordEntryModel,
  RenderBodyModel,
  RenderErrorModel,
  ActivitiesSectionModelEmpty,
  ActivitiesSectionModelFilled,
  StatsSectionModel,
} from "../translate/models";
import { addThreeColRow, renderTabbedGroups, renderThreeColumnTable } from "./inner/commonTable";

export type RenderRuntime = {
  date: IsoDate;
  onUserAction: (evt: UserEvent) => Promise<void>;
  loadStats?: () => Promise<LoadedStatsSectionModel>;
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
  if (model.kind === "dashboard") {
    renderDashboardBody(container, runtime, model);
  } else {
    renderError(container, model);
  }
}

function renderDashboardBody(
  container: HTMLElement,
  runtime: RenderRuntime,
  model: Extract<RenderBodyModel, { kind: "dashboard" }>
): void {
  renderAreasSectionModel(container, model.areas);

  const uiRoot = runtime.uiRoot ?? container;
  const ds = ensureDataset(uiRoot);

  const mainTabStateKey = "aptMainActiveTabId";
  const initialActiveTabId = ds[mainTabStateKey];

  const mainTabs = [
    { id: "actions", name: "Actions" },
    { id: "plan-day", name: "Planning (day)" },
    { id: "plan-week", name: "Planning (week)" },
    { id: "stats", name: "Stats" },
  ] as const;

  const statsLoaders = new Map<string, () => Promise<void>>();

  const tabsContainer = container.createDiv({ cls: "apt-section" });
  renderTabbedGroups(
    tabsContainer,
    [...mainTabs],
    (panel, g) => {
      if (g.id === "actions") {
        renderActivitiesContent(panel, runtime, model.actions);
        return;
      }
      if (g.id === "plan-day") {
        renderPlanContent(panel, runtime, model.planDay);
        return;
      }
      if (g.id === "plan-week") {
        renderPlanContent(panel, runtime, model.planWeek);
        return;
      }

      statsLoaders.set(g.id, renderStatsContent(panel, runtime, model.stats));
    },
    {
      tabGroupKey: "main",
      initialActiveGroupId: initialActiveTabId,
      onActiveGroupIdChange: (groupId) => {
        ds[mainTabStateKey] = groupId;
        void statsLoaders.get(groupId)?.();
      },
    }
  );
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
  if (model.kind === "planNoActions") renderPlanNoActions(container, model);
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
  hr.createEl("th", { text: "Starting" });
  hr.createEl("th", { text: "Updated" });
  hr.createEl("th", { text: "Planned (day)" });
  hr.createEl("th", { text: "Planned (week)" });

  const tbody = table.createEl("tbody");
  for (const row of model.rows) {
    const tr = tbody.createEl("tr");
    tr.createEl("td", { text: row.areaName });
    tr.createEl("td", { text: row.daysSinceText });
    tr.createEl("td", { text: row.startingScoreText });
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

function renderActivitiesContent(container: HTMLElement, runtime: RenderRuntime, model: ActivitiesSectionModel): void {
  if (model.kind === "activitiesEmpty") {
    container.createEl("div", { text: model.message });
    return;
  }

  const uiRoot = runtime.uiRoot ?? container;
  const ds = ensureDataset(uiRoot);
  const instanceId = runtime.instanceId ?? ds.aptInstanceId ?? "apt";

  const tabStateKey = "aptActivitiesActiveGroupId";
  const initialActiveGroupId = ds[tabStateKey];

  renderTabbedGroups(
    container,
    model.groups,
    (panel, g) => {
      renderThreeColumnTable(panel, "apt-activities-table", (tbody) => {
        for (const row of g.rows) {
          if (row.kind === "action") {
            const doUnderline = row.requiredLeft > 0;
            const focusKeyBase = `${instanceId}:activities:${g.id}:action:${row.actionId}`;
            addThreeColRow(tbody, row.name, row.currentText, doUnderline, (cell) =>
              renderActionEntry(cell, runtime, row.entry, focusKeyBase)
            );
          } else {
            const focusKey = `${instanceId}:activities:${g.id}:record:${row.recordId}`;
            addThreeColRow(tbody, row.name, row.currentText, false, (cell) =>
              renderRecordEntry(cell, runtime, row.entry, focusKey)
            );
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

function renderPlanNoActions(
  container: HTMLElement,
  model: Extract<PlanSectionModel, { kind: "planNoActions" }>
): void {
  const sec = container.createDiv({ cls: "apt-section" });
  sec.createEl("h4", { text: model.scope === "day" ? "Plan (day)" : "Plan (week)" });
  sec.createEl("div", { text: model.message });
}

function renderPlanTabs(container: HTMLElement, runtime: RenderRuntime, model: Extract<PlanSectionModel, { kind: "planTabs" }>): void {
  const sec = container.createDiv({ cls: "apt-section" });
  sec.createEl("h4", { text: model.scope === "day" ? "Plan (day)" : "Plan (week)" });

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

function renderPlanContent(container: HTMLElement, runtime: RenderRuntime, model: PlanSectionModel): void {
  if (model.kind === "planNoActions") {
    container.createEl("div", { text: model.message });
    return;
  }

  const uiRoot = runtime.uiRoot ?? container;
  const ds = ensureDataset(uiRoot);
  const instanceId = runtime.instanceId ?? ds.aptInstanceId ?? "apt";

  const tabStateKey = model.scope === "day" ? "aptPlanDayActiveGroupId" : "aptPlanWeekActiveGroupId";
  const initialActiveGroupId = ds[tabStateKey];

  renderTabbedGroups(
    container,
    model.groups,
    (panel, g) => {
      renderThreeColumnTable(panel, "apt-plan-table", (tbody) => {
        for (const row of g.rows) {
          const focusKeyBase = `${instanceId}:plan:${model.scope}:${g.id}:action:${row.actionId}`;
          addThreeColRow(tbody, row.name, row.plannedText, false, (cell) =>
            renderPlanEntry(cell, runtime, row.entry, focusKeyBase)
          );
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

function renderStatsContent(container: HTMLElement, runtime: RenderRuntime, _model: StatsSectionModel): () => Promise<void> {
  const content = container.createDiv({ cls: "apt-section" });
  content.createEl("div", { text: "Open this tab to load stats." });

  let loaded = false;
  let pending: Promise<void> | undefined;

  return async (): Promise<void> => {
    if (loaded || pending) return;

    if (!runtime.loadStats) {
      loaded = true;
      content.empty();
      content.createEl("div", { text: "Stats loader unavailable." });
      return;
    }

    content.empty();
    content.createEl("div", { text: "Loading stats..." });

    pending = runtime.loadStats()
      .then((loadedModel) => {
        content.empty();
        renderLoadedStats(content, loadedModel);
        loaded = true;
      })
      .catch(() => {
        content.empty();
        content.createEl("div", { text: "Failed to load stats." });
        loaded = true;
      })
      .finally(() => {
        pending = undefined;
      });

    await pending;
  };
}

function renderLoadedStats(container: HTMLElement, model: LoadedStatsSectionModel): void {
  if (model.kind === "statsEmpty" || model.kind === "statsError") {
    container.createEl("div", { text: model.message });
    return;
  }

  const table = container.createEl("table");
  table.addClass("apt-stats-table");

  const thead = table.createEl("thead");
  const hr = thead.createEl("tr");
  hr.createEl("th", { text: "Stat" });
  hr.createEl("th", { text: "Value" });

  const tbody = table.createEl("tbody");
  for (const row of model.rows) {
    const tr = tbody.createEl("tr");
    tr.createEl("td", { text: row.name });
    const valueCell = tr.createEl("td");
    for (const line of row.valueLines) {
      valueCell.createEl("div", { text: line });
    }
  }
}

function renderPlanEntry(
  container: HTMLElement,
  runtime: RenderRuntime,
  model: PlanEntryModel,
  focusKeyBase: string
): void {
  const controls = container.createDiv({ cls: "apt-plan-entry-controls" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (controls.style as any).display = "flex";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (controls.style as any).alignItems = "center";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (controls.style as any).gap = "6px";

  const minus = controls.createEl("button", { text: model.minus.label }) as HTMLButtonElement;
  setFocusKey(minus, `${focusKeyBase}:minus`);
  minus.disabled = model.minus.disabled;
  minus.onclick = () => {
    void runtime.onUserAction(model.minus.event);
  };

  const input = controls.createEl("input") as HTMLInputElement;
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

  const plus = controls.createEl("button", { text: model.plus.label }) as HTMLButtonElement;
  setFocusKey(plus, `${focusKeyBase}:plus`);
  plus.disabled = model.plus.disabled;
  plus.onclick = () => {
    void runtime.onUserAction(model.plus.event);
  };
}
