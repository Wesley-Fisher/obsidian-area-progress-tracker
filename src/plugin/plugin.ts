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
import { UIUpdate } from "./uiUpdates";

export class AreaProgressTrackerPlugin {
  private uiUpdate = new UIUpdate();

  constructor(
    private readonly plugin: Plugin,
    private readonly getSettings: () => AreaProgressTrackerSettings
  ) {}

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
            await this.uiUpdate.enqueueRefresh(notePath);
          } else {
            const blocks = el ? [el] : [];
            const uiState = this.uiUpdate.captureUiState(blocks);
            try {
              await refreshSelf?.();
            } finally {
              this.uiUpdate.restoreUiState(uiState, blocks);
            }
          }
        };

        refreshSelf = async (): Promise<void> => {
          await onRenderProgressTrackerBlock({
            el,
            blockConfig,
            repo,
            onUserAction,
          });
        };

        if (notePath) {
          this.uiUpdate.registerRefresher(notePath, el, refreshSelf);

          // Ensure we don't retain refreshers for blocks that Obsidian unloads.
          const maybeCtx = ctx as any;
          if (typeof maybeCtx?.addChild === "function") {
            const child = new MarkdownRenderChild(el);
            child.onunload = () => {
              this.uiUpdate.unregisterRefresher(notePath, el);
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

