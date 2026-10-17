/** The built-in presets. To add one, copy a block, give it a new name and a one-line description. */
import { UserError } from '../errors.js';
import type { Preset } from './types.js';

export type { Preset } from './types.js';

const camera = { halfLife: 0.2, fill: 0.88, minGain: 1.12, maxZoom: 2.2, breathe: 0.03, breatheSeconds: 5, lead: 0.7 } as const;
const darkPointer = { fill: '#ffffff', stroke: '#14161c', size: 30 } as const;

const studio: Preset = {
  name: 'studio',
  description: 'Dark indigo stage, rounded page with a soft shadow. 1920x1080.',
  width: 1920,
  height: 1080,
  fps: 30,
  background: { from: '#242a3a', to: '#584678' },
  margin: 22,
  radius: 14,
  shadow: { color: 'rgba(8, 8, 18, 0.6)', blur: 52, offsetY: 14 },
  pointer: darkPointer,
  ripple: 'rgba(110, 150, 255, 0.9)',
  ...camera,
  caption: { background: 'rgba(20, 22, 30, 0.86)', color: '#ffffff', fontSize: 30 },
  crf: 20,
};

const daylight: Preset = {
  ...studio,
  name: 'daylight',
  description: 'Light airy stage for light apps, darker caption pill. 1920x1080.',
  background: { from: '#eef1f8', to: '#d9e1f2' },
  shadow: { color: 'rgba(40, 52, 90, 0.28)', blur: 48, offsetY: 16 },
  ripple: 'rgba(70, 110, 240, 0.9)',
};

const bare: Preset = {
  ...studio,
  name: 'bare',
  description: 'No stage: the page fills the frame edge to edge. 1920x1080.',
  background: { from: '#000000', to: '#000000' },
  margin: 0,
  radius: 0,
  shadow: { color: 'rgba(0, 0, 0, 0)', blur: 0, offsetY: 0 },
};

const vertical: Preset = {
  ...studio,
  name: 'vertical',
  description: '9:16 for phone viewports (e.g. 390x844), stories and shorts. 1080x1920.',
  width: 1080,
  height: 1920,
  margin: 60,
  radius: 56,
  caption: { ...studio.caption, fontSize: 40 },
};

const square: Preset = {
  ...studio,
  name: 'square',
  description: '1:1 for social feeds. 1080x1080.',
  width: 1080,
  height: 1080,
  margin: 28,
  radius: 18,
  caption: { ...studio.caption, fontSize: 26 },
};

export const PRESETS: readonly Preset[] = [studio, daylight, bare, vertical, square];

export function getPreset(name: string): Preset {
  const found = PRESETS.find((p) => p.name === name);
  if (found === undefined) throw new UserError(`unknown preset "${name}"`, `Built-in presets: ${PRESETS.map((p) => p.name).join(', ')}.`);
  return found;
}
