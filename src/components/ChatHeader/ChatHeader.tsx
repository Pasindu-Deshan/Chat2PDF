import { Avatar, Box, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import type { HeaderSettings } from '../../types/settings';

interface ChatHeaderProps {
  settings: HeaderSettings;
  title: string;
  subtitle: string;
  avatarInitial: string;
}

export function ChatHeader({ settings, title, subtitle, avatarInitial }: ChatHeaderProps) {
  if (!settings.show) return null;

  return (
    <Box
      sx={{
        height: settings.height,
        minHeight: settings.height,
        bgcolor: settings.backgroundColor,
        color: settings.textColor,
        display: 'flex',
        alignItems: 'center',
        px: 1.5,
        gap: 1,
        flexShrink: 0,
      }}
    >
      <ArrowBackRoundedIcon fontSize="small" />
      <Avatar
        sx={{
          width: 38,
          height: 38,
          bgcolor: 'rgba(255,255,255,0.25)',
          color: settings.textColor,
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        {settings.avatarText || avatarInitial}
      </Avatar>
      <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          noWrap
          sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1.25, color: 'inherit' }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            noWrap
            sx={{ fontSize: 12.5, opacity: 0.85, lineHeight: 1.2, color: 'inherit' }}
          >
            {subtitle}
          </Typography>
        )}
      </Stack>
      <MoreVertRoundedIcon fontSize="small" />
    </Box>
  );
}
