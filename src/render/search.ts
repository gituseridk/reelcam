/** Binary search over sorted times. */

/** Index of the last entry whose time is <= t, or -1. */
export function lastAtOrBefore(times: readonly number[], t: number): number {
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((times[mid] ?? Infinity) <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}
