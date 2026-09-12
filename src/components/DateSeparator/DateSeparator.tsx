import { Box, Typography } from '@mui/material';

interface DateSeparatorProps {
  label: string;
  variant?: 'date' | 'system';
}

export function DateSeparator({ label, variant = 'date' }: DateSeparatorProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', my: variant === 'date' ? 1.25 : 0.75 }}>
      <Box
        sx={{
          bgcolor: variant === 'date' ? 'rgba(225, 245, 254, 0.92)' : 'rgba(255, 249, 196, 0.92)',
          color: '#54656F',
          px: 1.5,
          py: 0.5,
          borderRadius: 1.5,
          boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
          maxWidth: '85%',
        }}
      >
        <Typography
          sx={{
            fontSize: variant === 'date' ? 12.5 : 12,
            fontWeight: variant === 'date' ? 600 : 400,
            textAlign: 'center',
            textTransform: variant === 'date' ? 'uppercase' : 'none',
            letterSpacing: variant === 'date' ? 0.3 : 0,
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  );
}
