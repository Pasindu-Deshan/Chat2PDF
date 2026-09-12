import {
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import type { BubbleSettings, TypographySettings as TypographyCfg } from '../../types/settings';

interface TypographySettingsProps {
  typography: TypographyCfg;
  bubble: BubbleSettings;
  showTimestamps: boolean;
  showDateSeparators: boolean;
  onTypographyChange: (patch: Partial<TypographyCfg>) => void;
  onBubbleChange: (patch: Partial<BubbleSettings>) => void;
  onToggleTimestamps: (value: boolean) => void;
  onToggleDateSeparators: (value: boolean) => void;
}

const FONT_OPTIONS = [
  { value: '"Noto Sans", "Noto Sans Sinhala", "Noto Sans Tamil", sans-serif', label: 'Noto Sans (recommended)' },
  { value: '"Manrope", sans-serif', label: 'Manrope' },
  { value: 'system-ui, -apple-system, "Segoe UI", sans-serif', label: 'System UI' },
  { value: '"Noto Sans Sinhala", sans-serif', label: 'Noto Sans Sinhala' },
  { value: '"Noto Sans Tamil", sans-serif', label: 'Noto Sans Tamil' },
];

export function TypographySettingsPanel({
  typography,
  bubble,
  showTimestamps,
  showDateSeparators,
  onTypographyChange,
  onBubbleChange,
  onToggleTimestamps,
  onToggleDateSeparators,
}: TypographySettingsProps) {
  return (
    <Stack spacing={2.5}>
      <FormControl size="small" fullWidth>
        <InputLabel id="font-family-label">Font family</InputLabel>
        <Select
          labelId="font-family-label"
          label="Font family"
          value={typography.fontFamily}
          onChange={(e) => onTypographyChange({ fontFamily: e.target.value })}
        >
          {FONT_OPTIONS.map((f) => (
            <MenuItem key={f.value} value={f.value} sx={{ fontFamily: f.value }}>
              {f.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box>
        <Typography variant="caption" color="text.secondary">
          Font size ({typography.fontSize}px)
        </Typography>
        <Slider
          size="small"
          min={11}
          max={20}
          step={0.5}
          value={typography.fontSize}
          onChange={(_, v) => onTypographyChange({ fontSize: v as number })}
        />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary">
          Bubble corner radius ({bubble.radius}px)
        </Typography>
        <Slider
          size="small"
          min={0}
          max={24}
          value={bubble.radius}
          onChange={(_, v) => onBubbleChange({ radius: v as number })}
        />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary">
          Max bubble width ({bubble.maxWidthPercent}%)
        </Typography>
        <Slider
          size="small"
          min={40}
          max={95}
          value={bubble.maxWidthPercent}
          onChange={(_, v) => onBubbleChange({ maxWidthPercent: v as number })}
        />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary">
          Message spacing ({bubble.spacing}px)
        </Typography>
        <Slider
          size="small"
          min={0}
          max={12}
          value={bubble.spacing}
          onChange={(_, v) => onBubbleChange({ spacing: v as number })}
        />
      </Box>

      <Stack spacing={0.5}>
        <FormControlLabel
          control={<Switch checked={showTimestamps} onChange={(e) => onToggleTimestamps(e.target.checked)} />}
          label="Show timestamps"
        />
        <FormControlLabel
          control={
            <Switch
              checked={showDateSeparators}
              onChange={(e) => onToggleDateSeparators(e.target.checked)}
            />
          }
          label="Show date separators"
        />
        <FormControlLabel
          control={
            <Switch
              checked={bubble.showReadReceipts}
              onChange={(e) => onBubbleChange({ showReadReceipts: e.target.checked })}
            />
          }
          label="Show read-receipt checkmarks"
        />
        <FormControlLabel
          control={
            <Switch
              checked={bubble.showSenderName}
              onChange={(e) => onBubbleChange({ showSenderName: e.target.checked })}
            />
          }
          label="Show sender name (group chats)"
        />
      </Stack>
    </Stack>
  );
}
