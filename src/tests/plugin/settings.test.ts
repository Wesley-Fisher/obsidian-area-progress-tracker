import { describe, expect, it, vi } from "vitest";
import { FakeElement, asHTMLElement } from "../core/render/fakeDom";

let lastOnChange: ((value: string) => Promise<void> | void) | null = null;

vi.mock("obsidian", () => {
  class PluginSettingTab {
    containerEl: HTMLElement;
    constructor(_app: any, _plugin: any) {
      this.containerEl = asHTMLElement(new FakeElement("div"));
    }
  }

  class Setting {
    constructor(_container: any) {}
    setName(): this {
      return this;
    }
    setDesc(): this {
      return this;
    }
    addText(cb: (text: any) => void): this {
      const text = {
        setPlaceholder: () => text,
        setValue: () => text,
        onChange: (fn: any) => {
          lastOnChange = fn;
        },
      };
      cb(text);
      return this;
    }
  }

  return { PluginSettingTab, Setting };
});

describe("plugin/settings", () => {
  it("loadSettings merges defaults with stored values", async () => {
    const { loadSettings, DEFAULT_SETTINGS } = await import("../../plugin/settings");

    const plugin1 = { loadData: async () => null } as any;
    expect(await loadSettings(plugin1)).toEqual(DEFAULT_SETTINGS);

    const plugin2 = { loadData: async () => ({ dataFolder: "X" }) } as any;
    expect((await loadSettings(plugin2)).dataFolder).toBe("X");
  });

  it("saveSettings writes via plugin.saveData", async () => {
    const { saveSettings } = await import("../../plugin/settings");

    const saveData = vi.fn(async () => {});
    const plugin = { saveData } as any;

    await saveSettings(plugin, { dataFolder: "Y" });
    expect(saveData).toHaveBeenCalledWith({ dataFolder: "Y" });
  });

  it("setting tab display wires trim + fallback for dataFolder", async () => {
    const { AreaProgressTrackerSettingTab } = await import("../../plugin/settings");

    const calls: any[] = [];
    const tab = new AreaProgressTrackerSettingTab(
      {} as any,
      {} as any,
      () => ({ dataFolder: "ProgressTracker" }),
      async (next) => {
        calls.push(next);
      }
    );

    tab.display();

    expect(lastOnChange).not.toBeNull();
    await lastOnChange!("   ");
    await lastOnChange!("  MyData  ");

    expect(calls[0]).toEqual({ dataFolder: "ProgressTracker" });
    expect(calls[1]).toEqual({ dataFolder: "MyData" });
  });
});
