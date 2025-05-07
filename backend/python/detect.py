# backend/python/detect.py
"""
Anomaly Detection Script using YOLOv5.

Processes an input video file, performs object detection frame-by-frame (sampled),
applies predefined anomaly detection rules, saves the frame image upon detection,
and outputs a JSON object to standard output containing alert details if an
anomaly is detected. All diagnostic information is printed to standard error.
"""

import argparse
import cv2
import torch
import sys
import os
import json
import time
import pandas as pd
import logging
from pathlib import Path
from typing import Tuple, Optional, Dict, Any, List

# --- Constants ---
DEFAULT_MODEL_NAME_OR_PATH = 'yolov5s.pt' # Default model - downloads if not found locally
DEFAULT_CONFIDENCE_THRESHOLD = 0.4
DEFAULT_IOU_THRESHOLD = 0.45
DEFAULT_FRAME_SAMPLE_RATE = 5 # Process 1 out of every N frames
DEFAULT_DEVICE = 'cpu' # Default to CPU, can be overridden by --device

# --- Anomaly Rule Configuration ---
# Simple rule: Trigger if count of TARGET_CLASS exceeds MAX_ALLOWED
TARGET_CLASS_NAME = 'person'
MAX_ALLOWED_TARGETS = 2

# --- Logging Setup ---
def setup_logging() -> logging.Logger:
    """Configures and returns a logger instance."""
    logger = logging.getLogger("AnomalyDetection")
    logger.setLevel(logging.INFO) # Set base level
    # Prevent duplicate handlers if script is somehow run multiple times in same process
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stderr) # Log to stderr
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger

logger = setup_logging()

# --- Core Functions ---

def select_device(requested_device: str) -> str:
    """Selects appropriate compute device (CPU or CUDA GPU)."""
    if requested_device.lower() == 'cuda':
        if torch.cuda.is_available():
            logger.info("CUDA device requested and available. Using GPU.")
            return 'cuda'
        else:
            logger.warning("CUDA device requested but not available. Falling back to CPU.")
            return 'cpu'
    logger.info("Using CPU device.")
    return 'cpu'

def load_model(model_path_or_name: str, confidence: float, iou: float, device: str) -> torch.nn.Module:
    """Loads the YOLOv5 model from PyTorch Hub or local path."""
    logger.info(f"Attempting to load YOLOv5 model: '{model_path_or_name}'")
    try:
        # _verbose=False suppresses excessive torch hub download messages
        model = torch.hub.load('ultralytics/yolov5', 'custom', path=model_path_or_name, force_reload=False, _verbose=False)
        model.conf = confidence # Set confidence threshold
        model.iou = iou # Set IoU threshold for Non-Max Suppression
        model = model.to(device) # Move model to selected device
        model.eval() # Set model to evaluation mode
        logger.info(f"YOLOv5 model loaded successfully onto device '{device}'.")
        return model
    except Exception as e:
        logger.exception(f"FATAL ERROR: Failed to load YOLOv5 model: {e}")
        if "ailed to download" in str(e) or "urlopen error" in str(e):
             logger.error("Hint: Model download may have failed. Check internet connection or ensure model path is correct.")
        sys.exit(1) # Exit if model cannot be loaded

def check_anomaly_rules(detections_df: pd.DataFrame) -> Tuple[bool, int]:
    """
    Applies the predefined anomaly detection rules.
    Currently checks if the count of TARGET_CLASS_NAME exceeds MAX_ALLOWED_TARGETS.

    Args:
        detections_df: Pandas DataFrame of detections from YOLOv5.

    Returns:
        A tuple: (is_anomaly: bool, target_count: int)
    """
    target_detections = detections_df[detections_df['name'] == TARGET_CLASS_NAME]
    target_count = len(target_detections)
    is_anomaly = target_count > MAX_ALLOWED_TARGETS
    return is_anomaly, target_count

def save_frame(frame: Any, output_dir: str, frame_num: int, timestamp_ms: float) -> Optional[str]:
    """Saves the given frame as a JPEG image with a unique name."""
    try:
        # Ensure output directory exists (should be created by Node.js, but double-check)
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Create a filename incorporating frame number and timestamp
        filename = f"frame_{frame_num}_{int(timestamp_ms)}.jpg"
        save_path = os.path.join(output_dir, filename)

        success = cv2.imwrite(save_path, frame)
        if success:
            logger.info(f"  Successfully saved anomaly frame: {save_path}")
            return filename # Return just the filename
        else:
            logger.warning(f"  Failed to save frame using cv2.imwrite to {save_path}")
            return None
    except Exception as e:
        logger.error(f"  Error occurred while saving frame to {output_dir}: {e}")
        return None

