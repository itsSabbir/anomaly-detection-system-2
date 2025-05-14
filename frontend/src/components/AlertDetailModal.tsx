// frontend/src/components/AlertDetailModal.tsx
import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'; // Added useState
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link'; // For potentially linking frameUrl directly
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'; // For error display

import type { ApiGetAlertByIdResponse, ApiAlertDetails, ApiErrorResponse } from '../types/api';

// --- Constants for Drawing ---
const CLIENT_SIDE_BBOX_COLOR = 'rgba(255, 255, 0, 0.8)'; // Yellow with some transparency for client-side bounding boxes
const CLIENT_SIDE_BBOX_LINE_WIDTH = 2; // Line width for client-side bounding boxes
const CLIENT_SIDE_LABEL_BG_COLOR = 'rgba(255, 255, 0, 0.9)'; // Background color for labels of client-side boxes
const CLIENT_SIDE_LABEL_TEXT_COLOR = 'black'; // Text color for labels of client-side boxes
const CLIENT_SIDE_FONT = '11px Arial'; // Font for labels of client-side boxes

// Determine the base URL for images.
// In a real app, this should ideally be configured via environment variables.
const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || ''; // e.g., http://localhost:3001 if frameUrl is /frames/...

interface AlertDetailModalProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Callback fired when the dialog is requested to be closed. */
  onClose: () => void;
  /** The full alert data to display. Null if not loaded or error. */
  alertData: ApiGetAlertByIdResponse | null;
  /** Indicates if alert data is currently being fetched. */
  isLoading: boolean;
  /** Optional error object if fetching alert data failed. */
  fetchError?: ApiErrorResponse | Error | null;
}

/**
 * DetailItem: A small utility component to render labeled detail items consistently.
 * It's memoized for performance as its props are simple and it might be rendered multiple times.
 */
const DetailItem: React.FC<{ label: string; value?: string | number | null }> = React.memo(({ label, value }) => (
  <Typography variant="body2" gutterBottom component="div">
    <Box component="strong" sx={{ display: 'inline-block', minWidth: '180px' }}>{label}:</Box>
    {/* Display 'N/A' if value is null, undefined, or an empty string */}
    {value !== null && value !== undefined && value !== '' ? String(value) : <Typography component="span" variant="caption" color="textSecondary">N/A</Typography>}
  </Typography>
));

/**
 * AlertDetailModal displays comprehensive information about a specific anomaly alert,
 * including metadata, the annotated frame image, and client-side rendered bounding boxes.
 */
