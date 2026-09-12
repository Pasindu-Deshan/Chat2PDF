import { useCallback, useRef, useState } from 'react';
import { Alert, Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import { formatFileSize } from '../../utils/fileUtils';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  isParsing: boolean;
  error: string | null;
  currentFileName?: string | null;
  currentFileSize?: number | null;
}

export function FileUploader({
  onFileSelected,
  isParsing,
  error,
  currentFileName,
  currentFileSize,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.txt')) return;
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <Paper
      variant="outlined"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload WhatsApp chat export text file"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
      sx={{
        p: { xs: 3, sm: 5 },
        textAlign: 'center',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: isDragging ? 'primary.main' : 'divider',
        bgcolor: isDragging ? 'action.hover' : 'background.paper',
        cursor: 'pointer',
        transition: 'border-color 120ms ease, background-color 120ms ease',
        outline: 'none',
        '&:focus-visible': { borderColor: 'primary.main', boxShadow: 3 },
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".txt,text/plain"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Stack spacing={1.5} alignItems="center">
        <UploadFileRoundedIcon sx={{ fontSize: 44, color: 'primary.main' }} />
        <Typography variant="h6">Upload WhatsApp chat</Typography>
        <Typography variant="body2" color="text.secondary">
          Drag &amp; drop your exported .txt file here, or
        </Typography>
        <Button
          variant="contained"
          component="span"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Choose .txt file
        </Button>

        {currentFileName && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mt: 1, color: 'text.secondary' }}
          >
            <DescriptionRoundedIcon fontSize="small" />
            <Typography variant="body2">
              {currentFileName}
              {typeof currentFileSize === 'number' ? ` · ${formatFileSize(currentFileSize)}` : ''}
            </Typography>
          </Stack>
        )}

        {isParsing && (
          <Box sx={{ width: '100%', maxWidth: 320, mt: 1 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary">
              Parsing your chat…
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 1, width: '100%', textAlign: 'left' }}>
            {error}
          </Alert>
        )}

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1 }}>
          <LockRoundedIcon fontSize="small" sx={{ color: 'success.main' }} />
          <Typography variant="caption" color="text.secondary">
            Your chat is processed entirely on your device — nothing is uploaded.
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}
