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
  addRows: (tbody: HTMLElement) => void
): void {
  const table = container.createEl("table");
  table.addClass(className);

  const thead = table.createEl("thead");
  const hr = thead.createEl("tr");
  hr.createEl("th", { text: "Name" });
  hr.createEl("th", { text: "Current" });
  hr.createEl("th", { text: "Entry" });

  const tbody = table.createEl("tbody");
  addRows(tbody);
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
