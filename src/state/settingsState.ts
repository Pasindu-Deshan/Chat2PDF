import { createContext, useContext } from 'react';
import type { ChatSettings, SettingsPreset } from '../types/settings';

export const LOCAL_STORAGE_KEY = 'chat2pdf:settings:v1';

export const DEFAULT_SETTINGS: ChatSettings = {
  rightSideParticipantId: null,
  background: {
    type: 'preset',
    preset: 'classic-pattern',
    customImage: null,
    opacity: 1,
    blur: 0,
    scale: 1,
    position: 'center',
  },
  header: {
    show: true,
    title: '',
    subtitle: '',
    autoTitle: true,
    backgroundColor: '#075E54',
    textColor: '#FFFFFF',
    height: 64,
    avatarText: '',
  },
  typography: {
    fontFamily: '"Noto Sans", "Noto Sans Sinhala", "Noto Sans Tamil", sans-serif',
    fontSize: 14.5,
    timestampSize: 11,
    timestampColor: 'rgba(0,0,0,0.45)',
  },
  bubble: {
    radius: 8,
    paddingX: 10,
    paddingY: 7,
    maxWidthPercent: 78,
    spacing: 3,
    showSenderName: true,
    showReadReceipts: true,
  },
  output: {
    width: 1080,
    maxHeight: 1920,
    fitMode: 'auto-split',
    pixelRatio: 2,
  },
  split: {
    mode: 'none',
    customDays: 1,
    range: { start: null, end: null },
    includeEmptyDays: false,
  },
  dateDisplay: {
    format: 'long',
    useRelativeLabels: true,
  },
  showDateSeparators: true,
  showTimestamps: true,
};

export const SETTINGS_PRESETS: Record<
  SettingsPreset,
  { label: string; apply: (s: ChatSettings) => ChatSettings }
> = {
  'whatsapp-classic': {
    label: 'WhatsApp Classic',
    apply: (s) => ({
      ...s,
      background: { ...s.background, type: 'preset', preset: 'classic-pattern' },
      header: { ...s.header, backgroundColor: '#075E54', textColor: '#FFFFFF' },
      bubble: { ...s.bubble, radius: 8 },
    }),
  },
  'soft-green': {
    label: 'Soft Green',
    apply: (s) => ({
      ...s,
      background: { ...s.background, type: 'preset', preset: 'soft-cream' },
      header: { ...s.header, backgroundColor: '#25D366', textColor: '#FFFFFF' },
      bubble: { ...s.bubble, radius: 14 },
    }),
  },
  'blue-chat': {
    label: 'Blue Chat',
    apply: (s) => ({
      ...s,
      background: { ...s.background, type: 'preset', preset: 'minimal-gray' },
      header: { ...s.header, backgroundColor: '#1E3A8A', textColor: '#FFFFFF' },
      bubble: { ...s.bubble, radius: 16 },
    }),
  },
  'dark-mode': {
    label: 'Dark Mode',
    apply: (s) => ({
      ...s,
      background: { ...s.background, type: 'preset', preset: 'minimal-gray' },
      header: { ...s.header, backgroundColor: '#111B21', textColor: '#E9EDEF' },
      typography: { ...s.typography, timestampColor: 'rgba(233,237,239,0.5)' },
      bubble: { ...s.bubble, radius: 8 },
    }),
  },
  minimal: {
    label: 'Minimal',
    apply: (s) => ({
      ...s,
      background: { ...s.background, type: 'preset', preset: 'light-paper' },
      header: { ...s.header, backgroundColor: '#FFFFFF', textColor: '#111B21' },
      bubble: { ...s.bubble, radius: 4 },
    }),
  },
};

interface PersistedUiPrefs {
  themeMode: 'light' | 'dark';
  output: ChatSettings['output'];
  typography: ChatSettings['typography'];
  bubble: ChatSettings['bubble'];
}

export function loadPersistedPrefs(): Partial<PersistedUiPrefs> | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function persistPrefs(prefs: PersistedUiPrefs): void {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage might be unavailable (private browsing, quota) — non-fatal.
  }
}

export const SettingsContext = createContext<{
  settings: ChatSettings;
  update: (patch: Partial<ChatSettings>) => void;
  applyPreset: (preset: SettingsPreset) => void;
  reset: () => void;
} | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsContext');
  return ctx;
}
