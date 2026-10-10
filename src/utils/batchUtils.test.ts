import { describe, expect, it } from 'vitest';
import type { ChatMessage, ChatPageGroup } from '../types/chat';
import { buildGenerationBatches } from './batchUtils';

function makeGroup(id: string, count: number): ChatPageGroup {
  const messages = Array.from({ length: count }, (_, index) => ({
    id: `${id}-${index}`,
    date: '2024-01-01',
    timestamp: '12:00',
    rawTimestamp: '12:00',
    sender: 'Alex',
    text: `Message ${index}`,
    type: 'message',
    isMedia: false,
    mediaKind: null,
  })) as ChatMessage[];
  return {
    id,
    date: '2024-01-01',
    label: id,
    messages,
    pageIndexInGroup: 0,
    totalPagesInGroup: 1,
  };
}

describe('buildGenerationBatches', () => {
  it('splits large groups and caps each batch at the message limit', () => {
    const batches = buildGenerationBatches([makeGroup('day', 7)], 3);
    expect(batches.map((batch) => batch.messageCount)).toEqual([3, 3, 1]);
    expect(batches.flatMap((batch) => batch.groups).map((group) => group.messages.length)).toEqual([3, 3, 1]);
    expect(batches[0].groups[0].label).toBe('day (part 1)');
  });

  it('fills batches across groups without losing or duplicating messages', () => {
    const batches = buildGenerationBatches([makeGroup('first', 2), makeGroup('second', 3)], 4);
    expect(batches.map((batch) => batch.messageCount)).toEqual([4, 1]);
    expect(batches.flatMap((batch) => batch.groups).flatMap((group) => group.messages).map((message) => message.id))
      .toEqual(['first-0', 'first-1', 'second-0', 'second-1', 'second-2']);
  });
});