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

  const sizes = await Promise.all(
    done.map((page) =>
      page.pixelWidth && page.pixelHeight
        ? Promise.resolve({ width: page.pixelWidth, height: page.pixelHeight })
        : loadImageSize(page.dataUrl as string)
    )
  );

  let doc: jsPDF | null = null;
  const marginMm = settings.marginPx * MM_PER_PX_AT_96DPI;

  for (let i = 0; i < done.length; i += 1) {
    const page = done[i];
    const dataUrl = page.dataUrl as string;
    const { width: pxWidth, height: pxHeight } = sizes[i];

    const imgWidthMm = pxWidth * MM_PER_PX_AT_96DPI;
    const imgHeightMm = pxHeight * MM_PER_PX_AT_96DPI;

    let pageWidthMm: number;
    let pageHeightMm: number;
    let drawWidthMm: number;
    let drawHeightMm: number;

    if (settings.pageSize === 'image') {
      pageWidthMm = imgWidthMm + marginMm * 2;
      pageHeightMm = imgHeightMm + marginMm * 2;
      drawWidthMm = imgWidthMm;
      drawHeightMm = imgHeightMm;
    } else {
      const base =
        settings.pageSize === 'custom'
          ? { width: settings.customWidthMm, height: settings.customHeightMm }
          : PAGE_SIZES_MM[settings.pageSize];

      pageWidthMm = settings.orientation === 'landscape' ? Math.max(base.width, base.height) : Math.min(base.width, base.height);
      pageHeightMm = settings.orientation === 'landscape' ? Math.min(base.width, base.height) : Math.max(base.width, base.height);

      const availableWidth = pageWidthMm - marginMm * 2;
      const availableHeight = pageHeightMm - marginMm * 2;
      const scale = Math.min(availableWidth / imgWidthMm, availableHeight / imgHeightMm, 1);
      drawWidthMm = imgWidthMm * scale;
      drawHeightMm = imgHeightMm * scale;
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

    const offsetX = (pageWidthMm - drawWidthMm) / 2;
    const offsetY = (pageHeightMm - drawHeightMm) / 2;

    doc.addImage(
      dataUrl,
      imageFormatOf(dataUrl),
      offsetX,
      offsetY,
      drawWidthMm,
      drawHeightMm,
      `page-${i}`,
      'FAST'
    );
  }

  return doc!.output('blob');
}
