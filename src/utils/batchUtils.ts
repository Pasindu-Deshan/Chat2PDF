import type { ChatPageGroup } from '../types/chat';

export interface GenerationBatch {
  id: string;
  groups: ChatPageGroup[];
  messageCount: number;
}

export const DEFAULT_BATCH_MESSAGE_LIMIT = 500;

export function buildGenerationBatches(
  groups: ChatPageGroup[],
  messageLimit = DEFAULT_BATCH_MESSAGE_LIMIT
): GenerationBatch[] {
  const limit = Math.max(1, Math.floor(messageLimit));
  const batches: GenerationBatch[] = [];
  let currentGroups: ChatPageGroup[] = [];
  let currentMessageCount = 0;

  const finishBatch = () => {
    if (currentGroups.length === 0) return;
    batches.push({
      id: `generation-batch-${batches.length + 1}`,
      groups: currentGroups,
      messageCount: currentMessageCount,
    });
    currentGroups = [];
    currentMessageCount = 0;
  };

  for (const group of groups) {
    if (group.messages.length === 0) {
      if (currentMessageCount >= limit) finishBatch();
      currentGroups.push(group);
      continue;
    }

    let offset = 0;
    let part = 1;
    while (offset < group.messages.length) {
      const available = limit - currentMessageCount;
      if (available === 0) finishBatch();
      const count = Math.min(limit - currentMessageCount, group.messages.length - offset);
      const totalParts = Math.ceil(group.messages.length / limit);
      currentGroups.push({
        ...group,
        id: `${group.id}-part-${part}`,
        label: totalParts > 1 ? `${group.label} (part ${part})` : group.label,
        messages: group.messages.slice(offset, offset + count),
      });
      currentMessageCount += count;
      offset += count;
      part += 1;
      if (currentMessageCount >= limit) finishBatch();
    }
  }

  finishBatch();
  return batches;
}