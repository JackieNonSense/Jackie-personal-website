/*
 * The machine's calendar. The story happens in 2029 and 2030; the visitor switches
 * the machine on years later, on today's month and day, at today's time.
 */
export const YEAR_OFFSET = 7;

/** Now, as the machine's clock has it. */
export function machineNow(real = new Date()): Date {
  const d = new Date(real);
  d.setFullYear(d.getFullYear() + YEAR_OFFSET);
  return d;
}

const pad = (n: number) => String(n).padStart(2, '0');
export function isoDate(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function hhmm(d: Date): string { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
