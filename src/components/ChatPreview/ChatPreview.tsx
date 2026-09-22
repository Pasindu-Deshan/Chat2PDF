import { forwardRef, useMemo } from 'react';
import { Box } from '@mui/material';
import type { ChatMessage } from '../../types/chat';
import type { ChatSettings } from '../../types/settings';
import type { Participant } from '../../types/participant';
import { ChatHeader } from '../ChatHeader/ChatHeader';
import { ChatBubble } from '../ChatBubble/ChatBubble';
import { DateSeparator } from '../DateSeparator/DateSeparator';
import { backgroundStyleFor } from './chatBackgrounds';
import { formatDateForDisplay, utcDateToIso } from '../../parser/dateUtils';

interface ChatPreviewProps {
  messages: ChatMessage[];
  participants: Participant[];
  settings: ChatSettings;
  width: number;
  /** Fixed pixel height for capture; omit to let content size itself (live preview). */
  height?: number;
  /** CSS scale factor applied purely for on-screen display, doesn't affect captured resolution. */
  displayScale?: number;
}

function computeAutoTitle(participants: Participant[], rightId: string | null) {
  if (participants.length === 0) return { title: 'Chat', subtitle: '' };
  if (participants.length === 1) return { title: participants[0].name, subtitle: '' };
  if (participants.length === 2) {
    const other = participants.find((p) => p.id !== rightId) ?? participants[0];
    return { title: other.name, subtitle: '' };
  }
  const names = participants.map((p) => p.name).join(', ');
  return {
    title: names.length > 40 ? `${participants.length} participants` : names,
    subtitle: `${participants.length} participants`,
  };
}

export const ChatPreview = forwardRef<HTMLDivElement, ChatPreviewProps>(function ChatPreview(
  { messages, participants, settings, width, height, displayScale },
  ref
) {
  const participantByName = useMemo(() => {
    const map = new Map<string, Participant>();
    for (const p of participants) map.set(p.name, p);
    return map;
  }, [participants]);

  const { title, subtitle } = useMemo(
    () => computeAutoTitle(participants, settings.rightSideParticipantId),
    [participants, settings.rightSideParticipantId]
  );

  const resolvedTitle = settings.header.autoTitle ? title : settings.header.title || title;
  const resolvedSubtitle = settings.header.autoTitle ? subtitle : settings.header.subtitle;

  const todayIso = useMemo(() => utcDateToIso(new Date()), []);
  const isGroup = participants.length > 2;

  const bgStyle = backgroundStyleFor(settings.background);

  let lastDate: string | null = null;

  return (
    <Box
      ref={ref}
      sx={{
        width,
        height: height ?? 'auto',
        minHeight: height ?? undefined,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: height ? 0 : 2,
        boxShadow: height ? 'none' : 4,
        transform: displayScale ? `scale(${displayScale})` : undefined,
        transformOrigin: 'top left',
      }}
    >
      <ChatHeader
        settings={settings.header}
        title={resolvedTitle}
        subtitle={resolvedSubtitle}
        avatarInitial={resolvedTitle.trim().charAt(0).toUpperCase() || '?'}
      />

      <Box
        sx={{
          flexGrow: 1,
          position: 'relative',
          ...bgStyle,
          opacity: 1,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(255,255,255,1)',
            opacity: 1 - settings.background.opacity,
            pointerEvents: 'none',
          }}
        />
        <Box data-role="message-area" sx={{ position: 'relative', py: 1.5 }}>
          {messages.length === 0 && (
            <Box sx={{ textAlign: 'center', color: '#8b978f', pt: 6, fontSize: 13 }}>
              No messages in this range
            </Box>
          )}

          {messages.map((message) => {
            const showDateSep = settings.showDateSeparators && message.date !== lastDate;
            if (showDateSep) lastDate = message.date;

            const dateLabel = showDateSep
              ? formatDateForDisplay(message.date, {
                  format: settings.dateDisplay.format,
                  useRelativeLabels: settings.dateDisplay.useRelativeLabels,
                  referenceIso: todayIso,
                })
              : null;

            if (message.type === 'system') {
              return (
                <Box key={message.id} data-message-id={message.id}>
                  {showDateSep && dateLabel && <DateSeparator label={dateLabel} variant="date" />}
                  <DateSeparator label={message.text} variant="system" />
                </Box>
              );
            }

            const participant = message.sender ? participantByName.get(message.sender) : undefined;
            const side: 'left' | 'right' =
              participant && participant.id === settings.rightSideParticipantId ? 'right' : 'left';

            return (
              <Box key={message.id} data-message-id={message.id}>
                {showDateSep && dateLabel && <DateSeparator label={dateLabel} variant="date" />}
                <ChatBubble
                  message={message}
                  side={side}
                  bubbleColor={participant?.bubbleColor ?? '#FFFFFF'}
                  textColor={participant?.textColor ?? '#111B21'}
                  senderName={message.sender}
                  senderColor={participant?.bubbleColor}
                  showSenderName={settings.bubble.showSenderName && isGroup}
                  showTimestamp={settings.showTimestamps}
                  bubble={settings.bubble}
                  typography={settings.typography}
                />
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
});
