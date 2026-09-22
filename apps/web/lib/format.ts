/** Formatting helpers shared by server and client components (no "use client" here). */

export function fmt(value: string | number | bigint | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  const s = String(value);
  if (!/^-?\d+$/.test(s)) return s;
  const neg = s.startsWith("-");
  const digits = neg ? s.slice(1) : s;
  return (neg ? "-" : "") + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function short(value: string | null | undefined, head = 8, tail = 6): string {
  if (!value) return "—";
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}
