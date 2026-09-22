/** Amounts travel as strings in JSON (blueprint §8.3, §9.2). */
export function toAmountString(value: bigint): string {
  return value.toString(10);
}

export function parseAmount(value: string | number | bigint): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("amount must be a safe integer");
    return BigInt(value);
  }
  if (!/^-?\d+$/.test(value)) throw new Error(`not an integer amount: ${value}`);
  return BigInt(value);
}

export function formatZgems(value: bigint | string | number): string {
  const v = typeof value === "bigint" ? value : parseAmount(value);
  const negative = v < 0n;
  const digits = (negative ? -v : v).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return negative ? `-${grouped}` : grouped;
}
