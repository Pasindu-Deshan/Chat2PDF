import { useRef } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import type { BackgroundPreset, BackgroundSettings as BgSettings } from '../../types/settings';
import { readFileAsDataUrl } from '../../utils/fileUtils';
import { backgroundStyleFor } from '../ChatPreview/chatBackgrounds';

interface BackgroundSettingsProps {
  background: BgSettings;
  onChange: (patch: Partial<BgSettings>) => void;
}

const PRESETS: Array<{ value: BackgroundPreset; label: string }> = [
  { value: 'light-paper', label: 'Light paper' },
  { value: 'classic-pattern', label: 'Classic pattern' },
  { value: 'minimal-gray', label: 'Minimal gray' },
  { value: 'soft-cream', label: 'Soft cream' },
];

export function BackgroundSettings({ background, onChange }: BackgroundSettingsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Stack spacing={2.5}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={background.type}
        onChange={(_, val) => val && onChange({ type: val })}
        fullWidth
      >
        <ToggleButton value="preset">Built-in</ToggleButton>
        <ToggleButton value="custom">Custom image</ToggleButton>
      </ToggleButtonGroup>

      {background.type === 'preset' ? (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          {PRESETS.map((preset) => (
            <Box
              key={preset.value}
              onClick={() => onChange({ preset: preset.value })}
              role="button"
              sx={{
                width: 84,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  width: 84,
                  height: 60,
                  borderRadius: 1.5,
                  border: background.preset === preset.value ? '2px solid' : '1px solid',
                  borderColor: background.preset === preset.value ? 'primary.main' : 'divider',
                  ...backgroundStyleFor({ ...background, preset: preset.value, type: 'preset' }),
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {preset.label}
              </Typography>
            </Box>
          ))}
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Button
            variant="outlined"
            startIcon={<ImageRoundedIcon />}
            onClick={() => inputRef.current?.click()}
          >
            Upload background image
          </Button>
          <input
            ref={inputRef}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const dataUrl = await readFileAsDataUrl(file);
              onChange({ customImage: dataUrl });
            }}
          />
          {background.customImage && (
            <Box
              sx={{
                width: 160,
                height: 100,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                ...backgroundStyleFor(background),
              }}
            />
          )}

          <FormControl size="small">
            <InputLabel id="bg-position-label">Position</InputLabel>
            <Select
              labelId="bg-position-label"
              label="Position"
              value={background.position}
              onChange={(e) => onChange({ position: e.target.value as BgSettings['position'] })}
            >
              <MenuItem value="center">Center</MenuItem>
              <MenuItem value="top">Top</MenuItem>
              <MenuItem value="bottom">Bottom</MenuItem>
              <MenuItem value="left">Left</MenuItem>
              <MenuItem value="right">Right</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      )}

      <Box>
        <Typography variant="caption" color="text.secondary">
          Opacity
        </Typography>
        <Slider
          size="small"
          min={0.1}
          max={1}
          step={0.05}
          value={background.opacity}
          onChange={(_, val) => onChange({ opacity: val as number })}
        />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          Blur
        </Typography>
        <Slider
          size="small"
          min={0}
          max={10}
          step={0.5}
          value={background.blur}
          onChange={(_, val) => onChange({ blur: val as number })}
        />
      </Box>
      {background.type === 'custom' && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            Scale
          </Typography>
          <Slider
            size="small"
            min={0.5}
            max={2.5}
            step={0.1}
            value={background.scale}
            onChange={(_, val) => onChange({ scale: val as number })}
          />
        </Box>
      )}
    </Stack>
  );
}
