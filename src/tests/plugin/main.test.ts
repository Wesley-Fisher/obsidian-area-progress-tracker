import { describe, expect, it, vi } from "vitest";

const register = vi.fn(async () => {});
const unregister = vi.fn(() => {});

vi.mock("obsidian", () => {
  class Plugin {
    app: any;
    addSettingTab = vi.fn();
    constructor() {
      this.app = {};
    }
  }
  return { Plugin };
});

vi.mock("../../plugin/settings", () => ({
  loadSettings: vi.fn(async () => ({ dataFolder: "ProgressTracker" })),
  saveSettings: vi.fn(async () => {}),
  AreaProgressTrackerSettingTab: class AreaProgressTrackerSettingTab {
    constructor(..._args: any[]) {}
  },
}));

vi.mock("../../plugin/plugin", () => ({
  AreaProgressTrackerPlugin: class AreaProgressTrackerPlugin {
    register = register;
    unregister = unregister;
    constructor(..._args: any[]) {}
  },
}));

describe("plugin/main", () => {
  it("onload loads settings, adds tab, registers impl; onunload unregisters", async () => {
    const MainPlugin = (await import("../../plugin/main")).default;

    // @ts-ignore - Ignore missing arguments for this test
    const p = new MainPlugin();
    await p.onload();

    // addSettingTab comes from mocked base Plugin
    expect((p as any).addSettingTab).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledTimes(1);

    p.onunload();
    expect(unregister).toHaveBeenCalledTimes(1);
  });
});
