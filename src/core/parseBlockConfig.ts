import type { BlockConfig, IsoDate } from "./types";

function isIsoDate(value: string): value is IsoDate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseBlockConfig(source: string): BlockConfig {
  const trimmed = source.trim();
  if (!trimmed) {
    throw new Error("Block config is empty. Expected JSON.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid JSON in progress-tracker block: ${msg}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Block JSON must be an object.");
  }

  const obj = parsed as Record<string, unknown>;

  const dateRaw = obj.date;
  if (typeof dateRaw !== "string" || !isIsoDate(dateRaw)) {
    throw new Error("Missing or invalid 'date'. Expected YYYY-MM-DD.");
  }

  const showRaw = obj.show;
  const show =
    Array.isArray(showRaw) &&
    showRaw.every((s) => s === "areas" || s === "actions" || s === "plan-day" || s === "plan-week")
      ? (showRaw as Array<"areas" | "actions" | "plan-day" | "plan-week">)
      : undefined;

  return { date: dateRaw, show};
}
