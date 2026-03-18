import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../core/parseBlockConfig", () => ({
  parseBlockConfig: vi.fn(() => ({ mode: "day", date: "2026-03-16" })),
}));

const ensureSetup = vi.fn(async () => {});
const repoMock = { ensureSetup } as any;

vi.mock("../../core/vault/obsidianAdapter", () => ({
  createVaultAdapter: vi.fn(() => ({}) as any),
}));

vi.mock("../../core/vault/repo", () => ({
  createVaultRepo: vi.fn(() => repoMock),
}));

vi.mock("../../core/handleEvents/handleUserEvent", () => ({
  handleUserEvent: vi.fn(async () => {}),
}));

const onRender = vi.fn(async (_args: any) => {});
vi.mock("../../core/render/renderBlock", () => ({
  onRenderProgressTrackerBlock: (args: any) => onRender(args),
}));

describe("plugin/plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers codeblock processor and wires render + event handling", async () => {
    const { handleUserEvent } = await import("../../core/handleEvents/handleUserEvent");
    const { AreaProgressTrackerPlugin, getNotePathFromCtx } = await import("../../plugin/plugin");

    let captured: any = null;
    const plugin = {
      registerMarkdownCodeBlockProcessor: (name: string, cb: any) => {
        captured = { name, cb };
      },
    } as any;

    const impl = new AreaProgressTrackerPlugin(plugin, () => ({ dataFolder: "ProgressTracker" }));
    await impl.register();

    expect(captured.name).toBe("progress-tracker");

    expect(getNotePathFromCtx({ sourcePath: "Note.md" } as any)).toBe("Note.md");

    // Render two blocks in the same note.
    const el1 = {} as any;
    const el2 = {} as any;
    await captured.cb("date=2026-03-16", el1, { sourcePath: "Note.md" } as any);
    await captured.cb("date=2026-03-16", el2, { sourcePath: "Note.md" } as any);

  expect(ensureSetup).toHaveBeenCalledWith("2026-03-16");
    expect(onRender).toHaveBeenCalledTimes(2);

    const args1 = onRender.mock.calls[0][0];
    const args2 = onRender.mock.calls[1][0];
    expect(args1.blockConfig).toMatchObject({ mode: "day", date: "2026-03-16" });
    expect(args2.blockConfig).toMatchObject({ mode: "day", date: "2026-03-16" });

    await args1.onUserAction({ kind: "setDayUiFlag", date: "2026-03-16", flag: "hidePlanDay", value: true } as any);
    expect(handleUserEvent).toHaveBeenCalledWith(
      { kind: "setDayUiFlag", date: "2026-03-16", flag: "hidePlanDay", value: true },
      repoMock
    );

    // After user action, all blocks in the same note should refresh.
    expect(onRender).toHaveBeenCalledTimes(4);
    const refreshedEls = [onRender.mock.calls[2][0].el, onRender.mock.calls[3][0].el];
    expect(refreshedEls).toContain(el1);
    expect(refreshedEls).toContain(el2);

    // unregister is a no-op, but should remain callable.
    impl.unregister();
  });

  it("unregisters refreshers when Obsidian unloads a block", async () => {
    const { AreaProgressTrackerPlugin } = await import("../../plugin/plugin");

    let captured: any = null;
    const plugin = {
      registerMarkdownCodeBlockProcessor: (_name: string, cb: any) => {
        captured = { cb };
      },
    } as any;

    const impl = new AreaProgressTrackerPlugin(plugin, () => ({ dataFolder: "ProgressTracker" }));
    await impl.register();

    const unloaders: Array<() => void> = [];
    const mkCtx = () =>
      ({
        sourcePath: "Note.md",
        addChild: (child: any) => {
          unloaders.push(() => child.onunload());
        },
      }) as any;

    const el1 = {} as any;
    const el2 = {} as any;
    await captured.cb("date=2026-03-16", el1, mkCtx());
    await captured.cb("date=2026-03-16", el2, mkCtx());

    expect(onRender).toHaveBeenCalledTimes(2);

    // Unload the second block (Obsidian would do this when navigating/refreshing).
    unloaders[1]!();

    // Trigger an action from block 1; only block 1 should refresh.
    const args1 = onRender.mock.calls[0][0];
    await args1.onUserAction({ kind: "setDayUiFlag", date: "2026-03-16", flag: "hidePlanDay", value: true } as any);

    expect(onRender).toHaveBeenCalledTimes(3);
    expect(onRender.mock.calls[2][0].el).toBe(el1);
  });
});
