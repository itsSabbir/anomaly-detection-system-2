// frontend/src/types/api.ts

/**
 * Describes the 'details' object within an anomaly alert, providing
 * specific metadata about the detected event.
 */
export interface ApiAlertDetails {
  timestamp_ms: number;         // Timestamp of the frame in milliseconds from video start
  frame_number: number;         // The frame number in the video sequence
  target_class: string;         // The class of object that triggered the rule (e.g., 'person')
  detected_count: number;       // How many instances of the target_class were found
  max_allowed: number;          // The threshold that was exceeded
  confidence_threshold: number; // The confidence level used for detection
  // Optional: Further details like bounding boxes, scores, etc.
  // detections_summary?: Array<Record<string, number | string>>;
}

/**
 * Describes the 'alert' object payload returned by the backend
 * when an anomaly is successfully detected and recorded.
 */
export interface ApiAlertData {
  alert_type: string;     // A string describing the type of anomaly (e.g., "High Count: person")
  message: string;        // A specific message describing the detected anomaly event
  frame_filename: string; // The unique filename of the saved frame image on the server
  details: ApiAlertDetails; // Nested object with specific metadata about the detection
  frameUrl?: string;       // URL (relative or absolute) to access the frame; often constructed by frontend or backend
}

/**
 * Represents the expected structure of a successful response from the
 * /api/upload backend endpoint.
 */
export interface ApiUploadSuccessResponse {
  message: string;     // A top-level status message from the backend (e.g., "Anomaly detected...", "Video processed...")
  alert?: ApiAlertData; // The 'alert' object; present only if an anomaly was detected.
}

/**
 * Represents the expected structure of an error response from the
 * backend API endpoints (e.g., when validation fails or processing error).
 */
export interface ApiErrorResponse { // <--- MAKE SURE THIS IS EXPORTED
  error: string;         // A descriptive error message
  details?: string | Record<string, unknown>; // Optional additional details about the error
}