// frontend/src/components/UploadSection.tsx
import React, { useState, useRef, useCallback } from 'react';
// Type-only import for ChangeEvent
import type { ChangeEvent } from 'react';

import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
// Type-only import for AlertColor
import type { AlertColor } from '@mui/material/Alert';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios'; // Keep `axios` as default import for its runtime value
// Type-only import for AxiosError
import type { AxiosError } from 'axios'; // This will be used explicitly below

// Type-only imports from your types/api.ts
import type { ApiUploadSuccessResponse, ApiErrorResponse } from '../types/api';

// --- Component Configuration ---
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_VIDEO_TYPES = "video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,video/ogg";

// --- TypeScript Interfaces ---
interface UploadSectionProps {
  onUploadSubmit: (file: File) => Promise<ApiUploadSuccessResponse>;
}

interface StatusMessage {
  message: string;
  severity: AlertColor; // Correctly uses the type-only imported AlertColor
}

const UploadSection: React.FC<UploadSectionProps> = ({ onUploadSubmit }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setStatus(null);
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size === 0) {
        setStatus({ message: 'Error: Selected file is empty.', severity: 'error' });
        setSelectedFile(null); return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setStatus({ message: `Error: File "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit.`, severity: 'error' });
        setSelectedFile(null); return;
      }
      const acceptedTypesArray = ACCEPTED_VIDEO_TYPES.split(',');
      if (!acceptedTypesArray.includes(file.type) && file.type !== '') {
        setStatus({ message: `Warning: File type "${file.type}" may not be supported.`, severity: 'warning' });
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  }, []);

  const triggerFileInput = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  const handleUpload = useCallback(async (): Promise<void> => {
    if (!selectedFile) {
      setStatus({ message: 'Please select a video file to upload.', severity: 'warning' });
      return;
    }
    setIsUploading(true);
    setStatus({ message: `Uploading "${selectedFile.name}"... This may take a moment.`, severity: 'info' });

    try {
      const responseData = await onUploadSubmit(selectedFile);
      // Note: The severity logic below might differ from initial "barebones" spec (anomaly=warning).
      // Consider if `responseData.anomaly_detected ? 'warning' : 'success'` is desired.
      setStatus({
        message: responseData.message || 'Upload processed successfully.',
        severity: responseData.alert ? 'success' : 'info' 
      });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: unknown) {
      console.error('Upload failed in UploadSection component:', error);
      let displayMessage = 'An unexpected error occurred during upload. Please check console logs for details.';

      if (axios.isAxiosError<ApiErrorResponse>(error)) {
        // Explicitly assigning 'error' to a variable typed with 'AxiosError'
        // makes the 'AxiosError' type import "used" according to ESLint.
        const typedAxiosError: AxiosError<ApiErrorResponse> = error;

        if (typedAxiosError.response?.data?.error) {
          displayMessage = typedAxiosError.response.data.error;
        } else if (typedAxiosError.message) {
          displayMessage = `Network or server error: ${typedAxiosError.message}`;
        }
      } else if (error instanceof Error) {
        displayMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        if ('error' in error && typeof (error as ApiErrorResponse).error === 'string') {
            displayMessage = (error as ApiErrorResponse).error;
        }
        else if ('message' in error && typeof (error as { message: string }).message === 'string') {
            displayMessage = (error as { message: string }).message;
        }
      }
      setStatus({ message: displayMessage, severity: 'error' });
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, onUploadSubmit]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
      <input ref={fileInputRef} type="file" hidden accept={ACCEPTED_VIDEO_TYPES} onChange={handleFileChange} />
      <Button variant="outlined" startIcon={<CloudUploadIcon />} onClick={triggerFileInput} disabled={isUploading} fullWidth aria-label="Choose video file to upload">
        Choose Video File
      </Button>
      {selectedFile && (
        <Typography variant="body2" align="center" noWrap sx={{ mt: -1, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis' }} title={selectedFile.name}>
          Selected: {selectedFile.name} ({ (selectedFile.size / 1024 / 1024).toFixed(2) } MB)
        </Typography>
      )}
      <Button variant="contained" color="primary" onClick={handleUpload} disabled={!selectedFile || isUploading} fullWidth aria-label="Upload selected video file for anomaly detection">
        {isUploading ? 'Processing...' : 'Upload & Detect'}
      </Button>
      {isUploading && <LinearProgress variant="indeterminate" sx={{ width: '100%' }} />}
      {status && (
        <Alert severity={status.severity} sx={{ width: '100%', mt: 1 }} role="status" aria-live="polite">
          {status.message}
        </Alert>
      )}
    </Box>
  );
};

export default UploadSection;