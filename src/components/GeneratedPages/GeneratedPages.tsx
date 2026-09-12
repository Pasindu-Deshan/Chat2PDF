import {
  Box,
  Button,
  Card,
  CardActions,
  CardMedia,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import ZoomInRoundedIcon from '@mui/icons-material/ZoomInRounded';
import type { GeneratedPage } from '../../types/chat';

interface GeneratedPagesProps {
  pages: GeneratedPage[];
  onDelete: (id: string) => void;
  onRegenerate: (id: string) => void;
  onDownloadPng: (id: string) => void;
  onPreview: (id: string) => void;
  onDownloadAllPng: () => void;
  onDownloadPdf: () => void;
  isBuildingPdf: boolean;
}

export function GeneratedPages({
  pages,
  onDelete,
  onRegenerate,
  onDownloadPng,
  onPreview,
  onDownloadAllPng,
  onDownloadPdf,
  isBuildingPdf,
}: GeneratedPagesProps) {
  if (pages.length === 0) return null;

  const allDone = pages.every((p) => p.status === 'done');

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h6">Generated pages ({pages.length})</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadRoundedIcon />}
            onClick={onDownloadAllPng}
            disabled={!allDone}
          >
            Download all images
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={isBuildingPdf ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfRoundedIcon />}
            onClick={onDownloadPdf}
            disabled={!allDone || isBuildingPdf}
          >
            {isBuildingPdf ? 'Building PDF…' : 'Generate PDF'}
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 2,
        }}
      >
        {pages.map((page, index) => (
          <Card key={page.id} variant="outlined">
            <Box
              sx={{
                height: 190,
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                cursor: page.status === 'done' ? 'pointer' : 'default',
              }}
              onClick={() => page.status === 'done' && onPreview(page.id)}
            >
              {page.status === 'rendering' || page.status === 'pending' ? (
                <CircularProgress size={28} />
              ) : page.status === 'error' ? (
                <Typography variant="caption" color="error" sx={{ px: 1, textAlign: 'center' }}>
                  Failed to render
                </Typography>
              ) : (
                page.dataUrl && (
                  <CardMedia
                    component="img"
                    image={page.dataUrl}
                    alt={`Page ${index + 1}: ${page.group.label}`}
                    sx={{ height: '100%', width: '100%', objectFit: 'contain' }}
                  />
                )
              )}
              {page.status === 'done' && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    bgcolor: 'rgba(0,0,0,0.35)',
                    transition: 'opacity 120ms ease',
                    '&:hover': { opacity: 1 },
                  }}
                >
                  <ZoomInRoundedIcon sx={{ color: '#fff' }} />
                </Box>
              )}
            </Box>
            <Box sx={{ px: 1.5, pt: 1 }}>
              <Typography variant="caption" noWrap sx={{ display: 'block', fontWeight: 600 }}>
                Page {index + 1}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {page.group.label}
              </Typography>
            </Box>
            <CardActions sx={{ justifyContent: 'flex-end', px: 1 }}>
              <Tooltip title="Regenerate">
                <IconButton size="small" onClick={() => onRegenerate(page.id)}>
                  <RefreshRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download PNG">
                <span>
                  <IconButton size="small" onClick={() => onDownloadPng(page.id)} disabled={page.status !== 'done'}>
                    <DownloadRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" onClick={() => onDelete(page.id)}>
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </CardActions>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}
