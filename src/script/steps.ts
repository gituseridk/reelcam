/** The step vocabulary of a script. Each step is a one-key map (`- click: "#save"`) or the bare
 *  word `wide`. Short forms are normalised here into one explicit shape per kind. */
import { z } from 'zod';

const selector = z.string().min(1, 'a CSS or Playwright selector is required');
const ms = z.number().int().min(0).max(60_000);

export type Step =
  | { kind: 'visit'; url: string }
  | { kind: 'click'; on: string }
  | { kind: 'hover'; on: string }
  | { kind: 'type'; into: string | undefined; text: string; delay: number }
  | { kind: 'press'; key: string }
  | { kind: 'scroll'; by: number; to: string | undefined; ms: number }
  | { kind: 'wait'; ms: number }
  | { kind: 'waitFor'; on: string }
  | { kind: 'focus'; on: string; why: string; zoom: number | undefined }
  | { kind: 'wide'; why: string }
  | { kind: 'caption'; text: string; ms: number };

const focusLong = z.strictObject({ on: selector, why: z.string().default(''), zoom: z.number().min(1).max(4).optional() });
const scrollLong = z.strictObject({ by: z.number().int().default(0), to: selector.optional(), ms: ms.default(900) });

/** One schema per step key; each turns the step's value into a Step. */
export const STEP_SCHEMAS = {
  visit: z.string().min(1).transform((url): Step => ({ kind: 'visit', url })),
  click: selector.transform((on): Step => ({ kind: 'click', on })),
  hover: selector.transform((on): Step => ({ kind: 'hover', on })),
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
    .transform((v): Step => (typeof v === 'string' ? { kind: 'focus', on: v, why: '', zoom: undefined } : { kind: 'focus', on: v.on, why: v.why, zoom: v.zoom })),
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
