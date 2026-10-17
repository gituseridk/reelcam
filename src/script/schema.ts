/** The shape of a script (YAML), validated with zod. See docs in README "Script format". */
import { z } from 'zod';
import { rawStep } from './steps.js';

const size = z.number().int().min(200).max(3840);
const OFF_CAMERA_ONLY = new Set(['focus', 'wide', 'caption']);

export const scriptSchema = z
  .strictObject({
    title: z.string().max(80).optional(),
    url: z.string().min(1).optional(),
    serve: z.string().min(1).optional(),
    viewport: z.strictObject({ width: size, height: size }).default({ width: 1440, height: 810 }),
    scale: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
    preset: z.string().min(1).default('studio'),
    colorScheme: z.enum(['light', 'dark']).default('light'),
    allowRemote: z.boolean().default(false),
    redact: z.array(z.string().min(1)).default([]),
    forbid: z.array(z.string().min(1)).default([]),
    output: z.string().min(1).optional(),
    gif: z.boolean().default(false),
    checks: z.strictObject({ neighbours: z.boolean().default(true) }).default({ neighbours: true }),
    seed: z.number().int().min(0).default(1),
    /** Steps played before filming starts (sign in, dismiss a banner, give the app focus). */
    setup: z
      .array(rawStep)
      .default([])
      .refine((steps) => steps.every((s) => !OFF_CAMERA_ONLY.has(s.kind)), 'setup steps are not filmed: focus, wide and caption belong in "steps"'),
    steps: z.array(rawStep).min(1, 'a script needs at least one step'),
  })
  .refine((s) => s.url !== undefined || s.serve !== undefined, { message: 'give "url" (a page to open) or "serve" (a folder to serve)' });

export type Script = z.output<typeof scriptSchema>;
