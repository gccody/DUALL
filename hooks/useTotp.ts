import { generateTotp, type TotpParams } from '@/core/otp/totp';
import { getTotpParams } from '@/core/service';
import type { Service } from '@/types';
import { getTimeRemaining } from '@/utils/time';
import { useMemo } from 'react';

/** Shown in place of the code when the secret can't produce one. */
export const TOTP_ERROR_CODE = 'Error!';

export interface TotpPeriodCodes {
  code: string;
  /** Code of the following period ('' when `error`) */
  nextCode: string;
  /** Epoch milliseconds at which `code` stops being valid */
  expires: number;
  error: boolean;
}

/** Index of the TOTP time step containing `now` (epoch ms). */
export function getPeriodCounter(now: number, period: number): number {
  return Math.floor(now / (period * 1000));
}

/** The codes for time step `counter` and the one after it. Never throws. */
export function computePeriodCodes(secret: string, params: TotpParams, counter: number): TotpPeriodCodes {
  const periodMs = params.period * 1000;
  const start = counter * periodMs;
  const expires = start + periodMs;
  try {
    return {
      code: generateTotp(secret, params, start).otp,
      nextCode: generateTotp(secret, params, expires).otp,
      expires,
      error: false,
    };
  } catch (error) {
    console.error('Failed to generate code:', error);
    return { code: TOTP_ERROR_CODE, nextCode: '', expires, error: true };
  }
}

export interface TotpState {
  code: string;
  nextCode: string;
  /** Number of digits a code has (for masking hidden codes) */
  digits: number;
  /** Whole seconds until `code` expires, rounded up */
  secondsLeft: number;
  /** Fraction of the period remaining, in [0, 1] */
  fraction: number;
  error: boolean;
}

/**
 * Current and next code of `service` at `now`. Codes are generated during
 * render, only when the time step or the account's secret/parameters change.
 */
export function useTotp(service: Service, now: number): TotpState {
  const { algorithm, digits, period } = getTotpParams(service);
  const counter = getPeriodCounter(now, period);
  // Kept explicit (not left to the compiler): this is the contract that the
  // HMACs run once per time step, not on every tick of `now`.
  const { code, nextCode, expires, error } = useMemo(
    () => computePeriodCodes(service.secret, { algorithm, digits, period }, counter),
    [service.secret, algorithm, digits, period, counter]
  );
  const { seconds, fraction } = getTimeRemaining(expires, now, period);

  return { code, nextCode, digits, secondsLeft: seconds, fraction, error };
}
