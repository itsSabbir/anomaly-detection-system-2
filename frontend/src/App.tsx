// frontend/src/App.tsx
import React from 'react'; // You can keep this or remove it as per suggestion, doesn't break functionality
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import axios, { AxiosError } from 'axios';

import UploadSection from './components/UploadSection';
// MODIFIED IMPORT: Use 'import type' for type-only imports
import type { ApiUploadSuccessResponse, ApiErrorResponse } from './types/api';

// --- Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const UPLOAD_ENDPOINT = `${API_BASE_URL}/upload`;

if (import.meta.env.DEV) {
  console.log(`Frontend Application - Using API endpoint for uploads: ${UPLOAD_ENDPOINT}`);
}

function App() {
  const handleUploadSubmit = async (file: File): Promise<ApiUploadSuccessResponse> => {
    const formData = new FormData();
    formData.append('video', file);

    console.log(`Submitting file "${file.name}" (size: ${file.size} bytes) to ${UPLOAD_ENDPOINT}`);

    try {
      const response = await axios.post<ApiUploadSuccessResponse>(
        UPLOAD_ENDPOINT,
        formData,
        {
          timeout: 300000,
        }
      );

      console.log('Upload successful. Server response status:', response.status);
      console.log('Server response data:', response.data);
      return response.data;

    } catch (error) {
      console.error('Error during upload request in App.tsx:', error);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        console.error('Axios error message:', axiosError.message);
        if (axiosError.response) {
          console.error('Server Status:', axiosError.response.status);
          console.error('Server Error Response Data:', axiosError.response.data);
          throw axiosError.response?.data || axiosError;
        } else if (axiosError.request) {
          console.error('No response received from server (network/timeout):', axiosError.request);
          throw new Error('Network error or server timeout. Please try again.');
        }
      }
      throw error;
    }
  };

  return (
    <Container component="main" maxWidth="sm" sx={{ mt: { xs: 2, sm: 4 }, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Typography component="h1" variant="h4" align="center" gutterBottom sx={{ fontWeight: 'medium' }}>
            Anomaly Detection Portal
          </Typography>
          <UploadSection onUploadSubmit={handleUploadSubmit} />
        </Box>
      </Paper>
    </Container>
  );
}

export default App;