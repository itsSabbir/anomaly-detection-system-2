// frontend/src/App.tsx
import React, { useState, useCallback } from 'react'; // Ensure useState and useCallback are imported
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button'; // Import Button
import axios, { AxiosError } from 'axios';

// Import your components and types
import UploadSection from './components/UploadSection';
import AlertDetailModal from './components/AlertDetailModal'; // Import the modal
import type {
  ApiUploadSuccessResponse,
  ApiErrorResponse,
  ApiGetAlertByIdResponse
} from './types/api'; // Import all necessary types

// --- Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const UPLOAD_ENDPOINT = `${API_BASE_URL}/upload`;
const ALERTS_ENDPOINT_BASE = `${API_BASE_URL}/alerts`; // For GET /alerts/:id

if (import.meta.env.DEV) {
  console.log(`Frontend Application - API Base URL: ${API_BASE_URL}`);
}

/**
 * Root Application Component.
 * Manages video uploads and displays alert details in a modal.
 */
function App() {
  // --- State for Modal Logic ---
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [currentAlertDetails, setCurrentAlertDetails] = useState<ApiGetAlertByIdResponse | null>(null);
  const [isFetchingAlertDetails, setIsFetchingAlertDetails] = useState<boolean>(false);
  const [alertFetchError, setAlertFetchError] = useState<ApiErrorResponse | Error | null>(null);
  const [lastSuccessfulAlertId, setLastSuccessfulAlertId] = useState<number | null>(null);

  // --- Function to Fetch Full Alert Details for Modal ---
  const fetchAndShowAlertDetails = useCallback(async (alertId: number | null) => {
    if (!alertId) {
      console.warn("No alert ID provided to fetch details for modal.");
      setAlertFetchError(new Error("No Alert ID available to show details."));
      setCurrentAlertDetails(null);
      setIsAlertModalOpen(true); // Open modal to show the error/message
      setIsFetchingAlertDetails(false);
      return;
    }

    console.log(`Attempting to fetch details for alert ID: ${alertId}`);
    setIsFetchingAlertDetails(true);
    setAlertFetchError(null); // Clear previous fetch errors
    setIsAlertModalOpen(true);  // Open modal to show loading indicator
    setCurrentAlertDetails(null); // Clear previous alert details

    try {
      const response = await axios.get<ApiGetAlertByIdResponse>(`${ALERTS_ENDPOINT_BASE}/${alertId}`);
      setCurrentAlertDetails(response.data);
      console.log("Successfully fetched alert details for modal:", response.data);
    } catch (error) {
      console.error(`Failed to fetch alert details for ID ${alertId}:`, error);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiErrorResponse>; // Cast for better type inference
        setAlertFetchError(axiosError.response?.data || new Error(axiosError.message || "Network error fetching details."));
      } else if (error instanceof Error) {
        setAlertFetchError(error);
      } else {
        setAlertFetchError(new Error("An unknown error occurred while fetching alert details."));
      }
      setCurrentAlertDetails(null); // Ensure no stale data is shown on error
    } finally {
      setIsFetchingAlertDetails(false);
    }
  }, []); // ALERTS_ENDPOINT_BASE is stable, so no need to list as dependency

  // --- Upload Handler ---
  const handleUploadSubmit = async (file: File): Promise<ApiUploadSuccessResponse> => {
    const formData = new FormData();
    formData.append('video', file);

    setLastSuccessfulAlertId(null); // Reset before new upload attempt
    // If modal is open from previous alert, you might want to close it here or let user close it
    // setIsAlertModalOpen(false); 
    // setCurrentAlertDetails(null);

    console.log(`Submitting file "${file.name}" (size: ${file.size} bytes) to ${UPLOAD_ENDPOINT}`);
    try {
      const response = await axios.post<ApiUploadSuccessResponse>(UPLOAD_ENDPOINT, formData, { timeout: 300000 });
      console.log('Upload successful. Server Response Data:', response.data);

      // If an anomaly was detected and alert data (with ID) is present in the response
      if (response.data.anomaly_detected && response.data.alert?.id) {
        setLastSuccessfulAlertId(response.data.alert.id);
        // The "View Details" button will now appear
      }
      return response.data; // Return full response to UploadSection for its status message
    } catch (error) {
      console.error('Error during upload request in App.tsx:', error);
      setLastSuccessfulAlertId(null); // Ensure no stale ID on error
      // Re-throw so UploadSection can also handle it for its UI feedback
      throw error;
    }
  };

  const handleModalClose = useCallback(() => {
    setIsAlertModalOpen(false);
    // Optional: You might want to clear currentAlertDetails when modal is closed
    // to ensure fresh data if it's reopened for the same ID without re-fetching,
    // or to free up memory. For now, it keeps data until a new fetch for a new ID.
    // setCurrentAlertDetails(null);
    // setAlertFetchError(null);
  }, []);


  // --- Main JSX Render ---
  return (
    <Container component="main" maxWidth="md" sx={{ mt: { xs: 2, sm: 4 }, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3, // Space between elements
          }}
        >
          <Typography component="h1" variant="h4" align="center" gutterBottom sx={{ fontWeight: 'medium' }}>
            Anomaly Detection Portal
          </Typography>

          <UploadSection onUploadSubmit={handleUploadSubmit} />

          {/* Conditionally render "View Details" button if an anomaly was processed successfully */}
          {lastSuccessfulAlertId && !isAlertModalOpen && ( // Show button if ID exists AND modal isn't already open
            <Button
              variant="contained"
              color="info" // A distinct color for this action
              onClick={() => fetchAndShowAlertDetails(lastSuccessfulAlertId)}
              sx={{ mt: 2, py: 1, px: 3 }} // Add some padding
              disabled={isFetchingAlertDetails} // Disable if details are already being fetched
              aria-label={`View details for alert ID ${lastSuccessfulAlertId}`}
            >
              View Details for Alert ID: {lastSuccessfulAlertId}
            </Button>
          )}
        </Box>
      </Paper>

      {/* Alert Detail Modal Component - always in DOM but visibility controlled by 'open' prop */}
      <AlertDetailModal
        open={isAlertModalOpen}
        onClose={handleModalClose}
        alertData={currentAlertDetails}
        isLoading={isFetchingAlertDetails}
        fetchError={alertFetchError} // Pass the fetch error state
      />
    </Container>
  );
}

export default App;