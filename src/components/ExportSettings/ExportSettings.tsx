import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeMotionRoundedIcon from '@mui/icons-material/AutoAwesomeMotionRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import type { ChatSettings, PdfSettings, SplitMode } from '../../types/settings';

interface ExportSettingsProps {
  split: ChatSettings['split'];
  output: ChatSettings['output'];
  pdf: PdfSettings;
  pageCount: number;
  messageCount: number;
  minDate: string | null;
  maxDate: string | null;
  isGenerating: boolean;
  onSplitChange: (patch: Partial<ChatSettings['split']>) => void;
  onOutputChange: (patch: Partial<ChatSettings['output']>) => void;
  onPdfChange: (patch: Partial<PdfSettings>) => void;
  onGenerateImages: () => void;
}

const SPLIT_OPTIONS: Array<{ value: SplitMode; label: string }> = [
  { value: 'none', label: 'No splitting (one long image)' },
  { value: 'every-day', label: 'Every day' },
  { value: 'every-2-days', label: 'Every 2 days' },
  { value: 'every-3-days', label: 'Every 3 days' },
  { value: 'custom-days', label: 'Custom number of days' },
  { value: 'custom-range', label: 'Custom date range' },
];

export function ExportSettings({
  split,
  output,
  pdf,
  pageCount,
  messageCount,
  minDate,
  maxDate,
  isGenerating,
  onSplitChange,
  onOutputChange,
  onPdfChange,
  onGenerateImages,
}: ExportSettingsProps) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Split messages by
        </Typography>
        <RadioGroup
          value={split.mode}
          onChange={(e) => onSplitChange({ mode: e.target.value as SplitMode })}
        >
          {SPLIT_OPTIONS.map((opt) => (
            <FormControlLabel key={opt.value} value={opt.value} control={<Radio size="small" />} label={opt.label} />
          ))}
        </RadioGroup>

        {split.mode === 'custom-days' && (
          <TextField
            type="number"
            size="small"
            label="Days per image"
            value={split.customDays}
            onChange={(e) => onSplitChange({ customDays: Math.max(1, Number(e.target.value) || 1) })}
            sx={{ mt: 1, width: 180 }}
            inputProps={{ min: 1 }}
          />
        )}

        {split.mode === 'custom-range' && (
          <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              type="date"
              size="small"
              label="Start date"
              value={split.range.start ?? ''}
              inputProps={{ min: minDate ?? undefined, max: maxDate ?? undefined }}
              onChange={(e) => onSplitChange({ range: { ...split.range, start: e.target.value || null } })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              size="small"
              label="End date"
              value={split.range.end ?? ''}
              inputProps={{ min: minDate ?? undefined, max: maxDate ?? undefined }}
              onChange={(e) => onSplitChange({ range: { ...split.range, end: e.target.value || null } })}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        )}

        {split.mode !== 'none' && split.mode !== 'custom-range' && (
          <FormControlLabel
            sx={{ mt: 0.5 }}
            control={
              <Checkbox
                size="small"
                checked={split.includeEmptyDays}
                onChange={(e) => onSplitChange({ includeEmptyDays: e.target.checked })}
              />
            }
            label="Include empty days"
          />
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {messageCount} messages · {pageCount} {pageCount === 1 ? 'image' : 'images'} will be generated
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Output size
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <TextField
            size="small"
            type="number"
            label="Width (px)"
            value={output.width}
            onChange={(e) => onOutputChange({ width: Math.max(320, Number(e.target.value) || 1080) })}
          />
          <TextField
            size="small"
            type="number"
            label="Max height (px)"
            value={output.maxHeight}
            onChange={(e) => onOutputChange({ maxHeight: Math.max(400, Number(e.target.value) || 1920) })}
            disabled={output.fitMode === 'fit-all'}
          />
        </Stack>
        <RadioGroup
          row
          value={output.fitMode}
          onChange={(e) => onOutputChange({ fitMode: e.target.value as 'fit-all' | 'auto-split' })}
          sx={{ mt: 1 }}
        >
          <FormControlLabel value="fit-all" control={<Radio size="small" />} label="Fit all messages" />
          <FormControlLabel value="auto-split" control={<Radio size="small" />} label="Split automatically" />
        </RadioGroup>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          PDF settings
        </Typography>
        <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
          <InputLabel id="pdf-page-size-label">Page size</InputLabel>
          <Select
            labelId="pdf-page-size-label"
            label="Page size"
            value={pdf.pageSize}
            onChange={(e) => onPdfChange({ pageSize: e.target.value as PdfSettings['pageSize'] })}
          >
            <MenuItem value="image">Generated image size</MenuItem>
            <MenuItem value="a4">A4</MenuItem>
            <MenuItem value="letter">Letter</MenuItem>
            <MenuItem value="custom">Custom</MenuItem>
          </Select>
        </FormControl>

        {pdf.pageSize === 'custom' && (
          <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
            <TextField
              size="small"
              type="number"
              label="Width (mm)"
              value={pdf.customWidthMm}
              onChange={(e) => onPdfChange({ customWidthMm: Number(e.target.value) || 100 })}
            />
            <TextField
              size="small"
              type="number"
              label="Height (mm)"
              value={pdf.customHeightMm}
              onChange={(e) => onPdfChange({ customHeightMm: Number(e.target.value) || 150 })}
            />
          </Stack>
        )}

        <RadioGroup
          row
          value={pdf.orientation}
          onChange={(e) => onPdfChange({ orientation: e.target.value as PdfSettings['orientation'] })}
          sx={{ mb: 1 }}
        >
          <FormControlLabel value="portrait" control={<Radio size="small" />} label="Portrait" />
          <FormControlLabel value="landscape" control={<Radio size="small" />} label="Landscape" />
        </RadioGroup>

        <TextField
          size="small"
          type="number"
          label="Margins (px)"
          value={pdf.marginPx}
          onChange={(e) => onPdfChange({ marginPx: Math.max(0, Number(e.target.value) || 0) })}
          sx={{ width: 160 }}
        />
      </Box>

      <Button
        variant="contained"
        size="large"
        startIcon={<AutoAwesomeMotionRoundedIcon />}
        onClick={onGenerateImages}
        disabled={isGenerating || messageCount === 0}
      >
        {isGenerating ? 'Generating…' : 'Generate images'}
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <PictureAsPdfRoundedIcon fontSize="inherit" />
        Once your pages are generated, you can export them all as a single PDF below.
      </Typography>
    </Stack>
  );
}