def process_video(
    video_path: str,
    frame_output_dir: str,
    model: torch.nn.Module,
    device: str,
    sample_rate: int
) -> None:
    """
    Main video processing loop. Reads frames, runs inference, checks rules,
    saves frame, and prints JSON if anomaly detected.
    """
    logger.info(f"Opening video file for processing: {video_path}")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logger.error(f"FATAL ERROR: Cannot open video file {video_path}")
        sys.exit(1)

    # Get video properties
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    logger.info(f"Video Properties: FPS={fps:.2f}, Size={frame_width}x{frame_height}, Total Frames={total_frames if total_frames > 0 else 'N/A'}")

    frame_count = 0
    processed_frame_count = 0
    anomaly_detected_flag = False
    start_time = time.time()

    while True: # Loop until break
        ret, frame = cap.read()
        if not ret:
            logger.info("Reached end of video stream.")
            break # Exit loop gracefully

        frame_count += 1

        # Apply frame sampling
        if frame_count % sample_rate != 0:
            continue

        processed_frame_count += 1
        current_timestamp_ms = cap.get(cv2.CAP_PROP_POS_MSEC)

        # Log progress periodically
        if processed_frame_count % 100 == 0: # Log every 100 processed frames
             logger.info(f"  Processing frame {frame_count} (Timestamp ~{current_timestamp_ms:.0f}ms)...")

        try:
            # --- Inference ---
            # Note: Ensure frame is in correct format if needed (YOLOv5 generally handles BGR numpy arrays)
            results = model(frame)

            # --- Process Results ---
            detections_df = results.pandas().xyxy[0] # Detections for this frame

            # --- Check Anomaly Rules ---
            is_anomaly, target_count = check_anomaly_rules(detections_df)

            if is_anomaly:
                anomaly_detected_flag = True
                logger.warning(f"ANOMALY DETECTED at frame {frame_count} (Timestamp ~{current_timestamp_ms:.0f}ms)")
                logger.warning(f"  Rule Triggered: Found {target_count} '{TARGET_CLASS_NAME}' (>{MAX_ALLOWED_TARGETS} allowed)")

                # --- Save Frame & Generate Alert JSON ---
                saved_frame_filename = save_frame(frame, frame_output_dir, frame_count, current_timestamp_ms)

                if saved_frame_filename: # Only output JSON if frame was saved
                    alert_info = {
                        "alert_type": f"High Count: {TARGET_CLASS_NAME}",
                        "message": f"Detected {target_count} '{TARGET_CLASS_NAME}' objects, exceeding limit of {MAX_ALLOWED_TARGETS}.",
                        "frame_filename": saved_frame_filename, # Filename for Node.js to reference
                        "details": {
                            "timestamp_ms": current_timestamp_ms,
                            "frame_number": frame_count,
                            "target_class": TARGET_CLASS_NAME,
                            "detected_count": target_count,
                            "max_allowed": MAX_ALLOWED_TARGETS,
                            "confidence_threshold": model.conf,
                            # Optional: Add summary of detections if needed
                            # "detections_summary": detections_df[['name', 'confidence']].round(3).to_dict('records')
                        }
                    }
                    # --- Output JSON to stdout ---
                    print(json.dumps(alert_info))
                else:
                    logger.error("  Anomaly detected but failed to save frame. No JSON alert generated.")

                break # Stop processing after first anomaly

        except Exception as e:
            logger.exception(f"ERROR during processing frame {frame_count}: {e}")
            # Depending on requirements, might continue or break on error
            # break # Exit loop on first processing error

    # --- Cleanup ---
    cap.release()
    end_time = time.time()
    processing_time = end_time - start_time
    logger.info("Finished video processing.")
    logger.info(f"  Total frames read: {frame_count}")
    logger.info(f"  Frames processed (sampled): {processed_frame_count}")
    logger.info(f"  Total processing time: {processing_time:.2f} seconds")

    if not anomaly_detected_flag:
        logger.info("  No anomalies detected according to defined rules.")

    # Exit successfully (Node.js checks stdout for JSON, not exit code for anomaly)
    sys.exit(0)


# --- Main Execution Guard ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Detect anomalies in a video using YOLOv5.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter # Show defaults in help message
    )
    parser.add_argument("video_path", help="Path to the input video file.")
    parser.add_argument("frame_output_dir", help="Directory to save anomaly frames.")
    parser.add_argument(
        "--model", default=DEFAULT_MODEL_NAME_OR_PATH,
        help="Path or name of the YOLOv5 model (e.g., yolov5s.pt, yolov5m.pt)."
    )
    parser.add_argument(
        "--conf", type=float, default=DEFAULT_CONFIDENCE_THRESHOLD,
        help="Object detection confidence threshold (0.0 to 1.0)."
    )
    parser.add_argument(
        "--iou", type=float, default=DEFAULT_IOU_THRESHOLD,
        help="IoU threshold for Non-Maximum Suppression (0.0 to 1.0)."
    )
    parser.add_argument(
        "--sample", type=int, default=DEFAULT_FRAME_SAMPLE_RATE,
        help="Frame sampling rate (process 1 out of N frames)."
    )
    parser.add_argument(
        "--device", default=DEFAULT_DEVICE,
        help="Compute device ('cpu' or 'cuda' if available)."
    )
    # Add more arguments here if needed (e.g., --target-class, --max-count)

    args = parser.parse_args()

    # --- Input Validation ---
    video_file = Path(args.video_path)
    frame_dir = Path(args.frame_output_dir)

    if not video_file.is_file():
        logger.error(f"FATAL ERROR: Video file not found at '{args.video_path}'")
        sys.exit(1)
    if not frame_dir.is_dir():
        # Attempt to create it? For now, assume Node.js created it.
        logger.error(f"FATAL ERROR: Frame output directory not found at '{args.frame_output_dir}'")
        sys.exit(1)
    if args.sample < 1:
        logger.error("FATAL ERROR: Frame sample rate must be 1 or greater.")
        sys.exit(1)
    if not 0.0 <= args.conf <= 1.0:
        logger.error("FATAL ERROR: Confidence threshold must be between 0.0 and 1.0.")
        sys.exit(1)
    if not 0.0 <= args.iou <= 1.0:
        logger.error("FATAL ERROR: IoU threshold must be between 0.0 and 1.0.")
        sys.exit(1)

    # --- Select Device and Load Model ---
    selected_device = select_device(args.device)
    model = load_model(args.model, args.conf, args.iou, selected_device)

    # --- Run Processing ---
    try:
        process_video(
            str(video_file), # Pass path as string
            str(frame_dir), # Pass path as string
            model,
            selected_device,
            args.sample
        )
    except Exception as e:
        logger.exception(f"An unexpected error occurred during video processing: {e}")
        sys.exit(1) # Exit with error on unexpected failure