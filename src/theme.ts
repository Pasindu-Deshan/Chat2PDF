import { createTheme } from '@mui/material/styles';

// App-shell identity: a quiet ink/paper workspace with a single warm signal
// color ("wa-teal", echoing the product's subject matter without copying
// WhatsApp's exact brand palette) used sparingly for primary actions.
export const getAppTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#0B6E63' : '#3DDCC4',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#D97706',
      },
      background:
        mode === 'light'
          ? { default: '#F6F5F1', paper: '#FFFFFF' }
          : { default: '#0F1512', paper: '#161E1A' },
      text:
        mode === 'light'
          ? { primary: '#16221F', secondary: '#4E5D59' }
          : { primary: '#EAF2EF', secondary: '#9FB0AB' },
      divider: mode === 'light' ? '#E3E1D9' : '#26302B',
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Manrope", "Noto Sans", "Segoe UI", sans-serif',
      h1: { fontWeight: 800, letterSpacing: '-0.02em' },
      h2: { fontWeight: 800, letterSpacing: '-0.02em' },
      h3: { fontWeight: 700, letterSpacing: '-0.01em' },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });
