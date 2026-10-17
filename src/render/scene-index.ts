/** Looks up the take's scenery: what is on the page at a moment, and everything seen during a shot. */
import type { Item, Take } from '../take.js';
import { lastAtOrBefore } from './search.js';

export class SceneIndex {
  private readonly times: number[];
  private readonly perShot = new Map<number, readonly Item[]>();

  constructor(
    private readonly samples: Take['scenery'],
    private readonly lead: number,
  ) {
    this.times = samples.map((s) => s[0]);
  }

  /** The latest sample at or before t, with its index. */
  at(t: number): [number, readonly Item[]] {
    const k = Math.max(0, lastAtOrBefore(this.times, t));
    return [k, this.samples[k]?.[1] ?? []];
  }

  /** Every piece seen while the camera holds shot i: after its cut (so what a dialog covers is not
   *  counted) and before the camera leaves for the next shot. The composition is decided once per shot against all of them, so a ticking counter
   *  never moves the camera. */
  forShot(i: number, starts: readonly number[]): readonly Item[] {
    const hit = this.perShot.get(i);
    if (hit !== undefined) return hit;
    const from = starts[i] ?? 0;
    const to = Math.max(from + 0.01, (starts[i + 1] ?? Infinity) - this.lead);
    const seen = new Map<string, Item>();
    const first = lastAtOrBefore(this.times, from) + 1; // the first sample taken after the cut
    const k0 = first < this.times.length && (this.times[first] ?? Infinity) < to ? first : Math.max(0, first - 1);
    for (const [t, items] of this.samples.slice(k0)) {
      if (t > to) break;
      for (const it of items) seen.set(`${it.label}|${JSON.stringify(it.rect)}`, it);
    }
    const out = [...seen.values()];
    this.perShot.set(i, out);
    return out;
  }
}
