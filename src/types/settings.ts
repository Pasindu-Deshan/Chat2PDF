export type BackgroundPreset =
  | 'light-paper'
  | 'classic-pattern'
  | 'minimal-gray'
  | 'soft-cream'
  | 'custom';

export type SplitMode =
  | 'none'
  | 'every-day'
  | 'every-2-days'
  | 'every-3-days'
  | 'custom-days'
  | 'custom-range';

export type PdfPageSize = 'image' | 'a4' | 'letter' | 'custom';
export type PdfOrientation = 'portrait' | 'landscape';

export interface DateRange {
  start: string | null; // YYYY-MM-DD
  end: string | null; // YYYY-MM-DD
}

export interface BackgroundSettings {
  type: 'preset' | 'custom';
  preset: BackgroundPreset;
  customImage: string | null; // object URL / data URL
  opacity: number; // 0-1
  blur: number; // px
  scale: number; // 1 = 100%
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

export interface HeaderSettings {
  show: boolean;
  title: string;
  subtitle: string;
  autoTitle: boolean;
  backgroundColor: string;
  textColor: string;
  height: number;
  avatarText: string;
}

export interface TypographySettings {
  fontFamily: string;
  fontSize: number;
  timestampSize: number;
  timestampColor: string;
}

export interface BubbleSettings {
  radius: number;
  paddingX: number;
  paddingY: number;
  maxWidthPercent: number; // % of chat width
  spacing: number;
  showSenderName: boolean;
  showReadReceipts: boolean;
}

export interface OutputSettings {
  width: number;
  maxHeight: number;
  fitMode: 'fit-all' | 'auto-split';
  pixelRatio: number;
}

export interface SplitSettings {
  mode: SplitMode;
  customDays: number;
  range: DateRange;
  includeEmptyDays: boolean;
}

export interface DateDisplaySettings {
  format: 'long' | 'short' | 'numeric';
  useRelativeLabels: boolean; // "Today" / "Yesterday"
}

export interface PdfSettings {
  pageSize: PdfPageSize;
  orientation: PdfOrientation;
  marginPx: number;
  customWidthMm: number;
  customHeightMm: number;
}

export interface ChatSettings {
  rightSideParticipantId: string | null;
  background: BackgroundSettings;
  header: HeaderSettings;
  typography: TypographySettings;
  bubble: BubbleSettings;
  output: OutputSettings;
  split: SplitSettings;
  dateDisplay: DateDisplaySettings;
  showDateSeparators: boolean;
  showTimestamps: boolean;
}

export type SettingsPreset =
  | 'whatsapp-classic'
  | 'soft-green'
  | 'blue-chat'
  | 'dark-mode'
  | 'minimal';
