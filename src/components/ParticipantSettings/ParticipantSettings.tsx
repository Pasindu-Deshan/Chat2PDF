import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import type { Participant } from '../../types/participant';
import { COLOR_PRESETS } from '../../utils/colorUtils';
import { autoTextColor } from '../../utils/contrastUtils';

interface ParticipantSettingsProps {
  participants: Participant[];
  rightSideParticipantId: string | null;
  onUpdateParticipant: (id: string, patch: Partial<Participant>) => void;
  onSetRightSide: (id: string) => void;
}

export function ParticipantSettings({
  participants,
  rightSideParticipantId,
  onUpdateParticipant,
  onSetRightSide,
}: ParticipantSettingsProps) {
  if (participants.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Upload a chat to see participants here.
      </Typography>
    );
  }

  return (
    <Stack spacing={3}>
      <FormControl fullWidth size="small">
        <InputLabel id="right-side-label">Right-side participant</InputLabel>
        <Select
          labelId="right-side-label"
          label="Right-side participant"
          value={rightSideParticipantId ?? ''}
          onChange={(e) => onSetRightSide(e.target.value)}
        >
          {participants.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {participants.map((p) => (
        <Box key={p.id}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" noWrap sx={{ maxWidth: 180 }}>
              {p.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {p.messageCount} msgs
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 0.75 }}>
            {COLOR_PRESETS.map((color) => (
              <Box
                key={color}
                onClick={() =>
                  onUpdateParticipant(p.id, {
                    bubbleColor: color,
                    textColor: p.textColorMode === 'auto' ? autoTextColor(color) : p.textColor,
                  })
                }
                role="button"
                aria-label={`Set bubble color to ${color}`}
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  bgcolor: color,
                  cursor: 'pointer',
                  border: p.bubbleColor === color ? '2px solid' : '1px solid',
                  borderColor: p.bubbleColor === color ? 'primary.main' : 'divider',
                }}
              />
            ))}
            <Box
              component="input"
              type="color"
              value={p.bubbleColor}
              onChange={(e) => {
                const color = (e.target as HTMLInputElement).value;
                onUpdateParticipant(p.id, {
                  bubbleColor: color,
                  textColor: p.textColorMode === 'auto' ? autoTextColor(color) : p.textColor,
                });
              }}
              sx={{
                width: 28,
                height: 22,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 0,
                cursor: 'pointer',
              }}
              aria-label="Custom bubble color"
            />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ minWidth: 70 }} color="text.secondary">
              Text color
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={p.textColorMode}
              onChange={(_, val) => {
                if (!val) return;
                onUpdateParticipant(p.id, {
                  textColorMode: val,
                  textColor: val === 'auto' ? autoTextColor(p.bubbleColor) : p.textColor,
                });
              }}
            >
              <ToggleButton value="auto">Automatic</ToggleButton>
              <ToggleButton value="manual">Manual</ToggleButton>
            </ToggleButtonGroup>
            {p.textColorMode === 'manual' && (
              <Box
                component="input"
                type="color"
                value={p.textColor}
                onChange={(e) =>
                  onUpdateParticipant(p.id, { textColor: (e.target as HTMLInputElement).value })
                }
                sx={{ width: 28, height: 22, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0 }}
                aria-label="Custom text color"
              />
            )}
          </Stack>

          <Box
            sx={{
              mt: 1,
              px: 1.5,
              py: 0.75,
              borderRadius: 1.5,
              bgcolor: p.bubbleColor,
              color: p.textColor,
              display: 'inline-block',
              fontSize: 13,
            }}
          >
            Preview message
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
