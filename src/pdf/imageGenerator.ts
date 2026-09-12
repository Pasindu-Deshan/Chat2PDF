import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { toPng } from 'html-to-image';
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

/**
 * Splits a single date-group's messages into as many sub-pages as needed so
 * that each rendered page's height stays within `settings.output.maxHeight`.
 * Never splits inside a message bubble: it measures cumulative height and
 * always breaks between two whole messages.
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

  const pages: ChatMessage[][] = [];
  let remaining = group.messages;

  while (remaining.length > 0) {
    const fullHeight = await measureHeight(remaining, participants, settings, width);
    if (fullHeight <= maxHeight) {
      pages.push(remaining);
      break;
    }

    // Binary search the largest prefix of `remaining` that still fits.
    let lo = 1;
    let hi = remaining.length;
    let best = 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const slice = remaining.slice(0, mid);
      // eslint-disable-next-line no-await-in-loop
      const height = await measureHeight(slice, participants, settings, width);
      if (height <= maxHeight) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    pages.push(remaining.slice(0, best));
    remaining = remaining.slice(best);
  }

  return pages.map((msgs, i) => ({
    ...group,
    id: `${group.id}-p${i + 1}`,
    messages: msgs,
    pageIndexInGroup: i,
    totalPagesInGroup: pages.length,
  }));
}

async function measureHeight(
  messages: ChatMessage[],
  participants: Participant[],
  settings: ChatSettings,
  width: number
): Promise<number> {
  const { host, root, element } = await mountPreview(messages, participants, settings, width);
  const height = element.scrollHeight;
  destroyOffscreenHost(host, root);
  return height;
}

/** Renders one already-paginated group to a high-resolution PNG data URL. */
export async function renderPageToDataUrl(
  group: ChatPageGroup,
  participants: Participant[],
  settings: ChatSettings
): Promise<string> {
  const width = settings.output.width;
  const { host, root, element } = await mountPreview(group.messages, participants, settings, width);

  try {
    await waitForFontsAndImages(element);
    const dataUrl = await toPng(element, {
      width,
      height: element.scrollHeight,
      pixelRatio: settings.output.pixelRatio,
      backgroundColor: '#FFFFFF',
      cacheBust: true,
    });
    return dataUrl;
  } finally {
    destroyOffscreenHost(host, root);
  }
}
