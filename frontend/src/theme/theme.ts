// frontend/src/theme/theme.ts
import { createTheme } from '@mui/material/styles';

/**
 * A minimal Material UI theme configuration.
 * This provides a basic palette and can be expanded later for more customizations.
 */
const theme = createTheme({
  palette: {
    mode: 'light', // Can be 'light' or 'dark'
    primary: {
      main: '#1976d2', // A standard blue, common for primary actions
    },
    secondary: {
      main: '#dc004e', // A standard pink/red, common for secondary actions
    },
    // You can customize error, warning, info, success colors if needed
    // error: { main: red.A400 },
  },
  typography: {
    // Optional: Set a default font family if different from MUI's default (Roboto)
    // fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
    // Optional: Adjust global font sizes or styles
    // h1: { fontSize: '2.5rem' },
  },
  // Optional: Define default props for components globally
  // components: {
  //   MuiButton: {
  //     defaultProps: {
  //       disableElevation: true, // Example: Remove shadow from all buttons
  //     },
  //   },
  // },
});

export default theme;