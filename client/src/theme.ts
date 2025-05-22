import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#42a5f5', // bright blue
      light: '#80d6ff',
      dark: '#0077c2',
      contrastText: '#fff',
    },
    secondary: {
      main: '#ffb300', // vibrant yellow-orange
      light: '#ffe54c',
      dark: '#c68400',
      contrastText: '#fff',
    },
    success: {
      main: '#66bb6a', // green
      light: '#98ee99',
      dark: '#338a3e',
      contrastText: '#fff',
    },
    error: {
      main: '#ef5350', // red
      light: '#ff867c',
      dark: '#b61827',
      contrastText: '#fff',
    },
    info: {
      main: '#7e57c2', // purple
      light: '#b085f5',
      dark: '#4d2c91',
      contrastText: '#fff',
    },
    background: {
      default: '#fff8e1', // soft warm background
      paper: '#fffde7',   // lighter paper
    },
    text: {
      primary: '#22223b', // deep blue-black
      secondary: '#4a4e69', // blue-gray
      disabled: '#bdbdbd',
    },
    divider: '#ffe082',
  },
  typography: {
    fontFamily: '"Baloo 2", "Comic Sans MS", "Merriweather", "Arial Rounded MT Bold", "Arial", "sans-serif"',
    fontSize: 17,
    h1: { fontWeight: 800, fontSize: '2.7rem', letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, fontSize: '2.2rem', letterSpacing: '-0.01em' },
    h3: { fontWeight: 600, fontSize: '1.6rem' },
    body1: { fontSize: '1.15rem', lineHeight: 1.8 },
    body2: { fontSize: '1.05rem', lineHeight: 1.7 },
  },
  shape: {
    borderRadius: 18,
  },
  spacing: 10,
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 24px 0 rgba(66, 165, 245, 0.10)',
          borderRadius: 24,
          backgroundColor: '#fffde7',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '1.1rem',
          letterSpacing: '0.02em',
        },
        containedPrimary: {
          background: 'linear-gradient(90deg, #42a5f5 60%, #7e57c2 100%)',
          color: '#fff',
        },
        containedSecondary: {
          background: 'linear-gradient(90deg, #ffb300 60%, #66bb6a 100%)',
          color: '#fff',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(90deg, #42a5f5 60%, #ffb300 100%)',
          color: '#fff',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 28,
          background: '#fffde7',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        thumb: {
          color: '#ffb300',
        },
        track: {
          color: '#42a5f5',
        },
        rail: {
          color: '#b085f5',
        },
      },
    },
  },
});

export default theme;