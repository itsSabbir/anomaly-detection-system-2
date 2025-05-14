# backend/python/detect.py
"""
Definitive Enhanced Anomaly Detection Script using YOLOv5.

Combines robust path handling for environment-agnostic model loading with
advanced detection, drawing, and JSON reporting features.
Processes an input video, performs object detection, applies anomaly rules,
draws bounding boxes for all detected objects on the frame (highlighting
triggering anomalies), saves the annotated frame, and outputs a JSON
object to stdout with alert details, including bounding box coordinates
of triggering objects if an anomaly is detected. All diagnostic information
is printed to stderr.
"""

import argparse
import cv2
import torch
import sys
import os # Retained for SCRIPT_DIR pathing established on EC2
import json
import time
import pandas as pd
import logging
from pathlib import Path # Used for other path operations and validation
from typing import Tuple, Optional, Dict, Any, List, Callable # Callable imported

# --- Pathing Setup (CRITICAL for consistent model loading) ---
# This block ensures that even if the script is called from a different
# working directory (e.g., by Node.js spawn), it knows where its own
# co-located files (like yolov5s.pt) are.
try:
    # os.path.abspath(__file__) gives the absolute path of the script itself
    # os.path.dirname(...) gets the directory containing the script
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
except NameError:
    # __file__ is not defined if, for example, the script is run interactively
    # or embedded in a way where it doesn't have a file path. Fallback to CWD.
    SCRIPT_DIR = os.getcwd()
    # A warning might be prudent here if script assumes co-located resources
    # but this fallback is more robust than crashing.

# --- Configuration Constants ---
# Model & Inference - Default model path is now relative to SCRIPT_DIR
DEFAULT_MODEL_NAME_OR_PATH: str = os.path.join(SCRIPT_DIR, 'yolov5s.pt')
DEFAULT_CONFIDENCE_THRESHOLD: float = 0.4
DEFAULT_IOU_THRESHOLD: float = 0.45
DEFAULT_FRAME_SAMPLE_RATE: int = 5
DEFAULT_DEVICE: str = 'cpu'

# Anomaly Rule
TARGET_CLASS_NAME: str = 'person'
MAX_ALLOWED_TARGETS: int = 1 # Changed for easier testing of anomaly trigger

# Bounding Box Drawing
DEFAULT_BOX_COLOR: Tuple[int, int, int] = (255, 255, 0)  # Cyan
ANOMALY_BOX_COLOR: Tuple[int, int, int] = (0, 0, 255)    # Red
BOX_THICKNESS: int = 2
FONT: int = cv2.FONT_HERSHEY_SIMPLEX
FONT_SCALE: float = 0.6
FONT_THICKNESS: int = 1
LABEL_TEXT_COLOR: Tuple[int, int, int] = (0, 0, 0)       # Black text

# --- Logging Setup ---
def setup_logging(log_level_str: str = 'INFO') -> logging.Logger:
    """Configures and returns a logger instance that logs to stderr."""
    logger_instance = logging.getLogger("DefinitiveAnomalyDetection")
    if logger_instance.hasHandlers(): # Prevent duplicate handlers
        logger_instance.handlers.clear()

    # Convert string log level to logging module's level integer
    log_level_upper = log_level_str.upper()
    numeric_log_level = getattr(logging, log_level_upper, None)
    if not isinstance(numeric_log_level, int):
        # Fallback to INFO and log a warning if an invalid level string is passed
        print(f"Warning: Invalid log level '{log_level_str}' provided. Defaulting to INFO.", file=sys.stderr)
        numeric_log_level = logging.INFO
    logger_instance.setLevel(numeric_log_level)

    # Create handler and formatter
    stderr_handler = logging.StreamHandler(sys.stderr)
    log_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - [%(levelname)s] - (%(module)s.%(funcName)s:%(lineno)d) - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    stderr_handler.setFormatter(log_formatter)
    logger_instance.addHandler(stderr_handler)
    return logger_instance

# Global logger instance, configured by main block later via --log-level arg
logger = setup_logging()


