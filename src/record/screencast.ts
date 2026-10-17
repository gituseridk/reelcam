/** Captures the page with a CDP screencast: JPEG frames with their own timestamps, at device scale. */
import type { CDPSession } from 'playwright';
import { log } from '../log.js';

export interface Frame {
  data: string;
  t: number;
}

interface FrameEvent {
  data: string;
  sessionId: number;
  metadata: { timestamp?: number };
}

/** Starts the screencast; the returned function stops it and gives every frame, oldest first. */
export async function startScreencast(cdp: CDPSession, size: { width: number; height: number }): Promise<() => Promise<Frame[]>> {
  const frames: Frame[] = [];
  const onFrame = (event: FrameEvent): void => {
    const t = event.metadata.timestamp;
    if (t !== undefined) frames.push({ data: event.data, t });
    cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch((error: unknown) => {
      log.debug(`screencast ack failed: ${String(error)}`);
    });
  };
  cdp.on('Page.screencastFrame', onFrame);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1, maxWidth: size.width, maxHeight: size.height });
  return async () => {
    await cdp.send('Page.stopScreencast');
    cdp.off('Page.screencastFrame', onFrame);
    return frames;
  };
}
