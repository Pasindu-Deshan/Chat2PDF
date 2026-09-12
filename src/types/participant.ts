export interface Participant {
  id: string;
  name: string;
  bubbleColor: string;
  textColor: string;
  textColorMode: 'auto' | 'manual';
  messageCount: number;
}
