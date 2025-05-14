// frontend/src/types/api.ts

/**
 * Describes the 'details' object within an anomaly alert, providing
 * specific metadata about the detected event.
 */
export interface ApiAlertDetails {
  timestamp_ms: number;         // Timestamp of the frame in milliseconds from video start
  // frame_number: number;      // Original: 'frame_number'. Python outputs 'frame_number_original'. Choose one or map it.
  frame_number_original: number; // As per "Definitive detect.py" output
  frame_number_processed?: number; // Optional, "Definitive detect.py" includes this

  rule_config?: {                // "Definitive detect.py" nests rule info
    target_class: string;
    max_allowed: number;
  };
  detection_summary?: {          // "Definitive detect.py" nests detection counts
    anomaly_trigger_class_count: number;
    total_objects_detected_in_frame: number;
    frame_width?: number; // If your python script outputs original frame dimensions
    frame_height?: number;// If your python script outputs original frame dimensions
  };
  model_settings_used?: {        // "Definitive detect.py" nests model settings
    confidence: number;
    iou: number;
  };
  
  // CRITICAL ADDITION/MODIFICATION FOR BOUNDING BOXES
  triggering_objects_bboxes?: Array<{ // BBoxes are optional as not all alerts might have them, or format might vary
    class_name: string;
    confidence: number;
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  }>;
  // Optional: Further details like bounding boxes, scores, etc.
  // detections_summary?: Array<Record<string, number | string>>; // This was the old one, replaced by specific fields
}

/**
 * Describes the 'alert' object payload that is part of the response from
 * POST /api/upload when an anomaly is detected.
 */
export interface ApiAlertDataFromUpload { // Renamed to distinguish from GET /alerts/:id payload
  id: number; // The backend now returns the ID in the upload response too
  alert_type: string;
  message: string;
  frame_filename: string; // Python uses frame_filename, which becomes frame_storage_key in DB
  details: ApiAlertDetails;
  frameUrl?: string;       // Constructed by Node.js backend in the upload response
}

/**
 * Represents the expected structure of a successful response from the
 * POST /api/upload backend endpoint.
 */
export interface ApiUploadSuccessResponse {
  message: string;
  anomaly_detected: boolean; // Add this for clarity from backend
  alert?: ApiAlertDataFromUpload; // Use the more specific type; present if anomaly_detected is true
}

/**
 * Represents the expected structure of an error response from the
 * backend API endpoints (e.g., when validation fails or processing error).
 */
export interface ApiErrorResponse {
  error: string;
  details?: string | Record<string, unknown> | { detail?: string }; // Allow for pg unique constraint error format
}

/**
 * Represents the expected structure of a successful response from the
 * GET /api/alerts/:id backend endpoint.
 */
export interface ApiGetAlertByIdResponse {
  id: number;
  alert_type: string;
  message: string;
  frame_storage_key: string; // What's stored in DB, corresponds to python's frame_filename
  details: ApiAlertDetails;  // Contains the rich nested data including bboxes
  created_at: string;      // Timestamp of alert creation (ISO string from DB)
  frameUrl: string;        // Constructed by Node.js backend for GET /alerts/:id response
}