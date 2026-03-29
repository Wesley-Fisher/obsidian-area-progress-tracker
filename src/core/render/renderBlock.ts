import { RenderBlockArgs } from "./renderTypes";
import { renderProgressTrackerBody } from "./renderFromModel";
import { translateRenderBlock } from "../translate/translateRenderBlock";


export async function onRenderProgressTrackerBlock(args: RenderBlockArgs): Promise<void> {
  const { el, blockConfig } = args;

  // Persist across rerenders: attributes on `el` survive `el.empty()`.

  // Unsure of proper handling here; Will revisit later.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ds: any = (el as any).dataset ?? ((el as any).dataset = {});
  if (!ds.aptInstanceId) {
    ds.aptInstanceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  el.empty();

  const header = el.createEl("div", { text: "Area Progress Tracker" });
  header.addClass("apt-header");

  const meta = el.createEl("div", { text: `mode=${blockConfig.mode} date=${blockConfig.date}` });
  meta.addClass("apt-meta");


  const body = el.createEl("div");
  body.addClass("apt-body");

  const translated = await translateRenderBlock(args);
  renderProgressTrackerBody(
    body,
    {
      date: blockConfig.date,
      onUserAction: args.onUserAction,
      uiRoot: el,
      instanceId: ds.aptInstanceId,
    },
    translated
  );
}