# --- Core Utility Functions ---
def select_device(requested_device_str: str) -> str:
    """Selects compute device (CPU, CUDA GPU, Apple MPS) with robust fallbacks."""
    device_selected = requested_device_str.lower()
    if device_selected == 'cuda' or device_selected.startswith('cuda:'):
        if torch.cuda.is_available():
            try:
                # Test if specified CUDA device is accessible
                if ':' in device_selected:
                    torch.cuda.device(int(device_selected.split(':')[1])) # Raises error if invalid
                logger.info(f"CUDA device ('{requested_device_str}') requested and verified. Using GPU.")
                return requested_device_str # Use the specific requested CUDA device
            except Exception as e:
                logger.warning(f"Requested CUDA device '{requested_device_str}' not accessible ({e}). Checking default CUDA.")
                # Fallthrough to default CUDA check
        # If specific CUDA failed or just 'cuda' was requested:
        if torch.cuda.is_available(): # General check
             logger.info(f"CUDA device requested. Using default CUDA GPU (cuda:0).")
             return 'cuda:0' # Default to first CUDA device
        else:
            logger.warning(f"CUDA device ('{requested_device_str}') requested but NO CUDA devices are available. Falling back to CPU.")
            return 'cpu'

    elif device_selected == 'mps': # For Apple Silicon
        if torch.backends.mps.is_available() and torch.backends.mps.is_built():
            logger.info("MPS device requested and available. Using Apple Metal Performance Shaders.")
            return 'mps'
        else:
            logger.warning("MPS device requested but not available/built. Falling back to CPU.")
            return 'cpu'

    logger.info(f"CPU device selected (requested: '{requested_device_str}').")
    return 'cpu' # Default or if CPU was explicitly requested


def load_yolov5_model(model_path_or_name: str, confidence_thresh: float, iou_thresh: float, device_target_str: str) -> torch.nn.Module:
    """Loads YOLOv5 model, handling potential errors gracefully."""
    logger.info(f"Attempting to load YOLOv5 model: '{model_path_or_name}' onto device '{device_target_str}'.")
    logger.info(f"  Confidence Threshold: {confidence_thresh}, IoU Threshold: {iou_thresh}")

    # Verify model file exists if a local path is given (and not just a name like 'yolov5s')
    # This prevents torch.hub from attempting download if user provides a specific, non-existent local path.
    if os.path.sep in model_path_or_name or model_path_or_name.endswith('.pt'): # Heuristic for local path
        if not os.path.exists(model_path_or_name):
            logger.error(f"FATAL ERROR: Specified model file path does not exist: '{model_path_or_name}'")
            logger.error("  Hint: If you intended torch.hub to download a model, use its name (e.g., 'yolov5s') without path separators or '.pt' suffix.")
            sys.exit(1)
        else:
            logger.info(f"  Confirmed local model file exists at: '{model_path_or_name}'")


    try:
        model = torch.hub.load('ultralytics/yolov5', 'custom', path=model_path_or_name,
                               force_reload=False, _verbose=False, trust_repo=True) # trust_repo=True for newer torch.hub
        model.conf = confidence_thresh
        model.iou = iou_thresh
        model = model.to(device_target_str)
        model.eval()
        logger.info(f"YOLOv5 model ('{model_path_or_name}') loaded successfully on device '{device_target_str}'.")
        return model
    except Exception as e:
        logger.exception(f"FATAL ERROR: Failed to load YOLOv5 model '{model_path_or_name}'. Error: {e}")
        if "ailed to download" in str(e) or "urlopen error" in str(e):
             logger.error("  Hint: Model download might have failed. Check internet connection.")
        elif "checksum mismatch" in str(e):
             logger.error("  Hint: Checksum mismatch. Try deleting from torch cache (usually ~/.cache/torch/hub) and re-running.")
        elif isinstance(e, FileNotFoundError) and model_path_or_name.endswith('.pt'):
             logger.error(f"  Hint: Ensure model file '{model_path_or_name}' is present. Current SCRIPT_DIR is '{SCRIPT_DIR}'.")
        sys.exit(1)


