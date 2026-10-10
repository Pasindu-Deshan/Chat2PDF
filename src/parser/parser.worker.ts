import { isWhatsAppMessageStart, parseWhatsAppChat } from './whatsappParser';
import type { ParseResult } from '../types/chat';

export interface ParserWorkerRequest {
  file: File;
}

export type ParserWorkerResponse =
  | { type: 'progress'; processed: number; total: number }
  | { type: 'batch'; result: ParseResult; lineOffset: number }
  | {
      type: 'done';
      summary: Omit<ParseResult, 'messages' | 'warnings'> & { warningCount: number };
    }
  | { type: 'error'; message: string };

const MESSAGE_BATCH_SIZE = 2000;

/**
 * Workers share the DOM's `lib.dom` types with the main thread in this
 * project's single tsconfig (rather than a separate `lib: ["webworker"]`
 * program), so `self` is typed as `Window` here even though at runtime this
 * file only ever executes as a dedicated worker. We narrow it locally to
 * the handful of members we actually use instead of fighting the global
 * type, which keeps this file honest about what it depends on.
 */
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<ParserWorkerRequest>) => void) | null;
  postMessage: (message: ParserWorkerResponse) => void;
};

ctx.onmessage = async (event) => {
  try {
    const { file } = event.data;
    const decoder = new TextDecoder();
    const reader = file.stream().getReader();
    const batchLines: string[] = [];
    const participants = new Set<string>();
    let messageCount = 0;
    let warningCount = 0;
    let totalLines = 0;
    let matchedLines = 0;
    let firstDate: string | null = null;
    let lastDate: string | null = null;
    let lineOffset = 0;
    let pendingText = '';
    let processedBytes = 0;
    let nextProgressBytes = 1024 * 1024;
    let batchMessageCount = 0;

    const flushBatch = () => {
      if (batchLines.length === 0) return;
      const result = parseWhatsAppChat(batchLines.join('\n'));
      result.messages.forEach((message, index) => {
        message.id = `batch-${messageCount}-${index}`;
      });
      result.warnings = result.warnings.map((warning) => ({
        ...warning,
        line: warning.line + lineOffset,
      }));
      for (const participant of result.participants) participants.add(participant);
      messageCount += result.messages.length;
      warningCount += result.warnings.length;
      totalLines += result.totalLines;
      matchedLines += result.matchedLines;
      if (result.firstDate && (!firstDate || result.firstDate < firstDate)) firstDate = result.firstDate;
      if (result.lastDate && (!lastDate || result.lastDate > lastDate)) lastDate = result.lastDate;
      ctx.postMessage({ type: 'batch', result, lineOffset });
      lineOffset += batchLines.length;
      batchLines.length = 0;
      batchMessageCount = 0;
    };

    const consumeLine = (line: string) => {
      const isMessageStart = isWhatsAppMessageStart(line);
      if (isMessageStart && batchMessageCount >= MESSAGE_BATCH_SIZE) flushBatch();
      batchLines.push(line);
      if (isMessageStart) batchMessageCount += 1;
    };

    const consumeText = (text: string, final: boolean) => {
      pendingText += text;
      if (!final && pendingText.endsWith('\r')) {
        const trailingCarriageReturn = pendingText.slice(-1);
        const completeText = pendingText.slice(0, -1).replace(/\r\n?/g, '\n');
        const lines = completeText.split('\n');
        pendingText = lines.pop() ?? '';
        for (const line of lines) consumeLine(line);
        pendingText += trailingCarriageReturn;
        return;
      }

      const normalized = pendingText.replace(/\r\n?/g, '\n');
      const lines = normalized.split('\n');
      pendingText = final ? '' : lines.pop() ?? '';
      for (const line of lines) consumeLine(line);
      if (final && lines.length === 0 && normalized.length > 0) consumeLine(normalized);
      if (final && pendingText) consumeLine(pendingText);
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      processedBytes += value.byteLength;
      consumeText(decoder.decode(value, { stream: true }), false);
      if (processedBytes >= nextProgressBytes || processedBytes === file.size) {
        ctx.postMessage({ type: 'progress', processed: processedBytes, total: file.size });
        nextProgressBytes = processedBytes + 1024 * 1024;
      }
    }
    consumeText(decoder.decode(), true);
    flushBatch();
    ctx.postMessage({
      type: 'done',
      summary: {
        participants: Array.from(participants),
        firstDate,
        lastDate,
        totalLines,
        matchedLines,
        warningCount,
      },
    });
  } catch (err) {
    ctx.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown error while parsing the file.',
    });
  }
};
