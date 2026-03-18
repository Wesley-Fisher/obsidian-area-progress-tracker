export function renderTabbedGroups<T extends { id: string; name: string }>(
  sec: HTMLElement,
  groups: T[],
  renderPanel: (panel: HTMLElement, g: T) => void
): void {
  const tabBar = sec.createDiv({ cls: "apt-activities-tabs" });
  const panels = sec.createDiv({ cls: "apt-activities-tabpanels" });

  const buttons: HTMLButtonElement[] = [];
  const panelEls: HTMLElement[] = [];

  const setActive = (idx: number) => {
    for (let i = 0; i < buttons.length; i++) {
      const active = i === idx;
      buttons[i].toggleClass("is-active", active);
      panelEls[i].style.display = active ? "block" : "none";
    }
  };

  for (const [idx, g] of groups.entries()) {
    const btn = tabBar.createEl("button", { text: g.name }) as HTMLButtonElement;
    buttons.push(btn);
    btn.onclick = () => setActive(idx);

    const panel = panels.createDiv({ cls: "apt-activities-panel" });
    panelEls.push(panel);
    renderPanel(panel, g);
  }

  setActive(0);
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
  renderEntry: (cell: HTMLElement) => void
): void {
  const tr = tbody.createEl("tr");
  tr.createEl("td", { text: name });
  tr.createEl("td", { text: currentText });
  const entry = tr.createEl("td");
  renderEntry(entry);
}
