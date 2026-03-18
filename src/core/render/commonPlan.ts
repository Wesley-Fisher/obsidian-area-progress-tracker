import { RenderDayModeArgs } from "./renderTypes";
import { renderTabbedGroups, renderThreeColumnTable, addThreeColRow } from "./commonTable";
import { buildActionOnlyGroups} from "./common";

export function renderPlanTabs(
  sec: HTMLElement,
  args: RenderDayModeArgs,
  scope: "day" | "week",
  planActions: Partial<Record<string, number>>
): void {
  const groups = buildActionOnlyGroups(args);
  renderTabbedGroups(sec, groups, (panel, g) => {
    renderThreeColumnTable(panel, "apt-plan-table", (tbody) => {
      for (const action of g.actions) {
        const plannedRaw = planActions[action.id] ?? 0;
        const planned = Number.isFinite(plannedRaw) ? Math.max(0, plannedRaw) : 0;
        addThreeColRow(tbody, action.name, String(planned), (cell) => {
          renderPlanEntry(cell, args, scope, action.id, planned);
        });
      }
    });
  });
}

function renderPlanEntry(
  container: HTMLElement,
  args: RenderDayModeArgs,
  scope: "day" | "week",
  actionId: string,
  current: number
): void {
  const input = container.createEl("input") as HTMLInputElement;
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.value = String(current);
  input.onchange = () => {
    const raw = Number(input.value);
    const next = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    void args.onUserAction({
      kind: "setPlanTarget",
      scope,
      actionId,
      value: next,
    });
  };
}
