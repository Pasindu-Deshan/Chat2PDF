import { createContext, useContext } from 'react';
import type { GeneratedPage, ParseResult } from '../types/chat';
import type { Participant } from '../types/participant';

export interface FileMeta {
  name: string;
  size: number;
}

export interface ChatState {
  fileMeta: FileMeta | null;
  parseResult: ParseResult | null;
  participants: Participant[];
  generatedPages: GeneratedPage[];
  isParsing: boolean;
  isGenerating: boolean;
  generationProgress: number; // 0-100
}

export const initialChatState: ChatState = {
  fileMeta: null,
  parseResult: null,
  participants: [],
  generatedPages: [],
  isParsing: false,
  isGenerating: false,
  generationProgress: 0,
};

export const ChatDataContext = createContext<{
  state: ChatState;
  setFile: (meta: FileMeta | null) => void;
  setParsing: (isParsing: boolean) => void;
  setParseResult: (result: ParseResult, participants: Participant[]) => void;
  updateParticipant: (id: string, patch: Partial<Participant>) => void;
  setGeneratedPages: (pages: GeneratedPage[]) => void;
  updateGeneratedPage: (id: string, patch: Partial<GeneratedPage>) => void;
  removeGeneratedPage: (id: string) => void;
  setGenerating: (isGenerating: boolean, progress?: number) => void;
  resetChat: () => void;
} | null>(null);

export function useChatData() {
  const ctx = useContext(ChatDataContext);
  if (!ctx) throw new Error('useChatData must be used within ChatDataContext');
  return ctx;
}
