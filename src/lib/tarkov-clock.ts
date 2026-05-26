/**
 * Computes the current Escape from Tarkov in-game time.
 *
 * Tarkov time runs at 7x real-world speed. The two available raid start times
 * are always 12 hours apart (day and night options). Using a known epoch
 * reference point, we can calculate the current in-game time deterministically.
 *
 * Reference: Tarkov uses a fixed epoch offset; the 7x multiplier is well-known
 * from community reverse-engineering (tarkov.dev, SPT project).
 */

const TARKOV_TIME_MULTIPLIER = 7;
const TARKOV_EPOCH_OFFSET_MS = 28_800_000; // +8h offset from UTC epoch (empirical)

export interface TarkovTime {
  hours: number;
  minutes: number;
}

export function getCurrentTarkovTime(now: Date = new Date()): TarkovTime {
  const realMs = now.getTime();
  const tarkovMs = (realMs * TARKOV_TIME_MULTIPLIER + TARKOV_EPOCH_OFFSET_MS) % 86_400_000;

  const totalMinutes = Math.floor(tarkovMs / 60_000);
  return {
    hours: Math.floor(totalMinutes / 60) % 24,
    minutes: totalMinutes % 60,
  };
}

export function getRaidStartTimes(now: Date = new Date()): [TarkovTime, TarkovTime] {
  const current = getCurrentTarkovTime(now);
  const opposite: TarkovTime = {
    hours: (current.hours + 12) % 24,
    minutes: current.minutes,
  };
  return [current, opposite];
}

export function formatTarkovTime(t: TarkovTime): string {
  return `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}`;
}

export function isDayTime(t: TarkovTime): boolean {
  return t.hours >= 6 && t.hours < 22;
}

/** Interval in ms for updating the clock (1 Tarkov minute = ~8.57 real seconds) */
export const TARKOV_MINUTE_MS = Math.round(60_000 / TARKOV_TIME_MULTIPLIER);
