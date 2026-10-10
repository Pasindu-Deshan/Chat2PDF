import { createPdfBuilder } from './pdfGenerator';
import type { PdfSettings } from '../types/settings';

type PdfWorkerRequest =
  | { type: 'init'; settings: PdfSettings }
  | { type: 'add-page'; dataUrl: string; pixelWidth: number; pixelHeight: number }
  | { type: 'finalize' };

type PdfWorkerResponse =
  | { type: 'ready' }
  | { type: 'page-added' }
  | { type: 'done'; blob: Blob }
  | { type: 'error'; message: string };

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<PdfWorkerRequest>) => void) | null;
  postMessage: (message: PdfWorkerResponse) => void;
};

let builder: ReturnType<typeof createPdfBuilder> | null = null;

ctx.onmessage = (event) => {
  try {
    const request = event.data;
    if (request.type === 'init') {
      builder = createPdfBuilder(request.settings);
      ctx.postMessage({ type: 'ready' });
    } else if (request.type === 'add-page') {
      if (!builder) throw new Error('PDF generation has not been initialized.');
      builder.addPage(request.dataUrl, request.pixelWidth, request.pixelHeight);
      ctx.postMessage({ type: 'page-added' });
    } else {
      if (!builder) throw new Error('PDF generation has not been initialized.');
      ctx.postMessage({ type: 'done', blob: builder.toBlob() });
      builder = null;
    }
  } catch (err) {
    ctx.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Failed to assemble the PDF.',
    });
  }
};