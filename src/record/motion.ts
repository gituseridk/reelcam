/** Pure motion maths for the pointer: an eased, slightly curved path with a small overshoot, and
 *  a seeded random source so the same script moves the same way every time. */

/** Cubic ease in-out on [0, 1]. */
export function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** mulberry32: a tiny deterministic PRNG returning numbers in [0, 1). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Glide {
  from: [number, number];
  to: [number, number];
}

/** The pointer position at progress k in [0, 1] along a gentle arc, overshooting by ~1% near the end. */
export function glidePoint({ from, to }: Glide, k: number): [number, number] {
  const [sx, sy] = from;
  const dx = to[0] - sx;
  const dy = to[1] - sy;
  const len = Math.hypot(dx, dy) || 1;
  const bow = Math.min(90, len * 0.18) * (dx >= 0 ? 1 : -1);
  const nx = -dy / len;
  const ny = dx / len;
  const e = k < 0.92 ? ease(k / 0.92) : 1 + 0.015 * Math.sin(((k - 0.92) / 0.08) * Math.PI);
  const arc = Math.sin(Math.PI * Math.min(1, k / 0.92)) * bow;
  const m = Math.min(e, 1.012);
  return [sx + dx * m + nx * arc, sy + dy * m + ny * arc];
}

/** How long a move of `distance` px takes: 0.35 to 0.95 s. */
export function glideMs(distance: number): number {
  return Math.max(350, Math.min(950, 260 + distance * 0.9));
}
