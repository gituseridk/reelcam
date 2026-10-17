/** A preset is the look of a video: canvas size, stage, pointer, camera feel and captions. */
export interface Preset {
  name: string;
  description: string;
  /** Output size in px. */
  width: number;
  height: number;
  fps: number;
  /** The stage behind the page: a diagonal gradient. */
  background: { from: string; to: string };
  /** Air between the page and the canvas edge, in output px. 0 = the page fills the frame. */
  margin: number;
  /** Corner radius of the page, in output px. */
  radius: number;
  shadow: { color: string; blur: number; offsetY: number };
  pointer: { fill: string; stroke: string; size: number };
  ripple: string;
  /** Spring half-life of every camera cut, seconds. Lower = snappier. */
  halfLife: number;
  /** The subject fills at most this share of the frame. */
  fill: number;
  /** A zoom that gains less than this is not worth a move. */
  minGain: number;
  maxZoom: number;
  /** A slow push-in while a shot holds: the zoom grows by this share over `breatheSeconds`. */
  breathe: number;
  breatheSeconds: number;
  /** Seconds the camera starts each move ahead of the cut, so it lands as the action starts. */
  lead: number;
  caption: { background: string; color: string; fontSize: number };
  /** x264 quality, lower is better (18-28). */
  crf: number;
}
