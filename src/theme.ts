import { createTheme } from '@mui/material/styles';

function chatTexture(stroke: string, opacity: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180" fill="none"><g stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 25h67a11 11 0 0 1 11 11v27a11 11 0 0 1-11 11H50L36 85V74H22a11 11 0 0 1-11-11V36a11 11 0 0 1 11-11Z"/><path d="M34 43h45M34 54h31M91 102h58a10 10 0 0 1 10 10v23a10 10 0 0 1-10 10h-8v10l-13-10H91a10 10 0 0 1-10-10v-23a10 10 0 0 1 10-10Z"/><path d="M101 117h35M101 127h24"/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export const chatTextureForMode = (mode: 'light' | 'dark') =>
  chatTexture(mode === 'light' ? '#0B6E63' : '#3DDCC4', mode === 'light' ? 0.2 : 0.3);

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
