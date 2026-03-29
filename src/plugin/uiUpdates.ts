
type CapturedUiState = {
  scrollEl: HTMLElement | null;
  scrollTop: number;
  scrollLeft: number;
  focusKey: string | null;
  anchorOffsetTop: number | null;
  anchorOffsetLeft: number | null;
  selectionStart: number | null;
  selectionEnd: number | null;
};

export class UIUpdate {
    private readonly refreshersByNotePath = new Map<string, Map<HTMLElement, () => Promise<void>>>();
    private readonly refreshQueueByNotePath = new Map<string, Promise<void>>();


    public registerRefresher(notePath: string, el: HTMLElement, refresh: () => Promise<void>): void {
    let entries = this.refreshersByNotePath.get(notePath);
    if (!entries) {
      entries = new Map();
      this.refreshersByNotePath.set(notePath, entries);
    }
    entries.set(el, refresh);
  }

  public unregisterRefresher(notePath: string, el: HTMLElement): void {
    const entries = this.refreshersByNotePath.get(notePath);
    if (!entries) return;
    entries.delete(el);
    if (entries.size === 0) this.refreshersByNotePath.delete(notePath);
  }

  public enqueueRefresh(notePath: string): Promise<void> {
      const prev = this.refreshQueueByNotePath.get(notePath) ?? Promise.resolve();
      const next = prev
        .catch(() => {
          // keep the queue alive
        })
        .then(async () => {
          const entries = this.refreshersByNotePath.get(notePath);
          if (!entries) return;
  
          const blockEls = Array.from(entries.keys());
          const uiState = this.captureUiState(blockEls);
  
          try {
  
          for (const [el, refresh] of entries) {
            // Obsidian may temporarily detach/re-attach elements during re-renders or virtualization.
            // Don't drop refreshers in that case; just skip this refresh pass.
            if ((el as HTMLElement)?.isConnected === false) continue;
  
            try {
              await refresh();
            } catch {
              // Ignore refresh errors so other blocks still update.
            }
          }
  
          } finally {
            this.restoreUiState(uiState, blockEls);
          }
  
          if (entries.size === 0) this.refreshersByNotePath.delete(notePath);
        });
  
      this.refreshQueueByNotePath.set(notePath, next);
      return next;
    }

public captureUiState(blockEls: HTMLElement[]): CapturedUiState {
    if (typeof document === "undefined" || typeof window === "undefined") {
    return {
      scrollEl: null,
      scrollTop: 0,
      scrollLeft: 0,
      focusKey: null,
      anchorOffsetTop: null,
      anchorOffsetLeft: null,
      selectionStart: null,
      selectionEnd: null,
    };
  }

  const active = document.activeElement as HTMLElement | null;

  const isInsideAnyBlock = (el: HTMLElement | null): boolean => {
    if (!el) return false;
    for (const b of blockEls) {
      if (b.contains(el)) return true;
    }
    return false;
  };

  const activeInBlock = isInsideAnyBlock(active);
  const focusHost = activeInBlock && active ? (active.closest("[data-apt-focus-key]") as HTMLElement | null) : null;
  const focusKey = focusHost?.dataset.aptFocusKey ?? null;

  const selectionStart = (() => {
    if (!activeInBlock || !active) return null;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      return typeof active.selectionStart === "number" ? active.selectionStart : null;
    }
    return null;
  })();

