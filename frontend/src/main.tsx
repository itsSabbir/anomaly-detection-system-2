// frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client'; // Correct import for React 18+
import App from './App.tsx';              // Your main application component
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline'; // For consistent browser styling
import theme from './theme/theme.ts';       // Your custom MUI theme

/**
 * Application's main entry point.
 * Initializes React, applies the MUI theme, and renders the root App component.
 */

// Attempt to find the root DOM element for React rendering.
// This ID must match the ID of a div in your public/index.html file.
const rootElement = document.getElementById('root');

if (!rootElement) {
  // This is a critical failure; the app cannot render without the root element.
  const errorMessage = "FATAL ERROR: Root DOM element with ID 'root' was not found. Ensure your public/index.html file contains <div id=\"root\"></div>.";
  console.error(errorMessage);
  // Optionally, display a more user-friendly message in the DOM if possible,
  // though if this script itself fails, that might not be feasible.
  document.body.innerHTML = `<div style="padding: 20px; text-align: center; font-family: sans-serif; color: red;"><h1>Application Initialization Error</h1><p>${errorMessage}</p></div>`;
  throw new Error(errorMessage); // Halt further script execution
}

// Create the React root using the new API for React 18+
const root = ReactDOM.createRoot(rootElement);

// Render the application within React.StrictMode and with MUI providers
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      {/* CssBaseline applies a consistent baseline styling reset */}
      <CssBaseline />
      {/* App is the root component of your application's UI */}
      <App />
    </ThemeProvider>
  </React.StrictMode>
);