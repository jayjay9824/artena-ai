/**
 * AXVELA — currency formatter for the Step 5 PriceEstimate output.
 *
 * AI / logic produces raw numbers (and a Currency tag). UI calls
 * formatCurrency() exactly once at render time. Keeps the rest of
 * the app free from locale strings and avoids the AI hallucinating
 * a "₩1.000.000" or "$1 000" that fails parsing later.
 *
 * Spec examples:
 *   KRW: ₩1,000,000
 *   USD: $1,000
 *   EUR: €1,000
 *
 * Locale picks:
 *   KRW → ko-KR (gives ₩-prefix, comma grouping, no decimals)
 *   USD → en-US ($-prefix, comma grouping, no decimals)
 *   EUR → en-IE (€-prefix, comma grouping, no decimals)
 *           (en-IE used so the symbol sits left of the number; the
 *           default de-DE locale renders "1.000 €" which doesn't
 *           match the AXVELA spec example.)
 */

import type { Currency } from "../../types/ai";

const FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  KRW: new Intl.NumberFormat("ko-KR", {
    style:                 "currency",
    currency:              "KRW",
    maximumFractionDigits: 0,
  }),
  USD: new Intl.NumberFormat("en-US", {
    style:                 "currency",
    currency:              "USD",
    maximumFractionDigits: 0,
  }),
  EUR: new Intl.NumberFormat("en-IE", {
    style:                 "currency",
    currency:              "EUR",
    maximumFractionDigits: 0,
  }),
};

/** Placeholder shown when the underlying number is null / NaN. */
export const CURRENCY_EMPTY = "—";

/**
 * Format a single amount.
 *   formatCurrency(1_000_000, "KRW") → "₩1,000,000"
 *   formatCurrency(1_000,     "USD") → "$1,000"
 *   formatCurrency(1_000,     "EUR") → "€1,000"
 *   formatCurrency(null,      "USD") → "—"
 */
export function formatCurrency(
  amount:   number | null | undefined,
  currency: Currency,
): string {
  if (amount == null || !Number.isFinite(amount)) return CURRENCY_EMPTY;
  return FORMATTERS[currency].format(Math.round(amount));
}

/**
 * Format a full price band as "low – high" (en-dash). Pads the
 * placeholder when only one bound exists so callers can drop the
 * string in a layout without branching on null.
 *
 *   formatCurrencyRange({ low: 1000, high: 5000 }, "USD")
 *     → "$1,000 – $5,000"
 *   formatCurrencyRange({ low: null, high: 5000 }, "USD")
 *     → "— – $5,000"
 */
export function formatCurrencyRange(
  range:    { low: number | null; high: number | null },
  currency: Currency,
): string {
  return `${formatCurrency(range.low, currency)} – ${formatCurrency(range.high, currency)}`;
}
