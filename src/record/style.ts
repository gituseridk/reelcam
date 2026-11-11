/** Adds our own CSS (redaction, exclusion) to every document a context opens. It goes in as a
 *  constructed stylesheet, not a <style> tag: an app with a Content-Security-Policy that has no
 *  'unsafe-inline' for styles (common, and the chat app in the launch review) silently drops a
 *  <style> tag, which would leave redacted text readable. */
import type { BrowserContext } from 'playwright';

export async function installStyle(context: Pick<BrowserContext, 'addInitScript'>, css: string): Promise<void> {
  if (css === '') return;
  await context.addInitScript((text: string) => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(text);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }, css);
}
