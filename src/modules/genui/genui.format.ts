import type { GroupStatsRow } from './entities/dashboard.entity';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  BRL: 'R$',
};

/** "Bounty Hunters $10 (GG)": a tournament name alone is ambiguous, so bars
 *  add the buy-in, and the platform unless the widget is filtered to one. */
export function barLabel(
  stats: GroupStatsRow,
  widgetPlatform: string | null,
): string {
  if (!stats.entry) return stats.label;
  const { platform, currency, buyIn } = stats.entry;
  const price =
    buyIn === null
      ? 'Ticket'
      : `${CURRENCY_SYMBOLS[currency] ?? `${currency} `}${buyIn}`;
  return widgetPlatform
    ? `${stats.label} ${price}`
    : `${stats.label} ${price} (${platform})`;
}

const CURRENCY_CODE = /^[A-Z]{3}$/;
const MAX_CURRENCIES = 10;

/** Currency codes are user-typed: only a plain ISO-like code is passed on. */
export function safeCurrency(currency: string | null): string | null {
  return currency !== null && CURRENCY_CODE.test(currency) ? currency : null;
}

/** Valid, distinct codes only, at most 10: what goes to the model. */
export function safeCurrencies(currencies: string[]): string[] {
  return [...new Set(currencies.filter((c) => CURRENCY_CODE.test(c)))].slice(
    0,
    MAX_CURRENCIES,
  );
}

const MAX_LABEL_LENGTH = 60;
const MAX_PLATFORMS = 20;

/** Labels come from user-typed names: no line breaks, controls or angle brackets. */
export function sanitizeLabel(value: string): string {
  return value
    .replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LABEL_LENGTH)
    .trim();
}

/** Platform names are user-typed too: sanitized, at most 20, for the model. */
export function safePlatforms(platforms: string[]): string[] {
  return platforms.map(sanitizeLabel).filter(Boolean).slice(0, MAX_PLATFORMS);
}
