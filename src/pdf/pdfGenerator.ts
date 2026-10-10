import { jsPDF } from 'jspdf';
import type { GeneratedPage } from '../types/chat';
import type { PdfSettings } from '../types/settings';

const MM_PER_PX_AT_96DPI = 25.4 / 96;

const PAGE_SIZES_MM: Record<'a4' | 'letter', { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
};

function loadImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to read generated image dimensions.'));
    img.src = dataUrl;
  });
}

function imageFormatOf(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
}

/**
 * Builds a single PDF from the completed generated pages, in order, and
 * returns it as a Blob. Each page's image is drawn at its own size (when
 * `pageSize: "image"`) so nothing is distorted or cropped; for fixed paper
 * sizes the image is scaled down to fit within the margins while
 * preserving its aspect ratio.
 *
 * Performance note: each generated page already recorded its own pixel
 * dimensions at capture time (see `renderPageToDataUrl`). When that's
 * available we use it directly instead of reloading/decoding every image a
 * second time through an `<img>` element just to read its width/height —
 * for a many-page export those decodes were a meaningful chunk of the "PDF
 * generation" wait. The reload path is kept as a fallback only for pages
 * that somehow don't have recorded dimensions.
 */
export async function buildPdf(
  pages: GeneratedPage[],
  settings: PdfSettings
): Promise<Blob> {
  const done = pages.filter((p) => p.status === 'done' && p.dataUrl);
  if (done.length === 0) {
    throw new Error('No generated pages are ready to export yet.');
  }

  const builder = createPdfBuilder(settings);
  for (const page of done) {
    const dimensions =
      page.pixelWidth && page.pixelHeight
        ? { width: page.pixelWidth, height: page.pixelHeight }
        : await loadImageSize(page.dataUrl as string);
    builder.addPage(page.dataUrl as string, dimensions.width, dimensions.height);
  }

  return builder.toBlob();
}

export interface PdfBuilder {
  addPage: (dataUrl: string, pixelWidth: number, pixelHeight: number) => void;
  toBlob: () => Blob;
}

export function createPdfBuilder(settings: PdfSettings): PdfBuilder {
  let doc: jsPDF | null = null;
  let pageIndex = 0;
  const marginMm = settings.marginPx * MM_PER_PX_AT_96DPI;

  return {
    addPage(dataUrl, pixelWidth, pixelHeight) {
      const imageWidthMm = pixelWidth * MM_PER_PX_AT_96DPI;
      const imageHeightMm = pixelHeight * MM_PER_PX_AT_96DPI;
      let pageWidthMm: number;
      let pageHeightMm: number;
      let drawWidthMm: number;
      let drawHeightMm: number;

      if (settings.pageSize === 'image') {
        pageWidthMm = imageWidthMm + marginMm * 2;
        pageHeightMm = imageHeightMm + marginMm * 2;
        drawWidthMm = imageWidthMm;
        drawHeightMm = imageHeightMm;
      } else {
        const base =
          settings.pageSize === 'custom'
            ? { width: settings.customWidthMm, height: settings.customHeightMm }
            : PAGE_SIZES_MM[settings.pageSize];
        pageWidthMm = settings.orientation === 'landscape' ? Math.max(base.width, base.height) : Math.min(base.width, base.height);
        pageHeightMm = settings.orientation === 'landscape' ? Math.min(base.width, base.height) : Math.max(base.width, base.height);

        const availableWidth = pageWidthMm - marginMm * 2;
        const availableHeight = pageHeightMm - marginMm * 2;
        const scale = Math.min(availableWidth / imageWidthMm, availableHeight / imageHeightMm, 1);
        drawWidthMm = imageWidthMm * scale;
        drawHeightMm = imageHeightMm * scale;
      }

      if (!doc) {
        doc = new jsPDF({
          orientation: pageWidthMm >= pageHeightMm ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [pageWidthMm, pageHeightMm],
          compress: true,
        });
      } else {
        doc.addPage([pageWidthMm, pageHeightMm], pageWidthMm >= pageHeightMm ? 'landscape' : 'portrait');
      }

      doc.addImage(
        dataUrl,
        imageFormatOf(dataUrl),
        (pageWidthMm - drawWidthMm) / 2,
        (pageHeightMm - drawHeightMm) / 2,
        drawWidthMm,
        drawHeightMm,
        `page-${pageIndex}`,
        'FAST'
      );
      pageIndex += 1;
    },
    toBlob() {
      if (!doc || pageIndex === 0) throw new Error('No generated pages are ready to export yet.');
      return doc.output('blob');
    },
  };
}
