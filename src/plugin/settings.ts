import type { App, Plugin } from "obsidian";
import { PluginSettingTab, Setting } from "obsidian";

export interface AreaProgressTrackerSettings {
  dataFolder: string;
}

export const DEFAULT_SETTINGS: AreaProgressTrackerSettings = {
  dataFolder: "ProgressTracker",
};

export async function loadSettings(plugin: Plugin): Promise<AreaProgressTrackerSettings> {
  const loaded = (await plugin.loadData()) as Partial<AreaProgressTrackerSettings> | null;
  return {
    ...DEFAULT_SETTINGS,
    ...(loaded ?? {}),
  };
}

export async function saveSettings(plugin: Plugin, settings: AreaProgressTrackerSettings): Promise<void> {
  await plugin.saveData(settings);
}

export class AreaProgressTrackerSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: Plugin,
    private readonly getSettings: () => AreaProgressTrackerSettings,
    private readonly setSettings: (next: AreaProgressTrackerSettings) => Promise<void>
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const settings = this.getSettings();

    new Setting(containerEl)
      .setName("Data folder")
      .setDesc("Vault-relative folder used for config/logs/plans.")
      .addText((text) => {
        text.setPlaceholder("ProgressTracker").setValue(settings.dataFolder);
        text.onChange(async (value) => {
          await this.setSettings({ ...this.getSettings(), dataFolder: value.trim() || "ProgressTracker" });
        });
      });
  }
}
