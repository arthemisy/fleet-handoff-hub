const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-31" — the day on the phone that opened the app. */
export const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "22:23" in 24h — the clock time on the phone that opened the app. */
export const timeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** "22:23:00" -> "22:23", so a saved time fits a time input. */
export const hm = (t?: string | null) => (t ?? "").slice(0, 5);

/**
 * Best guess at a date and a time inside an old free-text "data/horário",
 * like "10:52 SEXTA FEIRA" or "20/10/26". Returns nulls when nothing is found.
 */
export function legacyDateTime(s?: string | null): { checked_date: string | null; checked_time: string | null } {
  const text = s ?? "";
  const t = /(\d{1,2})[:h](\d{2})/.exec(text);
  const d = /(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/.exec(text);
  let date: string | null = null;
  if (d) {
    const day = Number(d[1]);
    const month = Number(d[2]);
    let year = d[3] ? Number(d[3]) : new Date().getFullYear();
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) date = `${year}-${pad(month)}-${pad(day)}`;
  }
  const time = t ? `${pad(Math.min(23, Number(t[1])))}:${pad(Math.min(59, Number(t[2])))}` : null;
  return { checked_date: date, checked_time: time };
}

/** Readable "day/month/year hour:minute" for a saved conference, whatever was stored. */
export function whenLabel(c: {
  checked_date?: string | null;
  checked_time?: string | null;
  checked_at?: string | null;
  created_at: string;
}) {
  if (c.checked_date) {
    const [y, m, d] = c.checked_date.split("-");
    const t = hm(c.checked_time);
    return `${d}/${m}/${y}${t ? ` ${t}` : ""}`;
  }
  if (c.checked_at) return c.checked_at;
  return new Date(c.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
