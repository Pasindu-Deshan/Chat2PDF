import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { toPng, toJpeg } from 'html-to-image';
import type { ChatMessage, ChatPageGroup } from '../types/chat';
import type { ChatSettings } from '../types/settings';
import type { Participant } from '../types/participant';
import { ChatPreview } from '../components/ChatPreview/ChatPreview';

/**
 * Mounts a React node into a detached, off-screen container (not
 * display:none — that would report zero height — but visually hidden and
 * out of the layout flow) so we can measure or capture it independent of
 * the user's current viewport/scroll position.
 */
function createOffscreenHost(width: number): HTMLDivElement {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '-99999px';
  host.style.width = `${width}px`;
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);
  return host;
}

function destroyOffscreenHost(host: HTMLDivElement, root: Root) {
  root.unmount();
  host.remove();
}

interface MountResult {
  host: HTMLDivElement;
  root: Root;
  element: HTMLDivElement;
}

async function mountPreview(
  messages: ChatMessage[],
  participants: Participant[],
  settings: ChatSettings,
  width: number
): Promise<MountResult> {
  const host = createOffscreenHost(width);
  const root = createRoot(host);

  let elementRef: HTMLDivElement | null = null;

  await new Promise<void>((resolve) => {
    root.render(
      createElement(ChatPreview, {
        messages,
        participants,
        settings,
        width,
        ref: (node: HTMLDivElement | null) => {
          elementRef = node;
        },
      })
    );
    // Two rAF ticks give MUI/emotion styles + fonts a chance to flush
    // before we measure. Font loading itself is awaited by callers.
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  if (!elementRef) {
    destroyOffscreenHost(host, root);
    throw new Error('Failed to mount chat preview for rendering.');
  }

  return { host, root, element: elementRef };
}

async function waitForFontsAndImages(container: HTMLElement): Promise<void> {
  try {
    if ('fonts' in document) {
      await (document as Document & { fonts: FontFaceSet }).fonts.ready;
    }
  } catch {
    // Non-fatal — proceed without waiting on the Font Loading API.
  }

  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        })
    )
  );
}

// A small safety margin subtracted from the available message-area height
// per page, so rounding/subpixel layout differences between the measuring
// pass and the final capture never push a page a pixel or two over budget.
const HEIGHT_SAFETY_MARGIN_PX = 12;

/**
 * Splits a single date-group's messages into as many sub-pages as needed so
 * that each rendered page's height stays within `settings.output.maxHeight`.
 * Never splits inside a message bubble: it always breaks between two whole
 * messages.
 *
 * Performance note: this mounts the ENTIRE group exactly once — regardless
 * of how many resulting pages it produces — and reads every message row's
 * position out of that single layout pass, rather than repeatedly
 * mounting/measuring candidate slices (which is what an earlier version of
 * this function did via a binary search; for a group that needed, say, 5
 * sub-pages that meant dozens of full React mounts just to work out where
 * to cut). One mount + one batch of reads is enough because message rows
 * stack vertically and don't affect each other's height, so their absolute
 * positions from a single full render already tell us exactly where every
 * possible cut point is.
 */
export async function paginateGroupByHeight(
  group: ChatPageGroup,
  participants: Participant[],
  settings: ChatSettings
): Promise<ChatPageGroup[]> {
  if (settings.output.fitMode === 'fit-all' || group.messages.length === 0) {
    return [{ ...group, pageIndexInGroup: 0, totalPagesInGroup: 1 }];
  }

  const width = settings.output.width;
  const maxHeight = settings.output.maxHeight;
  const headerHeight = settings.header.show ? settings.header.height : 0;
  const availableHeight = Math.max(80, maxHeight - headerHeight - HEIGHT_SAFETY_MARGIN_PX);

  const { host, root, element } = await mountPreview(group.messages, participants, settings, width);

  let breaks: number[];
  try {
    await waitForFontsAndImages(element);

    const rows = Array.from(element.querySelectorAll<HTMLElement>('[data-message-id]'));

    if (rows.length !== group.messages.length) {
      // Shouldn't happen, but fail safe to "everything on one page" rather
      // than silently mis-paginating if the DOM shape ever changes.
      breaks = [0];
    } else {
      breaks = [0];
      let pageStartTop = rows[0].offsetTop;

      for (let i = 1; i < rows.length; i += 1) {
        const bottom = rows[i].offsetTop + rows[i].offsetHeight;
        if (bottom - pageStartTop > availableHeight) {
          breaks.push(i);
          pageStartTop = rows[i].offsetTop;
        }
      }
    }
  } finally {
    destroyOffscreenHost(host, root);
  }

  const pages: ChatMessage[][] = breaks.map((start, i) => {
    const end = i + 1 < breaks.length ? breaks[i + 1] : group.messages.length;
    return group.messages.slice(start, end);
  });

  return pages.map((msgs, i) => ({
    ...group,
    id: `${group.id}-p${i + 1}`,
    messages: msgs,
    pageIndexInGroup: i,
    totalPagesInGroup: pages.length,
  }));
}

export interface RenderedPage {
  dataUrl: string;
  pixelWidth: number;
  pixelHeight: number;
}

/** Renders one already-paginated group to a high-resolution image data URL. */
export async function renderPageToDataUrl(
  group: ChatPageGroup,
  participants: Participant[],
  settings: ChatSettings
): Promise<RenderedPage> {
  const width = settings.output.width;
  const { host, root, element } = await mountPreview(group.messages, participants, settings, width);

  try {
    await waitForFontsAndImages(element);
    const height = element.scrollHeight;
    const capture =
      settings.output.format === 'jpeg'
        ? toJpeg(element, {
            width,
            height,
            pixelRatio: settings.output.pixelRatio,
            backgroundColor: '#FFFFFF',
            quality: settings.output.jpegQuality,
            cacheBust: true,
          })
        : toPng(element, {
            width,
            height,
            pixelRatio: settings.output.pixelRatio,
            backgroundColor: '#FFFFFF',
            cacheBust: true,
          });
    const dataUrl = await capture;
    return {
      dataUrl,
      pixelWidth: Math.round(width * settings.output.pixelRatio),
      pixelHeight: Math.round(height * settings.output.pixelRatio),
    };
  } finally {
    destroyOffscreenHost(host, root);
  }
}

/**
 * Runs `fn` over `items` with at most `limit` in flight at once. Rendering
 * pages is layout/canvas-heavy and independent per page, so a small amount
 * of concurrency (rather than one-at-a-time) meaningfully speeds up
 * multi-page exports without spiking memory the way rendering everything
 * at once would.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