const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  open,
  onClose,
  alertData,
  isLoading,
  fetchError,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null); // Ref for the canvas element used for drawing bounding boxes
  const imageRef = useRef<HTMLImageElement>(null);   // Ref for the image element
  const [imageLoaded, setImageLoaded] = useState(false); // State to track if the image has successfully loaded
  const [imageError, setImageError] = useState(false);   // State to track if there was an error loading the image

  // --- Utility to get full image URL ---
  // Memoized to prevent recalculation on every render unless alertData.frameUrl changes.
  const fullImageUrl = useMemo(() => {
    if (!alertData?.frameUrl) return '';
    // If frameUrl is already an absolute URL, use it directly. Otherwise, prepend the base URL.
    return alertData.frameUrl.startsWith('http') ? alertData.frameUrl : IMAGE_BASE_URL + alertData.frameUrl;
  }, [alertData?.frameUrl]);

  // --- Bounding Box Drawing Logic ---
  // useCallback to memoize the function, preventing re-creation on every render unless dependencies change.
  const drawClientSideBoundingBoxes = useCallback(() => {
    // Ensure all necessary elements and data are available before attempting to draw
    if (!open || !alertData?.details.triggering_objects_bboxes || !imageRef.current || !canvasRef.current || !imageLoaded || imageError) {
      // Clear canvas if conditions aren't met (e.g., modal closed, no data, image not loaded)
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const image = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // Should not happen if canvasRef is valid

    // Use naturalWidth/Height for original dimensions of the loaded image asset
    const { naturalWidth: imgNaturalWidth, naturalHeight: imgNaturalHeight } = image;
    // Use clientWidth/Height for the actual dimensions the image is being displayed at (could be scaled by CSS)
    const { clientWidth: displayWidth, clientHeight: displayHeight } = image;

    // If image dimensions are zero (e.g., image not fully loaded or broken), abort drawing
    if (imgNaturalWidth === 0 || imgNaturalHeight === 0 || displayWidth === 0 || displayHeight === 0) {
        console.warn("Image dimensions are zero, cannot draw boxes accurately.");
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas to remove any previous drawings
        return;
    }

    // Set canvas dimensions to match the displayed image dimensions
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Calculate scale factors if the displayed image size is different from its natural size
    const scaleX = displayWidth / imgNaturalWidth;
    const scaleY = displayHeight / imgNaturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before drawing new boxes

    // Iterate over each bounding box from the alert data
    alertData.details.triggering_objects_bboxes?.forEach(bbox => {
      // Scale coordinates and dimensions from original image size to displayed image size
      const x = bbox.xmin * scaleX;
      const y = bbox.ymin * scaleY;
      const width = (bbox.xmax - bbox.xmin) * scaleX;
      const height = (bbox.ymax - bbox.ymin) * scaleY;

      // Draw the bounding box rectangle
      ctx.strokeStyle = CLIENT_SIDE_BBOX_COLOR;
      ctx.lineWidth = CLIENT_SIDE_BBOX_LINE_WIDTH;
      ctx.strokeRect(x, y, width, height);

      // Prepare label text (class name and confidence)
      const label = `${bbox.class_name} (${(bbox.confidence * 100).toFixed(0)}%)`;
      ctx.font = CLIENT_SIDE_FONT;
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const textHeight = parseInt(CLIENT_SIDE_FONT, 10) || 11; // Approximate text height from font size

      // Position label above the box by default
      let labelY = y - 5;
      let labelBgY = y - textHeight - 5; // Background Y position
      
      // If label goes off the top of the canvas, draw it inside/below the box instead
      if (labelBgY < 0) {
        labelY = y + textHeight + 5; // Text Y position inside
        labelBgY = y + 5;            // Background Y position inside
      }
      
      // Draw background for the label
      ctx.fillStyle = CLIENT_SIDE_LABEL_BG_COLOR;
      ctx.fillRect(x, labelBgY, textWidth + 4, textHeight + 2); // Add padding to background
      // Draw the label text
      ctx.fillStyle = CLIENT_SIDE_LABEL_TEXT_COLOR;
      ctx.fillText(label, x + 2, labelY); // Add small offset for text within background
    });
  }, [open, alertData, imageLoaded, imageError]); // Dependencies: redraw if any of these change

  // Effect to trigger drawing when image finishes loading OR alertData changes while modal is open.
  // This also handles cases where the window might be resized (implicitly via imageRef.current.clientWidth/Height).
  // Consider adding a resize listener if dynamic resizing without image reload needs to trigger redraws.
  useEffect(() => {
    if (imageLoaded && open && alertData) {
        drawClientSideBoundingBoxes();
    }
  }, [imageLoaded, open, alertData, drawClientSideBoundingBoxes]); // Dependencies for re-running the effect


  // Reset image loaded/error state when modal opens (new alert) or closes.
  useEffect(() => {
    if (open) {
      setImageLoaded(false); // Reset for new image loading
      setImageError(false);  // Reset error state
    }
  }, [open]); // Dependency: runs when 'open' state changes


  // Callback for when the image successfully loads
  const handleImageLoad = () => {
    console.log("Modal image loaded.");
    setImageLoaded(true); // Set image as loaded, which will trigger the draw effect
    setImageError(false); // Ensure error state is false
  };
  // Callback for when the image fails to load
  const handleImageError = () => {
    console.error("Modal image failed to load from URL:", fullImageUrl);
    setImageError(true);   // Set error state
    setImageLoaded(false); // Ensure loaded state is false
  };


  // Utility function to format ISO timestamp strings into a more readable local format.
  // Memoized with useCallback as it's a pure function and might be used in DetailItem.
  const formatTimestamp = useCallback((isoString: string | undefined): string => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString(undefined, { // Use browser's default locale
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch (_error) { // FIX: Prefixed 'e' with '_' to indicate it's intentionally not used, satisfying no-unused-vars.
      // console.error("Error formatting timestamp:", _error); // Optional: log the error
      return isoString; // Return original string if parsing fails
    }
  }, []);

  // Renders the structured details from alertData.details.
  const renderAlertSpecifics = (details?: ApiAlertDetails) => {
    if (!details) return <DetailItem label="Detection Specifics" value="Not available" />;
    return (
      <>
        <DetailItem label="Video Timestamp" value={`${details.timestamp_ms?.toFixed(0)} ms`} />
        <DetailItem label="Original Frame #" value={details.frame_number_original} />
        {details.frame_number_processed !== undefined && <DetailItem label="Processed Frame #" value={details.frame_number_processed} />}
        <DetailItem label="Rule: Target Class" value={details.rule_config?.target_class} />
        <DetailItem label="Rule: Max Allowed" value={details.rule_config?.max_allowed} />
        <DetailItem label="Rule: Detected Count" value={details.detection_summary?.anomaly_trigger_class_count} />
        <DetailItem label="Total Objects in Frame" value={details.detection_summary?.total_objects_detected_in_frame} />
        <DetailItem label="Model Conf. Setting" value={details.model_settings_used?.confidence?.toFixed(2)} />
        <DetailItem label="Model IoU Setting" value={details.model_settings_used?.iou?.toFixed(2)} />

        {/* Display triggering objects if available */}
        {details.triggering_objects_bboxes && details.triggering_objects_bboxes.length > 0 && (
          <Box mt={1} pt={1} borderTop={1} borderColor="divider">
            <Typography variant="body2" gutterBottom><strong>Triggering Objects (Client-Rendered Style):</strong></Typography>
            {details.triggering_objects_bboxes.map((bbox, idx) => (
              <Typography variant="caption" component="div" key={`bbox-${idx}`} sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
                {/* FIX: Replaced irregular whitespace (e.g., non-breaking spaces) with regular spaces. 
                    'whiteSpace: "pre"' will preserve these spaces for indentation. */}
                {'  '}- {bbox.class_name} ({(bbox.confidence * 100).toFixed(0)}%) at [{bbox.xmin},{bbox.ymin},{bbox.xmax},{bbox.ymax}]
              </Typography>
            ))}
          </Box>
        )}
      </>
    );
  };

  // Main render logic for the dialog content based on loading, error, or data state.
  let content;
  if (isLoading) {
    content = (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '300px', p: 3 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="textSecondary">Loading alert details...</Typography>
      </Box>
    );
  } else if (fetchError) {
    content = (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '200px', p: 3, textAlign: 'center' }}>
        <ErrorOutlineIcon color="error" sx={{ fontSize: 40, mb:1 }} />
        <Typography variant="h6" color="error" gutterBottom>Failed to Load Alert</Typography>
        {/* Display specific error message if available */}
        <Typography color="textSecondary">{(fetchError as ApiErrorResponse)?.error || (fetchError as Error)?.message || "An unknown error occurred."}</Typography>
      </Box>
    );
  } else if (!alertData) {
    content = (
      <Typography sx={{ p: 3, textAlign: 'center' }} color="textSecondary">
        No alert data available to display.
      </Typography>
    );
  } else {
    // Content when alertData is successfully loaded
    content = (
      // The Grid component from MUI is used for layout.
      // `container` prop makes this Grid a container for Grid items.
      // `spacing` adds space between Grid items.
      // NOTE on Grid errors (ts(2769)): The usage <Grid item xs={...}> is standard for MUI.
      // If TypeScript errors persist for the `Grid item` props (like 'item' does not exist or 'component' is missing),
      // it might indicate an issue with:
      // 1. The specific version of @mui/material or @types/react being used.
      // 2. TypeScript version or configuration (tsconfig.json).
      // 3. A conflict with other type definitions in the project.
      // The code below adheres to common MUI Grid usage.
      <Grid container spacing={2} sx={{p:1}}> {/* Add padding around grid container */}
        {/* Grid item for Alert Information Section */}
        <Grid item xs={12} md={4}> {/* `item` prop designates this as a Grid item. `xs` and `md` are responsive breakpoints. */}
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}> {/* Outlined paper for distinct section styling */}
            <Typography variant="h6" gutterBottom>Alert Summary</Typography>
            <DetailItem label="Alert ID" value={alertData.id} />
            <DetailItem label="Alert Type" value={alertData.alert_type} />
            <DetailItem label="Message" value={alertData.message} />
            <DetailItem label="Logged At (Server)" value={formatTimestamp(alertData.created_at)} />
            
            {/* Scrollable box for potentially long detection details */}
            <Box mt={2} sx={{ maxHeight: '350px', overflowY: 'auto', pr: 1 }}>
              <Typography variant="subtitle2" gutterBottom sx={{pt:1, borderTop:1, borderColor: 'divider'}}>Detection Details:</Typography>
              {renderAlertSpecifics(alertData.details)}
            </Box>
          </Paper>
        </Grid>
        {/* Grid item for Frame Image Section */}
        <Grid item xs={12} md={8}> {/* This Grid item will take more space on medium screens and up. */}
          <Paper variant="outlined" sx={{ p: 2, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom>
              {/* FIX: Ensured regular spaces. Removed potential irregular whitespace. */}
              Annotated Frame <Link href={fullImageUrl} target="_blank" rel="noopener noreferrer" variant="caption">(Open Raw Image)</Link>
            </Typography>
            {fullImageUrl && !imageError ? ( // Display image and canvas if URL exists and no loading error
              <Box sx={{ position: 'relative', width: '100%',  lineHeight: 0 /* Fix for extra space below image in some browsers */ }}>
                <img
                  ref={imageRef}
                  src={fullImageUrl}
                  alt={`Anomaly frame for alert ID ${alertData.id}. Image shows scene with detections; Python-drawn boxes may be visible.`}
                  style={{ display: 'block', width: '100%', height: 'auto', objectFit: 'contain', maxHeight: 'calc(80vh - 200px)' /* Responsive height constraint */}}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  aria-describedby={`alert-frame-desc-${alertData.id}`} // For accessibility
                />
                {/* Canvas for client-side drawing, overlaid on the image */}
                {alertData.details?.triggering_objects_bboxes && alertData.details.triggering_objects_bboxes.length > 0 && !imageError && (
                  <canvas
                    ref={canvasRef}
                    style={{
                      position: 'absolute', // Position canvas exactly over the image
                      top: 0,
                      left: 0,
                      pointerEvents: 'none', // User interacts with image, not canvas, for events like right-click
                    }}
                    aria-hidden="true" // Canvas is decorative; main description is via image alt/aria-describedby
                  />
                )}
                <Typography variant="caption" color="textSecondary" id={`alert-frame-desc-${alertData.id}`} sx={{mt:1, lineHeight: 'normal' /* Reset line height for text */}}>
                    Note: Frame shows server-side annotations. Yellow boxes (if any) are client-side re-draws of triggering object data.
                </Typography>
              </Box>
            ) : imageError ? ( // Display error message if image failed to load
                <Box sx={{display: 'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'300px'}}>
                    <ErrorOutlineIcon color="error" sx={{fontSize: 40}}/>
                    <Typography color="error" sx={{mt:1}}>Failed to load frame image.</Typography>
                    <Typography variant="caption" color="textSecondary">{fullImageUrl}</Typography>
                </Box>
            ) : ( // Display message if no image URL is available
              <Typography color="textSecondary" sx={{p:3}}>Frame image not available for this alert.</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    );
  }

  // The Dialog component structure
  return (
    <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="lg" // Use a large max width for the dialog
        fullWidth      // Dialog will occupy the full width of its container (up to maxWidth)
        aria-labelledby="alert-detail-dialog-title" // For accessibility
    >
      <DialogTitle id="alert-detail-dialog-title">
        {/* Dynamically add Alert ID to title if data is loaded */}
        Alert Details {alertData && !isLoading && !fetchError ? `(ID: ${alertData.id})` : ''}
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'grey.50' /* Light background for content area */}}>
        {content} {/* Render the determined content (loading, error, or data) */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AlertDetailModal;