import type { MarkdownPostProcessorContext, Plugin } from "obsidian";
import { MarkdownRenderChild } from "obsidian";
import { CODE_BLOCK_NAME } from "../core/types";
import type { AreaProgressTrackerSettings } from "./settings";
import { parseBlockConfig } from "../core/parseBlockConfig";
import { onRenderProgressTrackerBlock } from "../core/render/renderBlock";
import { createVaultAdapter } from "../core/vault/obsidianAdapter";
import { createVaultRepo } from "../core/vault/repo";
import { handleUserEvent } from "../core/handleEvents/handleUserEvent";
import { UserEvent } from "../core/handleEvents/types";

export class AreaProgressTrackerPlugin {
  private readonly refreshersByNotePath = new Map<string, Map<HTMLElement, () => Promise<void>>>();
  private readonly refreshQueueByNotePath = new Map<string, Promise<void>>();

  constructor(
    private readonly plugin: Plugin,
    private readonly getSettings: () => AreaProgressTrackerSettings
  ) {}

  private registerRefresher(notePath: string, el: HTMLElement, refresh: () => Promise<void>): void {
    let entries = this.refreshersByNotePath.get(notePath);
    if (!entries) {
      entries = new Map();
      this.refreshersByNotePath.set(notePath, entries);
    }
    entries.set(el, refresh);
  }

  private unregisterRefresher(notePath: string, el: HTMLElement): void {
    const entries = this.refreshersByNotePath.get(notePath);
    if (!entries) return;
    entries.delete(el);
    if (entries.size === 0) this.refreshersByNotePath.delete(notePath);
  }

  private enqueueRefresh(notePath: string): Promise<void> {
    const prev = this.refreshQueueByNotePath.get(notePath) ?? Promise.resolve();
    const next = prev
      .catch(() => {
        // keep the queue alive
      })
      .then(async () => {
        const entries = this.refreshersByNotePath.get(notePath);
        if (!entries) return;

        for (const [el, refresh] of entries) {
          // Obsidian may temporarily detach/re-attach elements during re-renders or virtualization.
          // Don't drop refreshers in that case; just skip this refresh pass.
          if ((el as any).isConnected === false) continue;

          try {
            await refresh();
          } catch {
            // Ignore refresh errors so other blocks still update.
          }
        }

        if (entries.size === 0) this.refreshersByNotePath.delete(notePath);
      });

    this.refreshQueueByNotePath.set(notePath, next);
    return next;
  }

  async register(): Promise<void> {
    this.plugin.registerMarkdownCodeBlockProcessor(
      CODE_BLOCK_NAME,
      async (source, el, ctx) => {
        const settings = this.getSettings();
        const blockConfig = parseBlockConfig(source);

        const notePath = getNotePathFromCtx(ctx);

        const vault = createVaultAdapter(this.plugin);
        const repo = createVaultRepo(vault, settings.dataFolder);
        await repo.ensureSetup(blockConfig.date);

        let refreshSelf: (() => Promise<void>) | null = null;

        const onUserAction = async (evt: UserEvent): Promise<void> => {
          await handleUserEvent(evt, repo);
          if (notePath) {
            await this.enqueueRefresh(notePath);
          } else {
            await refreshSelf?.();
          }
        };

        refreshSelf = async (): Promise<void> => {
          await onRenderProgressTrackerBlock({
            plugin: this.plugin,
            el,
            ctx,
            blockConfig,
            repo,
            onUserAction,
          });
        };

        if (notePath) {
          this.registerRefresher(notePath, el, refreshSelf);

          // Ensure we don't retain refreshers for blocks that Obsidian unloads.
          const maybeCtx = ctx as any;
          if (typeof maybeCtx?.addChild === "function") {
            const child = new MarkdownRenderChild(el);
            child.onunload = () => {
              this.unregisterRefresher(notePath, el);
            };
            maybeCtx.addChild(child);
          }
        }

        await refreshSelf();
      }
    );
  }

  unregister(): void {
    // Obsidian disposables are automatically handled by register* calls.
  }

  // User actions are routed through the code block processor closure.
}

export function getNotePathFromCtx(ctx: MarkdownPostProcessorContext): string | undefined {
  return ctx.sourcePath;
}