def draw_bounding_boxes_on_frame(
    frame_to_draw_on: Any, # Typically a numpy array (OpenCV Mat)
    detections_df: pd.DataFrame,
    is_anomaly_trigger_fn: Callable[[pd.Series], bool] # A function to check if a detection row triggered the anomaly
) -> None:
    """Draws bounding boxes and labels for all detections on the frame.
    Modifies 'frame_to_draw_on' in-place.
    """
    if detections_df.empty:
        return # No detections to draw

    for _, detection_row in detections_df.iterrows():
        xmin, ymin, xmax, ymax = int(detection_row['xmin']), int(detection_row['ymin']), int(detection_row['xmax']), int(detection_row['ymax'])
        confidence = detection_row['confidence']
        name = detection_row['name']
        
        # Determine color based on whether this detection is part of the anomaly trigger
        box_color = ANOMALY_BOX_COLOR if is_anomaly_trigger_fn(detection_row) else DEFAULT_BOX_COLOR
        
        cv2.rectangle(frame_to_draw_on, (xmin, ymin), (xmax, ymax), box_color, BOX_THICKNESS)
        label = f"{name} {confidence:.2f}"
        (label_width, label_height), baseline = cv2.getTextSize(label, FONT, FONT_SCALE, FONT_THICKNESS)
        
        # Calculate label background position, ensuring it stays within frame bounds
        label_ymin_bg = max(ymin - label_height - baseline, 0)
        label_ymax_bg = ymin - baseline
        
        # Ensure x position for background doesn't go off-screen left
        label_xmin_bg = max(xmin, 0)
        
        cv2.rectangle(frame_to_draw_on, (label_xmin_bg, label_ymin_bg),
                      (label_xmin_bg + label_width, label_ymax_bg), box_color, cv2.FILLED)
        cv2.putText(frame_to_draw_on, label, (label_xmin_bg, label_ymax_bg), FONT, FONT_SCALE,
                    LABEL_TEXT_COLOR, FONT_THICKNESS, cv2.LINE_AA)


def check_anomaly_rules(all_detections_df: pd.DataFrame) -> Tuple[bool, int, List[Dict[str, Any]]]:
    """Applies current anomaly rules (e.g., person count) and returns detailed findings."""
    triggering_objects_list: List[Dict[str, Any]] = []
    
    # Rule: Count of TARGET_CLASS_NAME exceeds MAX_ALLOWED_TARGETS
    specific_class_detections = all_detections_df[all_detections_df['name'] == TARGET_CLASS_NAME]
    count_of_target_class = len(specific_class_detections)
    
    anomaly_is_triggered = count_of_target_class > MAX_ALLOWED_TARGETS
    
    if anomaly_is_triggered:
        logger.info(f"  Anomaly rule triggered: Found {count_of_target_class} '{TARGET_CLASS_NAME}' (max allowed: {MAX_ALLOWED_TARGETS}).")
        for _, detection_row in specific_class_detections.iterrows():
            triggering_objects_list.append({
                "class_name": str(detection_row['name']),
                "confidence": round(float(detection_row['confidence']), 4), # Ensure float and round
                "xmin": int(detection_row['xmin']),
                "ymin": int(detection_row['ymin']),
                "xmax": int(detection_row['xmax']),
                "ymax": int(detection_row['ymax']),
            })
    else:
        logger.debug(f"  No anomaly for rule: Found {count_of_target_class} '{TARGET_CLASS_NAME}' (max allowed: {MAX_ALLOWED_TARGETS}).")
            
    return anomaly_is_triggered, count_of_target_class, triggering_objects_list


def save_processed_frame(frame_mat: Any, output_dir: Path, frame_idx: int, timestamp_ms_val: float) -> Optional[str]:
    """Saves the processed (potentially annotated) frame image."""
    try:
        # Ensure output directory exists
        output_dir.mkdir(parents=True, exist_ok=True)
        # Create a more structured filename (padded for sorting, includes timestamp for uniqueness)
        unique_filename = f"processed_frame_{frame_idx:06d}_{int(timestamp_ms_val):010d}.jpg"
        full_save_path = output_dir / unique_filename
        
        # JPEG quality (0-100, higher is better quality/larger file)
        jpeg_quality_params = [cv2.IMWRITE_JPEG_QUALITY, 90]
        
        write_success = cv2.imwrite(str(full_save_path), frame_mat, jpeg_quality_params)
        
        if write_success:
            logger.info(f"  Successfully saved frame: {str(full_save_path)}")
            return unique_filename # Return only the filename for JSON payload
        else:
            logger.warning(f"  cv2.imwrite failed to save frame to '{str(full_save_path)}'. Possible permission/disk space issue.")
            return None
    except Exception as e:
        logger.exception(f"  Exception during frame saving to '{str(output_dir)}': {e}")
        return None


