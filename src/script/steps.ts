/** The step vocabulary of a script. Each step is a one-key map (`- click: "#save"`) or the bare
 *  word `wide`. Short forms are normalised here into one explicit shape per kind. */
import { z } from 'zod';

const selector = z.string().min(1, 'a CSS or Playwright selector is required');
const ms = z.number().int().min(0).max(60_000);

export type Step =
  | { kind: 'visit'; url: string }
  | { kind: 'click'; at: Point; on: string | undefined }
  | { kind: 'hover'; at: Point; on: string | undefined }
  | { kind: 'drag'; from: Point; to: Point; on: string | undefined; ms: number }
  | { kind: 'type'; into: string | undefined; text: string; delay: number }
  | { kind: 'press'; key: string }
  | { kind: 'scroll'; by: number; to: string | undefined; ms: number }
  | { kind: 'wait'; ms: number }
  | { kind: 'waitFor'; on: string }
  | { kind: 'focus'; on: string | Area; why: string; zoom: number | undefined }
  | { kind: 'wide'; why: string }
  | { kind: 'caption'; text: string; ms: number };

/** A point: a selector (its centre) or [x, y] as fractions of the `on` element (default: the page). */
export type Point = string | [number, number];
const fraction = z.number().min(0).max(1);
const point = z.union([selector, z.tuple([fraction, fraction])]);

/** A region of the page as fractions [left, top, right, bottom], for canvas apps (drawings, maps). */
export interface Area {
  area: [number, number, number, number];
}
const area = z
  .tuple([fraction, fraction, fraction, fraction])
  .refine(([x0, y0, x1, y1]) => x1 > x0 && y1 > y0, 'an area is [left, top, right, bottom] with right > left and bottom > top');
const focusLong = z
  .strictObject({ on: selector.optional(), area: area.optional(), why: z.string().default(''), zoom: z.number().min(1).max(4).optional() })
  .refine((v) => (v.on === undefined) !== (v.area === undefined), 'give exactly one of "on" (a selector) or "area" ([left, top, right, bottom])');
const scrollLong = z.strictObject({ by: z.number().int().default(0), to: selector.optional(), ms: ms.default(900) });

/** One schema per step key; each turns the step's value into a Step. */
export const STEP_SCHEMAS = {
  visit: z.string().min(1).transform((url): Step => ({ kind: 'visit', url })),
  click: z
    .union([selector, z.strictObject({ at: point, on: selector.optional() })])
    .transform((v): Step => (typeof v === 'string' ? { kind: 'click', at: v, on: undefined } : { kind: 'click', at: v.at, on: v.on })),
  hover: z
    .union([selector, z.strictObject({ at: point, on: selector.optional() })])
    .transform((v): Step => (typeof v === 'string' ? { kind: 'hover', at: v, on: undefined } : { kind: 'hover', at: v.at, on: v.on })),
  drag: z
    .strictObject({ from: point, to: point, on: selector.optional(), ms: z.number().int().min(100).max(10_000).default(700) })
    .transform((v): Step => ({ kind: 'drag', from: v.from, to: v.to, on: v.on, ms: v.ms })),
  type: z
    .strictObject({ into: selector.optional(), text: z.string(), delay: z.number().int().min(0).max(1000).default(45) })
    .transform((v): Step => ({ kind: 'type', into: v.into, text: v.text, delay: v.delay })),
  press: z.string().min(1).transform((key): Step => ({ kind: 'press', key })),
  scroll: z
    .union([z.number().int(), scrollLong])
    .transform((v): Step => (typeof v === 'number' ? { kind: 'scroll', by: v, to: undefined, ms: 900 } : { kind: 'scroll', by: v.by, to: v.to, ms: v.ms })),
  wait: ms.transform((n): Step => ({ kind: 'wait', ms: n })),
  waitFor: selector.transform((on): Step => ({ kind: 'waitFor', on })),
  focus: z
    .union([selector, focusLong])
    .transform((v): Step => (typeof v === 'string' ? { kind: 'focus', on: v, why: '', zoom: undefined } : { kind: 'focus', on: v.area === undefined ? (v.on ?? '') : { area: v.area }, why: v.why, zoom: v.zoom })),
  zoom: z
    .strictObject({ on: selector, level: z.number().min(1).max(4), why: z.string().default('') })
    .transform((v): Step => ({ kind: 'focus', on: v.on, why: v.why, zoom: v.level })),
  wide: z
    .union([z.string(), z.null()])
    .transform((why): Step => ({ kind: 'wide', why: why ?? '' })),
  caption: z
    .union([z.string().min(1), z.strictObject({ text: z.string().min(1), ms: ms.default(2000) })])
    .transform((v): Step => (typeof v === 'string' ? { kind: 'caption', text: v, ms: 2000 } : { kind: 'caption', ...v })),
} as const;

export type StepKey = keyof typeof STEP_SCHEMAS;
export const STEP_KEYS = Object.keys(STEP_SCHEMAS) as StepKey[];

function isStepKey(key: string): key is StepKey {
  return Object.hasOwn(STEP_SCHEMAS, key);
}

/** A raw step value from YAML: a one-key object or the bare word "wide". */
export const rawStep = z.unknown().transform((value, ctx): Step => {
  if (value === 'wide') return { kind: 'wide', why: '' };
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    ctx.addIssue({ code: 'custom', message: `a step is a one-key map like "click: '#save'"; one of: ${STEP_KEYS.join(', ')}` });
    return z.NEVER;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  const first = entries[0];
  if (entries.length !== 1 || first === undefined) {
    ctx.addIssue({ code: 'custom', message: `a step has exactly one key, got ${String(entries.length)}: ${entries.map(([k]) => k).join(', ')}` });
    return z.NEVER;
  }
  const [key, inner] = first;
  if (!isStepKey(key)) {
    ctx.addIssue({ code: 'custom', message: `unknown step "${key}"; one of: ${STEP_KEYS.join(', ')}` });
    return z.NEVER;
  }
  const parsed = STEP_SCHEMAS[key].safeParse(inner);
  if (parsed.success) return parsed.data;
  for (const issue of parsed.error.issues) ctx.addIssue({ code: 'custom', message: issue.message, path: [key, ...issue.path] });
  return z.NEVER;
});
