import { describe, expect, it } from "vitest";
import { renderTabbedGroups } from "../../../../core/render/inner/commonTable";
import { FakeButton, FakeElement, asHTMLElement } from "../fakeDom";


describe("render/commonTable", () => {
  it("renderTabbedGroups activates first tab by default and switches on click", () => {
    const root = new FakeElement("div");

    const groups = [
      { id: "g1", name: "G1" },
      { id: "g2", name: "G2" },
    ];

    renderTabbedGroups(asHTMLElement(root), groups, (panel, g) => {
      (panel as HTMLElement).createEl("div", { text: `panel-${g.id}` });
    });

    const buttons = root.findAllByTag("button") as unknown as FakeButton[];
    expect(buttons).toHaveLength(2);

    const panels = root.findAllByClass("apt-activities-panel");
    expect(panels).toHaveLength(2);

    expect(buttons[0].classes.has("is-active")).toBe(true);
    expect(buttons[1].classes.has("is-active")).toBe(false);

    expect(panels[0].style.display).toBe("block");
    expect(panels[1].style.display).toBe("none");

    // Switch to second.
    buttons[1].click();

    expect(buttons[0].classes.has("is-active")).toBe(false);
    expect(buttons[1].classes.has("is-active")).toBe(true);

    expect(panels[0].style.display).toBe("none");
    expect(panels[1].style.display).toBe("block");
  });
});
