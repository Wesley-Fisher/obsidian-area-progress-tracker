import type { IsoDate } from "./types";

export function addDays(date: IsoDate, deltaDays: number): IsoDate {
  const [y, m, d] = date.split("-").map((n) => Number(n));
  const ms = Date.UTC(y, m - 1, d) + deltaDays * 24 * 60 * 60 * 1000;
  const dt = new Date(ms);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}` as IsoDate;
}
