import { Plugin, TFile } from "obsidian";
import type { VaultLike } from "./storage";

export function createVaultAdapter(plugin: Plugin): VaultLike {
  const { vault } = plugin.app;

  return {
    async exists(path: string): Promise<boolean> {
      return vault.getAbstractFileByPath(path) != null;
    },
    async read(path: string): Promise<string> {
      const file = vault.getAbstractFileByPath(path);
      if (!file) throw new Error(`File not found: ${path}`);
      if (!(file instanceof TFile)) throw new Error(`Not a file: ${path}`);
      return vault.read(file);
    },
    async write(path: string, content: string): Promise<void> {
      const existing = vault.getAbstractFileByPath(path);
      if (existing && existing instanceof TFile) {
        await vault.modify(existing, content);
      } else {
        await vault.create(path, content);
      }
    },
    async createFolder(path: string): Promise<void> {
      // createFolder throws if it exists; callers check exists first.
      await vault.createFolder(path);
    },
  };
}
