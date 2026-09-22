import { parseWhatsAppChat } from './whatsappParser';
import type { ParseResult } from '../types/chat';

export interface ParserWorkerRequest {
  file: File;
}

export type ParserWorkerResponse =
  | { type: 'progress'; processed: number; total: number }
  | { type: 'done'; result: ParseResult }
  | { type: 'error'; message: string };

/**
 * Workers share the DOM's `lib.dom` types with the main thread in this
 * project's single tsconfig (rather than a separate `lib: ["webworker"]`
 * program), so `self` is typed as `Window` here even though at runtime this
 * file only ever executes as a dedicated worker. We narrow it locally to
 * the handful of members we actually use instead of fighting the global
 * type, which keeps this file honest about what it depends on.
 */
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<ParserWorkerRequest>) => void) | null;
  postMessage: (message: ParserWorkerResponse) => void;
};

ctx.onmessage = async (event) => {
  try {
    const { file } = event.data;
    const text = await file.text();
    const result = parseWhatsAppChat(text, (processed, total) => {
      ctx.postMessage({ type: 'progress', processed, total });
    });
    ctx.postMessage({ type: 'done', result });
  } catch (err) {
    ctx.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown error while parsing the file.',
    });
  }
};
