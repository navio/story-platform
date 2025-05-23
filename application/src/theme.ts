import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#F5655C', // Coral/salmon pink
      light: '#FF8A82',
      dark: '#D14840',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#3C3C3C', // Dark gray for text and buttons
      light: '#686868',
      dark: '#1F1F1F',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FFF7EF', // Light cream background
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1F1F1F',
      secondary: '#686868',
    },
    error: {
      main: '#FF4141',
    },
    success: {
      main: '#4CAF50',
    },
    divider: '#E8E8E8',
  },
  
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.1rem',
      lineHeight: 1.5,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '0.9rem',
      lineHeight: 1.5,
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.8rem',
      lineHeight: 1.5,
    },
    body1: {
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontWeight: 400,
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 500,
      fontSize: '0.875rem',
      textTransform: 'none',
    },
  },
  
  shape: {
    borderRadius: 12,
  },
  
  spacing: 8,
  
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          padding: '8px 20px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
          },
        },
        contained: {
          '&.Mui-disabled': {
            backgroundColor: '#F5655C60',
            color: '#FFFFFF80',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
        text: {
          '&:hover': {
            backgroundColor: 'rgba(245, 101, 92, 0.04)',
          },
        },
      },
      variants: [
        {
          props: { variant: 'cart' },
          style: {
            backgroundColor: '#F5655C',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#D14840',
            },
          },
        },
      ],
    },
    
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
        },
      },
    },
    
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 16,
          '&:last-child': {
            paddingBottom: 16,
          },
        },
      },
    },
    
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
          height: 32,
          '&.MuiChip-outlined': {
            borderWidth: 1.5,
          },
        },
        label: {
          paddingLeft: 16,
          paddingRight: 16,
        },
      },
      variants: [
        {
          props: { variant: 'genre' },
          style: {
            borderColor: '#F5655C',
            color: '#F5655C',
            borderWidth: 1.5,
          },
        },
      ],
    },
    
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '& fieldset': {
              borderColor: '#E8E8E8',
            },
            '&:hover fieldset': {
              borderColor: '#F5655C',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#F5655C',
            },
          },
        },
      },
    },
    
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          overflow: 'hidden',
          '&:before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: 0,
          },
        },
      },
    },
    
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#1F1F1F',
          boxShadow: 'none',
          borderBottom: '1px solid #E8E8E8',
        },
      },
    },
    
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.9rem',
          minWidth: 'auto',
          padding: '12px 16px',
        },
      },
    },
    
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#686868',
          '&:hover': {
            backgroundColor: 'rgba(245, 101, 92, 0.04)',
          },
        },
      },
    },
    
    MuiBadge: {
      styleOverrides: {
        badge: {
          backgroundColor: '#F5655C',
          color: '#FFFFFF',
        },
      },
    },
  },
});

export default theme;