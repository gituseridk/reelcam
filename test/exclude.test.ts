import type { BrowserContext } from 'playwright';
import { describe, expect, it, vi } from 'vitest';
import { excludeCss, installExclusion } from '../src/record/exclude.js';

const disposable = { dispose: (): Promise<void> => Promise.resolve(), [Symbol.asyncDispose]: (): Promise<void> => Promise.resolve() };

describe('excluded scenery', () => {
  it('hides selected elements and descendants while retaining layout', () => {
    const css = excludeCss(['#new-chat', '.sidebar button']);
    expect(css).toBe(':is(#new-chat,\n.sidebar button),\n:is(#new-chat,\n.sidebar button) * { visibility: hidden !important; }');
    expect(css).not.toContain('display:');
    expect(excludeCss([])).toBe('');
  });

  it('installs the CSS as a context init script for every document', async () => {
    const addInitScript = vi.fn<BrowserContext['addInitScript']>().mockResolvedValue(disposable);
    await installExclusion({ addInitScript }, ['#new-chat']);
    expect(addInitScript).toHaveBeenCalledOnce();
    expect(addInitScript).toHaveBeenCalledWith(expect.any(Function), excludeCss(['#new-chat']));
  });

  it('does not add an init script when nothing is excluded', async () => {
    const addInitScript = vi.fn<BrowserContext['addInitScript']>().mockResolvedValue(disposable);
    await installExclusion({ addInitScript }, []);
    expect(addInitScript).not.toHaveBeenCalled();
  });
});
