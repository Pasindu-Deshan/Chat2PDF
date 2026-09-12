import type { ChatMessage, ChatPageGroup } from '../types/chat';
import type { SplitSettings } from '../types/settings';
import { addDaysIso, compareIso, formatDateForDisplay } from '../parser/dateUtils';

export function filterMessagesByRange(
  messages: ChatMessage[],
  startIso: string | null,
  endIso: string | null
): ChatMessage[] {
  if (!startIso && !endIso) return messages;
  return messages.filter((m) => {
    if (startIso && compareIso(m.date, startIso) < 0) return false;
    if (endIso && compareIso(m.date, endIso) > 0) return false;
    return true;
  });
}

function intervalDaysFor(mode: SplitSettings['mode'], customDays: number): number {
  switch (mode) {
    case 'every-day':
      return 1;
    case 'every-2-days':
      return 2;
    case 'every-3-days':
      return 3;
    case 'custom-days':
      return Math.max(1, customDays || 1);
    default:
      return 1;
  }
}

/**
 * Groups messages into `ChatPageGroup`s according to the current split
 * settings. This only handles the *date* dimension — height-based
 * sub-pagination (when a single day has too many messages to fit one
 * image) is applied afterwards, at render time, since it depends on
 * actual rendered bubble heights.
 */
export function buildDateGroups(
  allMessages: ChatMessage[],
  settings: SplitSettings
): ChatPageGroup[] {
  if (allMessages.length === 0) return [];

  const rangeFiltered =
    settings.mode === 'custom-range'
      ? filterMessagesByRange(allMessages, settings.range.start, settings.range.end)
      : allMessages;

  if (settings.mode === 'none') {
    return [
      {
        id: 'group-all',
        date: null,
        label: 'Full conversation',
        messages: rangeFiltered,
        pageIndexInGroup: 0,
        totalPagesInGroup: 1,
      },
    ];
  }

  if (settings.mode === 'custom-range') {
    return [
      {
        id: 'group-range',
        date: null,
        label: rangeLabel(settings),
        messages: rangeFiltered,
        pageIndexInGroup: 0,
        totalPagesInGroup: 1,
      },
    ];
  }

  const intervalDays = intervalDaysFor(settings.mode, settings.customDays);

  const sortedDates = Array.from(new Set(rangeFiltered.map((m) => m.date))).sort(
    compareIso
  );
  if (sortedDates.length === 0) return [];

  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  const messagesByDate = new Map<string, ChatMessage[]>();
  for (const msg of rangeFiltered) {
    const bucket = messagesByDate.get(msg.date);
    if (bucket) bucket.push(msg);
    else messagesByDate.set(msg.date, [msg]);
  }

  const groups: ChatPageGroup[] = [];
  let cursor = firstDate;
  let guard = 0;

  while (compareIso(cursor, lastDate) <= 0 && guard < 10000) {
    guard += 1;
    const bucketMessages: ChatMessage[] = [];
    for (let i = 0; i < intervalDays; i += 1) {
      const day = addDaysIso(cursor, i);
      const dayMessages = messagesByDate.get(day);
      if (dayMessages) bucketMessages.push(...dayMessages);
    }

    if (bucketMessages.length > 0 || settings.includeEmptyDays) {
      groups.push({
        id: `group-${cursor}`,
        date: cursor,
        label: formatDateForDisplay(cursor, {
          format: 'long',
          useRelativeLabels: false,
        }),
        messages: bucketMessages.sort((a, b) =>
          a.date === b.date ? a.timestamp.localeCompare(b.timestamp) : compareIso(a.date, b.date)
        ),
        pageIndexInGroup: 0,
        totalPagesInGroup: 1,
      });
    }

    cursor = addDaysIso(cursor, intervalDays);
  }

  return groups;
}

function rangeLabel(settings: SplitSettings): string {
  const { start, end } = settings.range;
  if (!start && !end) return 'Full conversation';
  const startLabel = start
    ? formatDateForDisplay(start, { format: 'short', useRelativeLabels: false })
    : '…';
  const endLabel = end
    ? formatDateForDisplay(end, { format: 'short', useRelativeLabels: false })
    : '…';
  return `${startLabel} \u2192 ${endLabel}`;
}
