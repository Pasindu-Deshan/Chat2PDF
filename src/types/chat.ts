export type MessageType = 'message' | 'system';

export type MediaKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'sticker'
  | 'document'
  | 'gif'
  | null;

/**
 * A single normalized chat message (or system event) parsed out of a
 * WhatsApp export. `date` is always an ISO calendar date (YYYY-MM-DD) in the
 * *local* calendar sense of the export — we never reinterpret it through a
 * timezone, we just keep the digits WhatsApp gave us.
 */
export interface ChatMessage {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // HH:mm (24h)
  rawTimestamp: string; // exactly as it appeared in the export
  sender?: string; // absent for system messages
  text: string;
  type: MessageType;
  isMedia: boolean;
  mediaKind: MediaKind;
}

export interface ParseWarning {
  line: number;
  content: string;
  reason: string;
}

export interface ParseResult {
  messages: ChatMessage[];
  participants: string[];
  warnings: ParseWarning[];
  firstDate: string | null;
  lastDate: string | null;
  totalLines: number;
  matchedLines: number;
}

/** A day's worth of messages, possibly further split by pagination. */
export interface ChatPageGroup {
  id: string;
  date: string | null; // null for "no splitting" mode
  label: string;
  messages: ChatMessage[];
  pageIndexInGroup: number; // 0-based index among pages generated for this date
  totalPagesInGroup: number;
}

export interface GeneratedPage {
  id: string;
  group: ChatPageGroup;
  dataUrl: string | null;
  status: 'pending' | 'rendering' | 'done' | 'error';
  error?: string;
}
