import type { BackgroundSettings } from '../../types/settings';
import type { CSSProperties } from 'react';

/**
 * All presets are produced with plain CSS gradients/patterns — no external
 * image assets — so the app stays fully offline and doesn't ship any
 * WhatsApp-owned artwork. They evoke the general "paper with a faint
 * texture" feeling of a chat background without reproducing it.
 */
export function backgroundStyleFor(bg: BackgroundSettings): CSSProperties {
  if (bg.type === 'custom' && bg.customImage) {
    return {
      backgroundColor: '#E5DDD5',
      backgroundImage: `url(${bg.customImage})`,
      backgroundSize: `${bg.scale * 100}%`,
      backgroundPosition: bg.position,
      backgroundRepeat: 'no-repeat',
      opacity: 1,
      filter: bg.blur > 0 ? `blur(${bg.blur}px)` : undefined,
    };
  }

  switch (bg.preset) {
    case 'light-paper':
      return {
        backgroundColor: '#FAF9F6',
        backgroundImage:
          'repeating-linear-gradient(135deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 14px)',
      };
    case 'minimal-gray':
      return { backgroundColor: '#EDEDED' };
    case 'soft-cream':
      return { backgroundColor: '#F3ECDD' };
    case 'custom':
      return { backgroundColor: '#E5DDD5' };
    case 'classic-pattern':
    default:
      return {
        backgroundColor: '#E4DDD3',
        backgroundImage:
          'radial-gradient(circle at 12px 12px, rgba(150,140,120,0.14) 2px, transparent 2.4px), ' +
          'radial-gradient(circle at 30px 34px, rgba(150,140,120,0.10) 1.6px, transparent 2px)',
        backgroundSize: '44px 44px, 44px 44px',
      };
  }
}

export function backgroundOverlayOpacity(bg: BackgroundSettings): number {
  return bg.opacity;
}
