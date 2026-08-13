import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => {
  class TFile {
    constructor(public path: string) {}
  }
  class Plugin {
    constructor(public app: any) {}
  }
  return { TFile, Plugin };
});

describe("core/vault/obsidianAdapter", () => {
  it("adapts vault operations (exists/read/write/createFolder)", async () => {
    const { TFile } = await import("obsidian");
    const { createVaultAdapter } = await import("../../../core/vault/obsidianAdapter");

    const store = new Map<string, string>();
    const files = new Map<string, any>();
    const folders = new Set<string>();

    const vault = {
      getAbstractFileByPath: (path: string) => files.get(path) ?? (folders.has(path) ? ({ path } as any) : null),
      read: async (file: any) => store.get(file.path) ?? "",
      modify: async (file: any, content: string) => {
        store.set(file.path, content);
      },
      create: async (path: string, content: string) => {
        const f = new (TFile as any)(path);
        files.set(path, f);
        store.set(path, content);
        return f;
      },
      createFolder: async (path: string) => {
        folders.add(path);
      },
    };

    const plugin = { app: { vault } } as any;
    const adapter = createVaultAdapter(plugin);

    expect(await adapter.exists("a.txt")).toBe(false);

    await adapter.write("a.txt", "hello");
    expect(await adapter.exists("a.txt")).toBe(true);
    expect(await adapter.read("a.txt")).toBe("hello");

    await adapter.write("a.txt", "world");
    expect(await adapter.read("a.txt")).toBe("world");

    await adapter.createFolder("folder");
    expect(await adapter.exists("folder")).toBe(true);
  });

  it("throws on read when file missing or not a file", async () => {
    const { createVaultAdapter } = await import("../../../core/vault/obsidianAdapter");

    const vault = {
      getAbstractFileByPath: (path: string) => (path === "folder" ? ({ path } as any) : null),
      read: async () => "",
      modify: async () => {},
      create: async () => {},
      createFolder: async () => {},
    };

    const plugin = { app: { vault } } as any;
    const adapter = createVaultAdapter(plugin);

    await expect(adapter.read("missing.txt")).rejects.toThrow(/File not found/);
    await expect(adapter.read("folder")).rejects.toThrow(/Not a file/);
  });
});
