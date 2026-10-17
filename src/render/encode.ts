/** ffmpeg: raw RGBA frames in, H.264 MP4 out (and an optional palette GIF). Set SHOWREEL_FFMPEG
 *  to use a specific binary. */
import { spawn, type ChildProcess, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { ShowreelError, describe } from '../errors.js';
import type { Preset } from '../presets/index.js';

export const ffmpegBin = (): string => process.env.SHOWREEL_FFMPEG ?? 'ffmpeg';

export function mp4Args(preset: Preset, output: string): string[] {
  const size = `${String(preset.width)}x${String(preset.height)}`;
  return ['-nostdin', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', size, '-r', String(preset.fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(preset.crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output];
}

export function gifArgs(input: string, output: string, width: number): string[] {
  const filter = `fps=12,scale=${String(width)}:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`;
  return ['-nostdin', '-loglevel', 'error', '-y', '-i', input, '-vf', filter, output];
}

function missing(error: unknown): ShowreelError {
  return new ShowreelError(`cannot run ffmpeg (${ffmpegBin()}): ${describe(error)}`, 'Install ffmpeg (e.g. "sudo apt-get install ffmpeg" or "brew install ffmpeg"), or set SHOWREEL_FFMPEG.', { cause: error });
}

/** Resolves with the exit code, or rejects when the process could not start. */
function exited(proc: ChildProcess): Promise<number | null> {
  return new Promise((resolve, reject) => {
    proc.once('close', resolve);
    proc.once('error', (error) => {
      reject(missing(error));
    });
  });
}

/** Runs ffmpeg to the end; rejects with its stderr on a non-zero exit. */
export async function runFfmpeg(args: string[]): Promise<void> {
  const proc = spawn(ffmpegBin(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  const code = await exited(proc);
  if (code !== 0) throw new ShowreelError(`ffmpeg failed (exit ${String(code)}): ${stderr.trim()}`);
}

/** A running MP4 encoder: write RGBA frames, then finish(). */
export class Encoder {
  private readonly proc: ChildProcessWithoutNullStreams;
  private readonly done: Promise<number | null>;
  private failure: Error | null = null;
  private stderr = '';

  constructor(preset: Preset, output: string) {
    this.proc = spawn(ffmpegBin(), mp4Args(preset, output));
    this.done = exited(this.proc);
    this.done.catch((error: unknown) => {
      this.failure = error instanceof Error ? error : missing(error);
    });
    this.proc.stdin.on('error', (error) => {
      this.failure ??= error;
    });
    this.proc.stderr.on('data', (chunk: Buffer) => {
      this.stderr += chunk.toString();
    });
  }

  private rethrow(): void {
    if (this.failure !== null) throw this.failure;
  }

  async write(rgba: Buffer): Promise<void> {
    this.rethrow();
    if (!this.proc.stdin.write(rgba)) await Promise.race([once(this.proc.stdin, 'drain'), this.done]);
    this.rethrow();
  }

  async finish(): Promise<void> {
    this.proc.stdin.end();
    const code = await this.done;
    if (code !== 0) throw new ShowreelError(`ffmpeg failed (exit ${String(code)}): ${this.stderr.trim()}`);
  }
}
