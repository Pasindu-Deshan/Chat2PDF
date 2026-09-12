import { Box, Stack, Typography } from '@mui/material';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import PhotoRoundedIcon from '@mui/icons-material/PhotoRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import EmojiEmotionsRoundedIcon from '@mui/icons-material/EmojiEmotionsRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import GifBoxRoundedIcon from '@mui/icons-material/GifBoxRounded';
import type { ChatMessage } from '../../types/chat';
import type { BubbleSettings, TypographySettings } from '../../types/settings';

interface ChatBubbleProps {
  message: ChatMessage;
  side: 'left' | 'right';
  bubbleColor: string;
  textColor: string;
  senderName?: string;
  senderColor?: string;
  showSenderName: boolean;
  showTimestamp: boolean;
  bubble: BubbleSettings;
  typography: TypographySettings;
}

const MEDIA_ICON: Record<string, typeof PhotoRoundedIcon> = {
  image: PhotoRoundedIcon,
  video: VideocamRoundedIcon,
  audio: MicRoundedIcon,
  sticker: EmojiEmotionsRoundedIcon,
  document: DescriptionRoundedIcon,
  gif: GifBoxRoundedIcon,
};

function mediaLabel(kind: string | null, text: string): string {
  switch (kind) {
    case 'image':
      return 'Photo';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Voice message';
    case 'sticker':
      return 'Sticker';
    case 'gif':
      return 'GIF';
    case 'document':
      return 'Document';
    default:
      return text;
  }
}

export function ChatBubble({
  message,
  side,
  bubbleColor,
  textColor,
  senderName,
  senderColor,
  showSenderName,
  showTimestamp,
  bubble,
  typography,
}: ChatBubbleProps) {
  const MediaIcon = message.mediaKind ? MEDIA_ICON[message.mediaKind] : null;

  const radiusStyle = {
    borderTopLeftRadius: bubble.radius,
    borderTopRightRadius: bubble.radius,
    borderBottomLeftRadius: side === 'left' ? 2 : bubble.radius,
    borderBottomRightRadius: side === 'right' ? 2 : bubble.radius,
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: side === 'right' ? 'flex-end' : 'flex-start',
        px: 1,
        py: `${bubble.spacing}px`,
      }}
    >
      <Box
        sx={{
          maxWidth: `${bubble.maxWidthPercent}%`,
          bgcolor: bubbleColor,
          color: textColor,
          px: `${bubble.paddingX}px`,
          py: `${bubble.paddingY}px`,
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
          position: 'relative',
          ...radiusStyle,
        }}
      >
        {showSenderName && senderName && side === 'left' && (
          <Typography
            sx={{
              fontSize: typography.fontSize * 0.9,
              fontWeight: 700,
              color: senderColor ?? textColor,
              mb: 0.25,
              lineHeight: 1.3,
            }}
          >
            {senderName}
          </Typography>
        )}

        {message.isMedia ? (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ py: 0.5 }}>
            {MediaIcon && <MediaIcon sx={{ fontSize: 20, opacity: 0.75 }} />}
            <Typography
              sx={{
                fontSize: typography.fontSize,
                fontStyle: 'italic',
                opacity: 0.85,
                lineHeight: 1.4,
                fontFamily: typography.fontFamily,
              }}
            >
              {mediaLabel(message.mediaKind, message.text)}
            </Typography>
          </Stack>
        ) : (
          <Typography
            sx={{
              fontSize: typography.fontSize,
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: typography.fontFamily,
            }}
          >
            {message.text || '\u00A0'}
          </Typography>
        )}

        {showTimestamp && (
          <Stack
            direction="row"
            spacing={0.4}
            alignItems="center"
            justifyContent="flex-end"
            sx={{ mt: 0.25, float: 'right', ml: 1 }}
          >
            <Typography
              sx={{
                fontSize: typography.timestampSize,
                color: typography.timestampColor,
                lineHeight: 1,
              }}
            >
              {message.timestamp}
            </Typography>
            {side === 'right' && bubble.showReadReceipts && (
              <DoneAllRoundedIcon sx={{ fontSize: typography.timestampSize + 4, color: '#53BDEB' }} />
            )}
          </Stack>
        )}
        <Box sx={{ clear: 'both' }} />
      </Box>
    </Box>
  );
}
