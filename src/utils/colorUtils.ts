/** A small, distinct default palette for auto-assigning participant colors. */
const DEFAULT_PALETTE = [
  '#DCF8C6', // WhatsApp outgoing green
  '#D7E9FF', // soft blue
  '#FFE3D5', // peach
  '#EAD7FF', // lavender
  '#FFF3B0', // pale yellow
  '#D5F5EF', // mint
  '#FFD6E0', // blush pink
  '#E0E0E0', // neutral gray
];

export function defaultColorForIndex(index: number): string {
  return DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
}

export const COLOR_PRESETS = [
  '#DCF8C6',
  '#D7E9FF',
  '#FFE3D5',
  '#EAD7FF',
  '#FFF3B0',
  '#D5F5EF',
  '#FFD6E0',
  '#E0E0E0',
  '#25D366',
  '#128C7E',
  '#34B7F1',
  '#ECE5DD',
  '#FFFFFF',
  '#075E54',
];

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function isValidHex(hex: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}
