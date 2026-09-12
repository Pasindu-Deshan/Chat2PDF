import { hexToRgb } from './colorUtils';

function relativeLuminanceChannel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const R = relativeLuminanceChannel(r);
  const G = relativeLuminanceChannel(g);
  const B = relativeLuminanceChannel(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA) + 0.05;
  const lumB = relativeLuminance(hexB) + 0.05;
  return lumA > lumB ? lumA / lumB : lumB / lumA;
}

/**
 * Picks black or white text depending on which gives better contrast
 * against the given background, per WCAG relative luminance.
 */
export function autoTextColor(backgroundHex: string): string {
  const black = '#111B21';
  const white = '#FFFFFF';
  const contrastWithBlack = contrastRatio(backgroundHex, black);
  const contrastWithWhite = contrastRatio(backgroundHex, white);
  return contrastWithBlack >= contrastWithWhite ? black : white;
}

export function isAccessibleContrast(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= 4.5;
}
