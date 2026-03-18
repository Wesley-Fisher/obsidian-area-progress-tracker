// Minimal runtime stub for the Obsidian API used by this plugin.
// This is only for Vitest/Vite resolution during unit tests.

export class TFile {
  constructor(public path: string = "") {}
}

export class Plugin {
  app: any;

  constructor() {
    this.app = { vault: null };
  }

  // In tests, callers typically stub/spy these methods.
  registerMarkdownCodeBlockProcessor(_name: string, _processor: any): void {}
  addSettingTab(_tab: any): void {}

  async loadData(): Promise<unknown> {
    return null;
  }

  async saveData(_data: unknown): Promise<void> {}
}

export type App = any;

export type MarkdownPostProcessorContext = {
  sourcePath?: string;
  addChild?: (child: MarkdownRenderChild) => void;
};

export class MarkdownRenderChild {
  constructor(public containerEl: any) {}

  onunload(): void {}
}

export class PluginSettingTab {
  containerEl: any;

  constructor(public app: App, public plugin: Plugin) {
    this.containerEl = { empty() {} };
  }

  display(): void {}
}

export class Setting {
  constructor(_containerEl: any) {}

  setName(_name: string): this {
    return this;
  }

  setDesc(_desc: string): this {
    return this;
  }

  addText(cb: (text: any) => void): this {
    const text = {
      setPlaceholder: () => text,
      setValue: () => text,
      onChange: (_fn: any) => {},
    };
    cb(text);
    return this;
  }
}