  const selectionEnd = (() => {
    if (!activeInBlock || !active) return null;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      return typeof active.selectionEnd === "number" ? active.selectionEnd : null;
    }
    return null;
  })();

  const scrollBasis = (activeInBlock ? active : null) ?? blockEls[0] ?? null;
  const scrollEl = scrollBasis ? this.findScrollableParent(scrollBasis) : (document.scrollingElement as HTMLElement | null);
  const resolvedScrollEl = scrollEl ?? (document.scrollingElement as HTMLElement | null);

  const anchorOffset = (() => {
    if (!resolvedScrollEl) return { top: null as number | null, left: null as number | null };

    const anchorEl = focusHost ?? (activeInBlock ? active : null);
    if (!anchorEl) return { top: null as number | null, left: null as number | null };

    try {
      const anchorRect = anchorEl.getBoundingClientRect();
      const scrollRect = resolvedScrollEl.getBoundingClientRect();
      return {
        top: anchorRect.top - scrollRect.top,
        left: anchorRect.left - scrollRect.left,
      };
    } catch {
      return { top: null as number | null, left: null as number | null };
    }
  })();

  return {
    scrollEl: resolvedScrollEl,
    scrollTop: resolvedScrollEl?.scrollTop ?? 0,
    scrollLeft: resolvedScrollEl?.scrollLeft ?? 0,
    focusKey,
    anchorOffsetTop: anchorOffset.top,
    anchorOffsetLeft: anchorOffset.left,
    selectionStart,
    selectionEnd,
  };
}

  public restoreUiState(state: CapturedUiState, blockEls: HTMLElement[]): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const applyRestore = () => {
    const scrollEl = state.scrollEl;

    // First: restore focus (prefer preventScroll).
    let target: HTMLElement | null = null;
    if (state.focusKey) {
      const selector = `[data-apt-focus-key="${this.escapeAttributeValue(state.focusKey)}"]`;
      for (const b of blockEls) {
        const found = b.querySelector(selector) as HTMLElement | null;
        if (found) {
          target = found;
          break;
        }
      }
    }

    if (target) {
      try {
        // Unsure of handling here; Will revisit later
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (target as any).focus?.({ preventScroll: true });
      } catch {
        try {
          target.focus();
        } catch {
          // ignore
        }
      }

      if ((target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) && state.selectionStart !== null && state.selectionEnd !== null) {
        try {
          target.setSelectionRange(state.selectionStart, state.selectionEnd);
        } catch {
          // ignore
        }
      }
    }

    // Second: restore scroll.
    if (scrollEl) {
      // Prefer anchor-based scroll restoration (keeps clicked control stable even if layout changed).
      if (target && state.anchorOffsetTop !== null) {
        try {
          const targetRect = target.getBoundingClientRect();
          const scrollRect = scrollEl.getBoundingClientRect();
          const nextOffsetTop = targetRect.top - scrollRect.top;
          const deltaY = nextOffsetTop - state.anchorOffsetTop;
          scrollEl.scrollTop = scrollEl.scrollTop + deltaY;

          if (state.anchorOffsetLeft !== null) {
            const nextOffsetLeft = targetRect.left - scrollRect.left;
            const deltaX = nextOffsetLeft - state.anchorOffsetLeft;
            scrollEl.scrollLeft = scrollEl.scrollLeft + deltaX;
          }
          return;
        } catch {
          // fall back below
        }
      }

      // Fallback: absolute scroll restoration.
      scrollEl.scrollTop = state.scrollTop;
      scrollEl.scrollLeft = state.scrollLeft;
    }
  };

  // Apply immediately, then once more after layout settles.
  applyRestore();
  try {
    window.requestAnimationFrame(() => applyRestore());
  } catch {
    // ignore
  }
}

public findScrollableParent(start: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = start;
  while (el) {
    if (this.isScrollable(el)) return el;
    el = el.parentElement;
  }
  return null;
}

public isScrollable(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY;
  const overflowX = style.overflowX;
  const scrollY = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
  const scrollX = overflowX === "auto" || overflowX === "scroll" || overflowX === "overlay";
  if (!scrollY && !scrollX) return false;
  const canScrollY = el.scrollHeight > el.clientHeight + 1;
  const canScrollX = el.scrollWidth > el.clientWidth + 1;
  return (scrollY && canScrollY) || (scrollX && canScrollX);
}

public escapeAttributeValue(value: string): string {
  // Escapes for inclusion inside a double-quoted CSS attribute selector.

  // Keep original values here (AI)
  // eslint-disable-next-line no-useless-escape
  return value.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
}
}
