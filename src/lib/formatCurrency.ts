/** Consistent INR formatting (fixes mojibake from raw "â¹" in JSX). */
export function formatInr(
  amount: number,
  opts?: { maximumFractionDigits?: number; compactLakh?: boolean },
): string {
  const max = opts?.maximumFractionDigits ?? 0;
  if (opts?.compactLakh && Math.abs(amount) >= 100_000) {
    const lakhs = amount / 100_000;
    const digits = lakhs >= 100 ? 0 : lakhs >= 10 ? 1 : 2;
    return `₹${lakhs.toFixed(digits)}L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: max,
  }).format(amount);
}
