import { RenderBlockArgs } from "./renderTypes";
import { renderProgressTrackerBody } from "./renderFromModel";
import { translateRenderBlock } from "./translate/translateRenderBlock";


export async function onRenderProgressTrackerBlock(args: RenderBlockArgs): Promise<void> {
  const { el, blockConfig } = args;

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
    },
    translated
  );
}