def process_video_stream(
    video_input_path_str: str,
    frame_output_dir_str: str,
    yolo_model_instance: torch.nn.Module,
    compute_device_str: str,
    processing_sample_rate: int
) -> None:
    """Main video processing loop: opens video, samples frames, infers, checks rules, draws, saves, and reports."""
    
    # Using Path objects for easier and more robust path operations
    video_input_path = Path(video_input_path_str)
    frame_output_dir_pathobj = Path(frame_output_dir_str)

    logger.info(f"Initializing video processing for: '{str(video_input_path)}'")
    logger.info(f"  Output directory for anomaly frames: '{str(frame_output_dir_pathobj)}'")
    logger.info(f"  Using compute device: '{compute_device_str}', Frame sample rate: 1/{processing_sample_rate}")

    video_capture = cv2.VideoCapture(str(video_input_path)) # cv2.VideoCapture expects string path
    if not video_capture.isOpened():
        logger.error(f"FATAL ERROR: Failed to open video file '{str(video_input_path)}'. Please check the file path and integrity.")
        sys.exit(1)

    # --- Log video properties ---
    fps = video_capture.get(cv2.CAP_PROP_FPS)
    frame_width = int(video_capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(video_capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(video_capture.get(cv2.CAP_PROP_FRAME_COUNT))
    try:
        codec_int = int(video_capture.get(cv2.CAP_PROP_FOURCC))
        codec_str = "".join([chr((codec_int >> (8 * i)) & 0xFF) for i in range(4)]).strip() if codec_int > 0 else "N/A"
    except Exception:
        codec_str = "ErrorReadingCodec"
    logger.info(f"Video Properties - Source: '{video_input_path.name}', FPS: {fps:.2f}, Resolution: {frame_width}x{frame_height}, Total Frames: {total_frames if total_frames > 0 else 'Stream/Unknown'}, Codec: {codec_str}")

    # --- Initialize loop variables ---
    current_frame_num = 0         # Increments for every frame read from video
    frames_sent_to_model = 0  # Increments only for frames actually processed
    first_anomaly_reported = False # Flag to stop after first anomaly, per barebones spec
    pipeline_start_time = time.monotonic()

    try:
        while video_capture.isOpened():
            frame_read_success, bgr_frame_original = video_capture.read()
            if not frame_read_success:
                logger.info("End of video stream reached or failed to read next frame.")
                break # Exit loop

            current_frame_num += 1

            # --- Frame Sampling Logic ---
            if current_frame_num % processing_sample_rate != 0:
                continue # Skip this frame

            frames_sent_to_model += 1
            frame_timestamp_msec = video_capture.get(cv2.CAP_PROP_POS_MSEC)

            # --- Periodic Progress Logging ---
            # Log e.g. every 20 *processed* frames (adjust multiplier as needed for verbosity)
            if frames_sent_to_model % 20 == 0:
                logger.info(f"  Processing sampled frame #{frames_sent_to_model} (original #{current_frame_num}, ~{frame_timestamp_msec:.0f}ms)...")

            # --- Convert frame for YOLO (BGR to RGB) ---
            rgb_frame = cv2.cvtColor(bgr_frame_original, cv2.COLOR_BGR2RGB)

            try:
                # --- YOLOv5 Inference ---
                # inference_start_time = time.monotonic()
                inference_results = yolo_model_instance(rgb_frame)
                # logger.debug(f"   Inference for frame #{current_frame_num} took: {(time.monotonic() - inference_start_time):.4f}s")
                
                detections_df = inference_results.pandas().xyxy[0] # Detections for current frame
                
                if detections_df.empty:
                    logger.debug(f"  No objects detected by model in frame #{current_frame_num}.")
                else:
                    logger.debug(f"  Detected {len(detections_df)} objects in frame #{current_frame_num}. Confidence values: {detections_df['confidence'].round(2).tolist()}")


                # --- Apply Anomaly Detection Rules ---
                is_anomaly_present, count_of_target_class, triggering_bboxes_data = check_anomaly_rules(detections_df)

                # --- Prepare frame for saving (draw all boxes) ---
                # We draw on a copy of the original BGR frame, not the RGB one used for inference
                annotated_bgr_frame = bgr_frame_original.copy()
                draw_bounding_boxes_on_frame(
                    annotated_bgr_frame,
                    detections_df,
                    is_anomaly_trigger_fn=lambda det_row: det_row['name'] == TARGET_CLASS_NAME and is_anomaly_present
                )

                # --- If Anomaly Detected, Save Frame and Report via JSON ---
                if is_anomaly_present and not first_anomaly_reported:
                    first_anomaly_reported = True # Prevent multiple JSON outputs for this video
                    logger.warning(f"ANOMALY CONFIRMED: Frame #{current_frame_num} (~{frame_timestamp_msec:.0f}ms). Details below.")
                    logger.warning(f"  Rule: Found {count_of_target_class} instance(s) of '{TARGET_CLASS_NAME}', exceeding limit of {MAX_ALLOWED_TARGETS}.")

                    name_of_saved_frame = save_processed_frame(
                        annotated_bgr_frame, frame_output_dir_pathobj, current_frame_num, frame_timestamp_msec
                    )

                    if name_of_saved_frame:
                        alert_payload = {
                            "alert_type": f"ObjectCountExceeded: {TARGET_CLASS_NAME}",
                            "message": f"Detected {count_of_target_class} instance(s) of '{TARGET_CLASS_NAME}', which is > {MAX_ALLOWED_TARGETS} allowed.",
                            "frame_filename": name_of_saved_frame, # This filename is sent to Node.js
                            "details": {
                                "timestamp_ms": round(frame_timestamp_msec, 2),
                                "frame_number_original": current_frame_num, # Original frame count
                                "frame_number_processed": frames_sent_to_model, # Sampled frame count
                                "rule_config": {
                                    "target_class": TARGET_CLASS_NAME,
                                    "max_allowed": MAX_ALLOWED_TARGETS
                                },
                                "detection_summary": {
                                    "anomaly_trigger_class_count": count_of_target_class,
                                    "total_objects_detected_in_frame": len(detections_df)
                                },
                                "model_settings_used": {
                                    "confidence": float(yolo_model_instance.conf), # Ensure it's a Python float
                                    "iou": float(yolo_model_instance.iou)        # Ensure it's a Python float
                                },
                                "triggering_objects_bboxes": triggering_bboxes_data # List of dicts for triggering bboxes
                            }
                        }
                        # CRITICAL: Print JSON payload to STDOUT for Node.js backend to capture
                        print(json.dumps(alert_payload))
                    else:
                        logger.error("  Anomaly was detected, but an error occurred while saving the annotated frame. No JSON alert generated for this event.")
                    
                    logger.info("  Stopping further processing for this video as first anomaly has been reported.")
                    break # Exit the video processing loop after the first confirmed anomaly

            except Exception as frame_processing_exception:
                logger.exception(f"  UNEXPECTED ERROR during inference or rule check for frame #{current_frame_num}: {frame_processing_exception}")
                # For barebones, break on first major error within loop to prevent cascade.
                # Production systems might log and attempt to continue or implement more sophisticated recovery.
                break 
    
    finally: # This block executes whether the loop finishes normally or due to break/exception
        if video_capture.isOpened():
            video_capture.release()
            logger.info("Video capture resource released.")
    
    pipeline_end_time = time.monotonic()
    total_duration_seconds = pipeline_end_time - pipeline_start_time
    logger.info(f"Finished all processing for video: '{video_input_path.name}'.")
    logger.info(f"  Total frames read from source: {current_frame_num}")
    logger.info(f"  Frames actually sent to model (sampled): {frames_sent_to_model}")
    logger.info(f"  Total video processing duration: {total_duration_seconds:.3f} seconds.")

    if not first_anomaly_reported:
        logger.info("  No anomalies matching defined rules were detected in this video.")
    
    # Exit with 0 for successful script completion, regardless of anomaly detection.
    # Node.js relies on presence/absence of JSON on stdout for anomaly status.
    sys.exit(0)

# --- Main Script Execution Block ---
if __name__ == "__main__":
    script_lifecycle_start_time = time.monotonic()
    
    # --- Argument Parsing ---
    parser = argparse.ArgumentParser(
        description="Enhanced Anomaly Detection in video using YOLOv5. Detects anomalies, draws bounding boxes, and outputs alert data as JSON to stdout.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter # Show default values in help output
    )
    # Required arguments
    parser.add_argument("video_path", type=str, help="Full path to the input video file.")
    parser.add_argument("frame_output_dir", type=str, help="Full path to the directory where annotated anomaly frames will be saved.")
    
    # Optional arguments for model, inference, and execution control
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL_NAME_OR_PATH, 
                        help=f"YOLOv5 model name (e.g., 'yolov5s'), local .pt file path, or URL. Default tries local: {DEFAULT_MODEL_NAME_OR_PATH}")
    parser.add_argument("--conf", type=float, default=DEFAULT_CONFIDENCE_THRESHOLD, help="Object detection confidence threshold (0.0 to 1.0).")
    parser.add_argument("--iou", type=float, default=DEFAULT_IOU_THRESHOLD, help="IoU threshold for Non-Maximum Suppression (0.0 to 1.0).")
    parser.add_argument("--sample", type=int, default=DEFAULT_FRAME_SAMPLE_RATE, metavar='N', help="Frame sampling rate (process 1 out of N frames). Must be >= 1.")
    parser.add_argument("--device", type=str, default=DEFAULT_DEVICE, help="Compute device: 'cpu', 'cuda', 'cuda:0', 'mps'.")
    parser.add_argument("--log-level", type=str, default="INFO", choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'], help="Set console logging level.")

    args = parser.parse_args()
    
    # Re-configure logger based on command-line argument if provided by user
    logger = setup_logging(args.log_level)

    logger.info("--- Anomaly Detection Script Starting ---")
    logger.info(f"Invoked with resolved arguments: {vars(args)}")
    logger.info(f"Script directory (for relative model path): {SCRIPT_DIR}")


    # --- Input Validation ---
    parsed_video_path = Path(args.video_path)
    parsed_frame_output_dir = Path(args.frame_output_dir)

    # Validate video file
    if not parsed_video_path.is_file():
        logger.error(f"FATAL ERROR: Input video file not found or is not a regular file: '{str(parsed_video_path)}'")
        sys.exit(1)
    logger.info(f"Input video validated: '{str(parsed_video_path)}'")

    # Validate (and attempt to create) output directory
    if not parsed_frame_output_dir.exists():
        logger.warning(f"Frame output directory '{str(parsed_frame_output_dir)}' does not exist. Attempting to create...")
        try:
            parsed_frame_output_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Successfully created frame output directory: '{str(parsed_frame_output_dir)}'")
        except Exception as e:
            logger.error(f"FATAL ERROR: Failed to create frame output directory '{str(parsed_frame_output_dir)}': {e}")
            sys.exit(1)
    elif not parsed_frame_output_dir.is_dir():
        logger.error(f"FATAL ERROR: Specified frame output path '{str(parsed_frame_output_dir)}' exists but is not a directory.")
        sys.exit(1)
    logger.info(f"Frame output directory validated: '{str(parsed_frame_output_dir)}'")


    # Validate numerical arguments
    if args.sample < 1:
        logger.error(f"FATAL ERROR: Frame sample rate (--sample) must be 1 or greater, received: {args.sample}.")
        sys.exit(1)
    if not (0.0 <= args.conf <= 1.0):
        logger.error(f"FATAL ERROR: Confidence threshold (--conf) must be between 0.0 and 1.0, received: {args.conf}.")
        sys.exit(1)
    if not (0.0 <= args.iou <= 1.0):
        logger.error(f"FATAL ERROR: IoU threshold (--iou) must be between 0.0 and 1.0, received: {args.iou}.")
        sys.exit(1)
    
    logger.info(f"Anomaly Rule: Target Class='{TARGET_CLASS_NAME}', Max Allowed (exclusive)='{MAX_ALLOWED_TARGETS}'")

    # --- Load Model ---
    # Use the args.model which respects the user's input or the default (now SCRIPT_DIR relative)
    selected_compute_device_str = select_device(args.device)
    yolo_model_instance = load_yolov5_model(args.model, args.conf, args.iou, selected_compute_device_str)
    
    # --- Execute Main Processing Logic ---
    try:
        process_video_stream(
            str(parsed_video_path),       # Pass paths as strings, as cv2 often expects them
            str(parsed_frame_output_dir),
            yolo_model_instance,
            selected_compute_device_str,
            args.sample
        )
    except SystemExit: # Allows controlled exits from functions to propagate
        logger.info("Script exited via sys.exit().")
        raise # Re-raise to ensure script actually exits
    except KeyboardInterrupt:
        logger.warning("Processing was interrupted by user (Ctrl+C). Exiting gracefully.")
        sys.exit(130) # Standard exit code for SIGINT
    except Exception as main_execution_exception:
        logger.exception(f"CRITICAL UNHANDLED ERROR during main script execution: {main_execution_exception}")
        sys.exit(1) # General error exit code
    finally:
        script_lifecycle_end_time = time.monotonic()
        logger.info(f"--- Anomaly Detection Script Finished. Total Lifecycle Duration: {(script_lifecycle_end_time - script_lifecycle_start_time):.3f} seconds ---")