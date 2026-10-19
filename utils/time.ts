const DEFAULT_PERIOD = 30;

export interface TimeRemaining {
  /** Whole seconds left, rounded up (e.g. 0.2s left shows as 1s). */
  seconds: number;
  /** Fraction of the period remaining, in [0, 1]. */
  fraction: number;
}

/**
 * Computes how much of a TOTP period remains before `expires`.
 * Falls back to a 30s period if `period` is missing or not a positive number.
 */
export function getTimeRemaining(expires: number, now: number, period?: number): TimeRemaining {
  const periodSeconds = period !== undefined && Number.isFinite(period) && period > 0 ? period : DEFAULT_PERIOD;
  const periodMs = periodSeconds * 1000;
  const remainingMs = Math.min(Math.max(expires - now, 0), periodMs);

  return {
    seconds: Math.ceil(remainingMs / 1000),
    fraction: remainingMs / periodMs,
  };
}
