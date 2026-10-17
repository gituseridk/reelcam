/** A take is what the recorder writes and the renderer reads: frame times, the pointer, clicks,
 *  camera shots, subject boxes and captions, all on one clock (seconds). Stored as take.json next
 *  to frames/ and sprites/ in the work folder. */
import { z } from 'zod';

const rect = z.object({ x: z.number(), y: z.number(), width: z.number().min(0), height: z.number().min(0) });
const sample = z.tuple([z.number(), z.number(), z.number()]);
const item = z.object({ kind: z.enum(['text', 'box']), label: z.string(), rect });

export const takeSchema = z.object({
  version: z.literal(1),
  viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  scale: z.number().positive(),
  times: z.array(z.number()).min(1),
  pointer: z.array(sample),
  clicks: z.array(sample),
  shots: z
    .array(z.object({ t: z.number(), name: z.string(), why: z.string(), window: z.boolean(), rect, zoom: z.number().optional() }))
    .min(1),
  subjects: z.array(z.tuple([z.number(), z.number().int().min(0), rect])),
  captions: z.array(z.object({ t: z.number(), ms: z.number(), sprite: z.string() })),
  title: z.object({ sprite: z.string(), ms: z.number() }).optional(),
  hits: z.array(z.object({ t: z.number(), text: z.string(), pattern: z.string() })),
  /** What else is on the page at each moment (see record/scenery.ts). */
  scenery: z.array(z.tuple([z.number(), z.array(item)])).default([]),
});

export type Take = z.infer<typeof takeSchema>;
export type Rect = z.infer<typeof rect>;
export type Shot = Take['shots'][number];
export type Item = z.infer<typeof item>;

/** Wall-clock seconds with sub-millisecond precision: the clock every take uses. */
export function now(): number {
  return (performance.timeOrigin + performance.now()) / 1000;
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
