/** Every failure Showreel reports to a user: a short message plus a hint on how to fix it. */
export class ShowreelError extends Error {
  readonly hint: string | undefined;

  constructor(message: string, hint?: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ShowreelError';
    this.hint = hint;
  }
}

/** A readable one-line description of any thrown value. */
export function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
