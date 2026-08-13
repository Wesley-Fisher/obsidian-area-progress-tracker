export type TabbedGroup = { id: string; name: string };

export type RenderTabbedGroupsOptions<TGroup extends TabbedGroup> = {
  initialActiveGroupId?: string;
  onActiveGroupIdChange?: (groupId: string) => void;
  getButtonText?: (g: TGroup) => string;
  tabGroupKey?: string;
};

export function renderTabbedGroups<TGroup extends TabbedGroup>(
  sec: HTMLElement,
  groups: TGroup[],
  renderPanel: (panel: HTMLElement, g: TGroup) => void,
  options: RenderTabbedGroupsOptions<TGroup> = {}
): void {
  const tabBar = sec.createDiv({ cls: "apt-activities-tabs" });
  const panels = sec.createDiv({ cls: "apt-activities-tabpanels" });

  const buttons: HTMLButtonElement[] = [];
  const panelEls: HTMLElement[] = [];

  const setActive = (idx: number) => {
    for (let i = 0; i < buttons.length; i++) {
      const active = i === idx;
      buttons[i].toggleClass("is-active", active);
      buttons[i].style.fontWeight = active ? "bold" : "normal";
      buttons[i].style.textDecoration = active ? "underline" : "none";
      panelEls[i].style.display = active ? "block" : "none";
    }

    const activeGroupId = groups[idx]?.id;
    if (activeGroupId) options.onActiveGroupIdChange?.(activeGroupId);
  };

  for (const [idx, g] of groups.entries()) {
    const buttonText = options.getButtonText ? options.getButtonText(g) : g.name;
    const btn = tabBar.createEl("button", { text: buttonText }) as HTMLButtonElement;
    // Unsure of proper handling here; Will revisit later.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ds: any = (btn as any).dataset ?? ((btn as any).dataset = {});
    if (options.tabGroupKey) ds.aptTabGroup = options.tabGroupKey;
    ds.aptGroupId = g.id;
    const focusGroupKey = options.tabGroupKey ?? "tabs";
    ds.aptFocusKey = `tabs:${focusGroupKey}:${g.id}`;

    buttons.push(btn);
    btn.onclick = () => setActive(idx);

    const panel = panels.createDiv({ cls: "apt-activities-panel" });
    panelEls.push(panel);
    renderPanel(panel, g);
  }

  const initialIdx =
    options.initialActiveGroupId !== undefined
      ? Math.max(
          0,
          groups.findIndex((g) => g.id === options.initialActiveGroupId)
        )
      : 0;
  setActive(initialIdx);
}

export function renderThreeColumnTable(
  container: HTMLElement,
  className: string,
  addRows: (tbody: HTMLElement) => void,
  widths?: { name?: number; current?: number; entry?: number }
): void {
  const table = container.createEl("table");
  table.addClass(className);
  table.style.width = "100%";
  table.style.tableLayout = "fixed";

  const thead = table.createEl("thead");
  const hr = thead.createEl("tr");
  const columnWidths = [widths?.name ?? 1, widths?.current ?? 1, widths?.entry ?? 1];
  for (const [index, label] of ["Name", "Current", "Entry"].entries()) {
    const header = hr.createEl("th", { text: label });
    header.style.width = `${columnWidths[index]}fr`;
  }

  const tbody = table.createEl("tbody");
  addRows(tbody);
}

export function renderColumnTables<T extends { id: string; name: string; width?: number; tableWidths?: { name?: number; current?: number; entry?: number } }>(
  container: HTMLElement,
  columns: T[],
  renderTable: (tableContainer: HTMLElement, column: T) => void,
  getCount?: (column: T) => number
): void {
  const root = container.createDiv({ cls: "apt-column-layout" });
  // The header and body are separate aligned grids; the outer wrapper must not become a grid item layout itself.
  root.style.display = "block";
  root.style.width = "100%";

  const header = root.createDiv({ cls: "apt-column-layout-header" });
  header.style.display = "grid";
  header.style.gridTemplateColumns = columns.map((column) => `${column.width ?? 1}fr`).join(" ");
  header.style.gap = "12px";
  for (const column of columns) {
    const count = getCount?.(column) ?? 0;
    header.createEl("div", { text: count > 0 ? `${column.name} (${count})` : column.name });
  }

  const body = root.createDiv({ cls: "apt-column-layout-body" });
  body.style.display = "grid";
  body.style.gridTemplateColumns = columns.map((column) => `${column.width ?? 1}fr`).join(" ");
  body.style.gap = "12px";
  for (const column of columns) {
    const panel = body.createDiv({ cls: "apt-column-panel" });
    renderTable(panel, column);
  }
}

export function addThreeColRow(
  tbody: HTMLElement,
  name: string,
  currentText: string,
  doUnderline: boolean,
  renderEntry: (cell: HTMLElement) => void
): void {
  const tr = tbody.createEl("tr");
  const tdName = tr.createEl("td", { text: name });
  if (doUnderline) {
    tdName.style.textDecoration = "underline";
  }
  tr.createEl("td", { text: currentText });
  const tdEntry = tr.createEl("td");
  renderEntry(tdEntry);
}
