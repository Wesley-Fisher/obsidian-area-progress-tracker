import { Plugin } from "obsidian";
import { AreaProgressTrackerPlugin } from "./plugin";
import {
  AreaProgressTrackerSettingTab,
  type AreaProgressTrackerSettings,
  loadSettings,
  saveSettings,
} from "./settings";

export default class MainPlugin extends Plugin {
  private impl: AreaProgressTrackerPlugin | null = null;
  private settings: AreaProgressTrackerSettings | null = null;

  override async onload(): Promise<void> {
    this.settings = await loadSettings(this);

    this.addSettingTab(
      new AreaProgressTrackerSettingTab(this.app, this, () => this.settings!, async (next) => {
        this.settings = next;
        await saveSettings(this, next);
      })
    );

    this.impl = new AreaProgressTrackerPlugin(this, () => this.settings!);
    await this.impl.register();
  }

  override onunload(): void {
    this.impl?.unregister();
    this.impl = null;
    this.settings = null;
  }
}
