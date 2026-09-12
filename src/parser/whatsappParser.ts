import type { ChatMessage, MediaKind, ParseResult, ParseWarning } from '../types/chat';
import { parseWhatsAppDate, parseWhatsAppTime } from './dateUtils';

// Invisible bidi/control marks that modern WhatsApp exports sprinkle around
// dates and times (LRM, RLM, LRE/RLE/PDF, narrow no-break space before AM/PM).
const INVISIBLE_MARKS = /[\u200E\u200F\u202A-\u202E]/g;
const NNBSP = /\u202F/g;

// Android/desktop style: "10/09/2019, 16:04 - Deshan: Hello"
const DASH_HEADER = /^(\d{1,4}[./\-]\d{1,2}[./\-]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?)\s*-\s*(.*)$/;

// iOS style: "[10/09/2019, 4:04:32 PM] Deshan: Hello"
const BRACKET_HEADER = /^\[(\d{1,4}[./\-]\d{1,2}[./\-]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?)\]\s*(.*)$/;

const MAX_SENDER_WORDS = 6;
const MAX_SENDER_LENGTH = 60;

const MEDIA_PATTERNS: Array<{ kind: MediaKind; pattern: RegExp }> = [
  { kind: 'sticker', pattern: /sticker omitted/i },
  { kind: 'gif', pattern: /gif omitted/i },
  { kind: 'image', pattern: /image omitted/i },
  { kind: 'video', pattern: /video omitted/i },
  { kind: 'audio', pattern: /audio omitted/i },
  { kind: 'document', pattern: /document omitted/i },
  { kind: 'image', pattern: /<Media omitted>/i },
  { kind: 'document', pattern: /\.(pdf|docx?|xlsx?|pptx?)\s*\(file attached\)/i },
  { kind: 'image', pattern: /\.(jpe?g|png|webp)\s*\(file attached\)/i },
  { kind: 'video', pattern: /\.(mp4|mov|avi)\s*\(file attached\)/i },
  { kind: 'audio', pattern: /\.(opus|mp3|m4a|ogg)\s*\(file attached\)/i },
];

function detectMedia(text: string): { isMedia: boolean; mediaKind: MediaKind } {
  for (const { kind, pattern } of MEDIA_PATTERNS) {
    if (pattern.test(text)) {
      return { isMedia: true, mediaKind: kind };
    }
  }
  return { isMedia: false, mediaKind: null };
}

interface HeaderMatch {
  dateRaw: string;
  timeRaw: string;
  rest: string;
}

function matchHeader(line: string): HeaderMatch | null {
  const dash = line.match(DASH_HEADER);
  if (dash) {
    return { dateRaw: dash[1], timeRaw: dash[2], rest: dash[3] };
  }
  const bracket = line.match(BRACKET_HEADER);
  if (bracket) {
    return { dateRaw: bracket[1], timeRaw: bracket[2], rest: bracket[3] };
  }
  return null;
}

/**
 * Splits "rest" (everything after "date, time - ") into a sender + message
 * if it looks like "Sender: message", or returns null (meaning: this is a
 * system message and the whole "rest" is the event text).
 *
 * We only split on the FIRST ": " occurrence, which correctly keeps a
 * message like "Deshan: Time: 16:04" or "Deshan: URL: https://x.com" intact,
 * and we sanity-check the candidate sender against a max word/length count
 * so that a system message which happens to contain ": " (rare, but
 * possible) doesn't get mis-split into a fake participant.
 */
function splitSenderAndMessage(rest: string): { sender: string; text: string } | null {
  const idx = rest.indexOf(': ');
  if (idx === -1) return null;

  const candidateSender = rest.slice(0, idx).trim();
  const message = rest.slice(idx + 2);

  if (!candidateSender) return null;
  if (candidateSender.length > MAX_SENDER_LENGTH) return null;

  const wordCount = candidateSender.split(/\s+/).filter(Boolean).length;
  if (wordCount > MAX_SENDER_WORDS) return null;

  // Sentence-like candidates ("Messages to this chat are now secured")
  // almost always end with a word that isn't a name and contain no name
  // punctuation; the length/word-count guard above catches the vast
  // majority already. As a second guard, a trailing period on the
  // candidate sender strongly suggests it's actually prose, not a name.
  if (/[.!?]$/.test(candidateSender)) return null;

  return { sender: candidateSender, text: message };
}

function stripInvisible(line: string): string {
  return line.replace(INVISIBLE_MARKS, '').replace(NNBSP, ' ');
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `msg-${idCounter}-${Date.now().toString(36)}`;
}

export function parseWhatsAppChat(rawText: string): ParseResult {
  idCounter = 0;

  // Normalize line endings and strip a possible BOM.
  const text = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');

  const messages: ChatMessage[] = [];
  const warnings: ParseWarning[] = [];
  const participantSet = new Set<string>();

  let current: ChatMessage | null = null;

  lines.forEach((originalLine, index) => {
    const line = stripInvisible(originalLine);

    if (line.trim() === '') {
      // Blank lines within a multiline message are preserved as part of
      // that message; a leading/trailing blank line elsewhere is ignored.
      if (current) {
        current.text += '\n';
      }
      return;
    }

    const header = matchHeader(line);

    if (header) {
      const dateParts = parseWhatsAppDate(header.dateRaw);
      const time = parseWhatsAppTime(header.timeRaw);

      if (!dateParts || !time) {
        // Looked like a header but the date/time didn't validate; treat as
        // a continuation of the previous message rather than dropping it.
        if (current) {
          current.text += (current.text ? '\n' : '') + line;
        } else {
          warnings.push({
            line: index + 1,
            content: line,
            reason: 'Line looked like a message header but the date or time could not be parsed.',
          });
        }
        return;
      }

      const split = splitSenderAndMessage(header.rest);

      if (split) {
        const trimmedText = split.text.replace(/\s+$/, '');
        const { isMedia, mediaKind } = detectMedia(trimmedText);
        current = {
          id: nextId(),
          date: dateParts.iso,
          timestamp: time,
          rawTimestamp: header.timeRaw,
          sender: split.sender,
          text: trimmedText,
          type: 'message',
          isMedia,
          mediaKind,
        };
        participantSet.add(split.sender);
      } else {
        current = {
          id: nextId(),
          date: dateParts.iso,
          timestamp: time,
          rawTimestamp: header.timeRaw,
          text: header.rest.trim(),
          type: 'system',
          isMedia: false,
          mediaKind: null,
        };
      }

      messages.push(current);
      return;
    }

    // Not a header line: it's a continuation of the previous message, or,
    // if there is no previous message yet, an unparsable stray line.
    if (current) {
      current.text += (current.text ? '\n' : '') + line;
    } else {
      warnings.push({
        line: index + 1,
        content: line,
        reason: "Line did not match the WhatsApp export header format and appeared before any message.",
      });
    }
  });

  // Trim trailing newlines accumulated from blank-line handling.
  for (const m of messages) {
    m.text = m.text.replace(/\n+$/, '');
  }

  const dates = messages.map((m) => m.date).sort();
  const firstDate = dates.length > 0 ? dates[0] : null;
  const lastDate = dates.length > 0 ? dates[dates.length - 1] : null;

  const nonBlankInputLines = lines.filter((l) => l.trim() !== '').length;

  return {
    messages,
    participants: Array.from(participantSet),
    warnings,
    firstDate,
    lastDate,
    totalLines: nonBlankInputLines,
    matchedLines: nonBlankInputLines - warnings.length,
  };
}
