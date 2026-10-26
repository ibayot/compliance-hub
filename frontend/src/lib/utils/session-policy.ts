export const DEFAULT_IDLE_LOCK_MINUTES = 15;
export const MIN_IDLE_LOCK_MINUTES = 1;
export const MAX_IDLE_LOCK_MINUTES = 1440;

export function isValidIdleLockMinutes(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) &&
    value >= MIN_IDLE_LOCK_MINUTES && value <= MAX_IDLE_LOCK_MINUTES;
}
