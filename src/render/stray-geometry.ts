/** Shared geometry for isolated controls in the empty margin of a focus shot. */
import type { View } from './geometry.js';

/** Stable DOM paths share a prefix exactly when one element contains the other. */
export function relatedPaths(a?: readonly number[], b?: readonly number[]): boolean {
  return a !== undefined && b !== undefined && a.length > 0 && b.length > 0 &&
    a.slice(0, Math.min(a.length, b.length)).every((id, i) => id === b[i]);
}

function contains(a: View, b: View): boolean {
  return a.x >= b.x - 0.5 && a.y >= b.y - 0.5 &&
    a.x + a.width <= b.x + b.width + 0.5 && a.y + a.height <= b.y + b.height + 0.5;
}

/** Closest points along an axis; in an overlapping interval both points are its midpoint. */
function nearest(a0: number, a1: number, b0: number, b1: number): [number, number] {
  if (a1 < b0) return [a1, b0];
  if (b1 < a0) return [a0, b1];
  const mid = (Math.max(a0, b0) + Math.min(a1, b1)) / 2;
  return [mid, mid];
}

/** The part of a connecting line covered by a box, expanded to a narrow corridor. */
function interval(p: View, x: [number, number], y: [number, number], pad: number): [number, number] | null {
  let lo = 0;
  let hi = 1;
  const axes = [[x, p.x, p.x + p.width], [y, p.y, p.y + p.height]] as const;
  for (const [[start, end], min, max] of axes) {
    const d = end - start;
    if (d === 0) {
      if (start < min - pad || start > max + pad) return null;
      continue;
    }
    const a = (min - pad - start) / d;
    const b = (max + pad - start) / d;
    lo = Math.max(lo, Math.min(a, b));
    hi = Math.min(hi, Math.max(a, b));
    if (hi <= lo) return null;
  }
  return [lo, hi];
}

/** Union the occupied lengths, so nested boxes and text never count the same space twice. */
function emptyGap(piece: View, subject: View, frame: View, scenery: readonly View[]): boolean {
  const x = nearest(piece.x, piece.x + piece.width, subject.x, subject.x + subject.width);
  const y = nearest(piece.y, piece.y + piece.height, subject.y, subject.y + subject.height);
  const pad = Math.min(piece.width, piece.height, frame.width * 0.04, frame.height * 0.04) / 2;
  const spans: [number, number][] = [];
  for (const other of scenery) {
    if (other === piece || contains(other, piece) || contains(other, subject) || contains(subject, other)) continue;
    const span = interval(other, x, y, pad);
    if (span !== null) spans.push(span);
  }
  spans.sort((a, b) => a[0] - b[0]);
  let covered = 0;
  let end = 0;
  for (const [lo, hi] of spans) {
    covered += Math.max(0, hi - Math.max(lo, end));
    end = Math.max(end, hi);
  }
  return covered <= 0.25; // at least three quarters of the gap is empty
}

/** A whole, small, unrelated piece isolated near the edge facing away from the subject.
 *  Callers remove known DOM relatives; containment also protects older takes without paths. */
export function isStray(piece: View, subject: View, frame: View, page: View, scenery: readonly View[]): boolean {
  if (!contains(piece, frame) || !contains(piece, page) || contains(piece, subject) || contains(subject, piece)) return false;
  if (piece.width * piece.height > frame.width * frame.height * 0.04 ||
      piece.width > frame.width * 0.3 || piece.height > frame.height * 0.25) return false;
  const left = subject.x - (piece.x + piece.width);
  const right = piece.x - (subject.x + subject.width);
  const above = subject.y - (piece.y + piece.height);
  const below = piece.y - (subject.y + subject.height);
  const atEdge = (left >= frame.width * 0.12 && piece.x - frame.x <= frame.width * 0.12) ||
    (right >= frame.width * 0.12 && frame.x + frame.width - (piece.x + piece.width) <= frame.width * 0.12) ||
    (above >= frame.height * 0.12 && piece.y - frame.y <= frame.height * 0.12) ||
    (below >= frame.height * 0.12 && frame.y + frame.height - (piece.y + piece.height) <= frame.height * 0.12);
  return atEdge && emptyGap(piece, subject, frame, scenery);
}

export function countStrays(candidates: readonly View[], subject: View, frame: View, page: View, scenery: readonly View[] = candidates): number {
  return candidates.filter((p) => isStray(p, subject, frame, page, scenery)).length;
}
