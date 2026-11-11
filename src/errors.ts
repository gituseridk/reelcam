/** Every failure reported to a user: a short message plus a hint on how to fix it. */
export class UserError extends Error {
  readonly hint: string | undefined;

  constructor(message: string, hint?: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'UserError';
    this.hint = hint;
  }
}

/** A failure caused by what the user asked for (the command line, the script, a file that would
 *  be overwritten): exit code 2, fix the input and run again. */
export class UsageError extends UserError {
  constructor(message: string, hint?: string, options?: { cause?: unknown }) {
    super(message, hint, options);
    this.name = 'UsageError';
  }
}

/** A readable one-line description of any thrown value. */
export function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
