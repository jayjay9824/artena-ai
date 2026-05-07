import { Currency } from "../types";

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  KRW: 1340,
  GBP: 0.79,
  HKD: 7.82,
  JPY: 149,
  CHF: 0.90,
};

export function normalizeToUSD(amount: number, currency: string): number {
  const rate = EXCHANGE_RATES[currency] ?? 1;
  return amount / rate;
}

export function convertFromUSD(amountUSD: number, targetCurrency: Currency): number {
  const rate = EXCHANGE_RATES[targetCurrency] ?? 1;
  return amountUSD * rate;
}

export function formatPrice(amount: number, currency: Currency): string {
  if (currency === "KRW") {
    if (amount >= 1_000_000_000) return `₩${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 100_000_000) return `₩${Math.round(amount / 100_000_000)}억`;
    if (amount >= 10_000_000) return `₩${(amount / 10_000_000).toFixed(1)}천만`;
    return `₩${Math.round(amount / 10_000).toLocaleString()}만`;
  }
  if (currency === "EUR") {
    if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(2)}M`;
    if (amount >= 1_000) return `€${Math.round(amount / 1_000).toLocaleString()}K`;
    return `€${Math.round(amount).toLocaleString()}`;
  }
  // USD
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000).toLocaleString()}K`;
  return `$${Math.round(amount).toLocaleString()}`;
}

export function getCurrencySymbol(currency: Currency): string {
  return { USD: "$", EUR: "€", KRW: "₩" }[currency];
}
