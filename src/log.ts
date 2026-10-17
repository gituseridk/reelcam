/** A small leveled logger that writes to stderr, so stdout stays clean for machine output. */
export type Level = 'quiet' | 'info' | 'debug';

const ORDER: Record<Level, number> = { quiet: 0, info: 1, debug: 2 };
let current: Level = 'info';
let sink: (line: string) => void = (line) => {
  process.stderr.write(`${line}\n`);
};

export function setLevel(level: Level): void {
  current = level;
}

/** Replaces the output (used by tests). Returns a function that restores the previous one. */
export function setSink(next: (line: string) => void): () => void {
  const previous = sink;
  sink = next;
  return () => {
    sink = previous;
  };
}

function emit(level: Level, tag: string, message: string): void {
  if (ORDER[current] < ORDER[level]) return;
  sink(`${tag} ${message}`);
}

export const log = {
  info: (message: string): void => {
    emit('info', 'showreel', message);
  },
  debug: (message: string): void => {
    emit('debug', 'showreel:debug', message);
  },
  warn: (message: string): void => {
    emit('info', 'showreel: warning:', message);
  },
  /** Errors are always written, whatever the level. */
  error: (message: string): void => {
    sink(`showreel: error: ${message}`);
  },
};
