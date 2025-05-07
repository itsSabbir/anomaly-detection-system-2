#!/bin/bash

# ==============================================================================
# DETAILED Test Script for Anomaly Detection Backend Pipeline
# ==============================================================================
#
# Project: Anomaly Detection System 2 (Barebones ML Pipeline)
# Author: [Your Name]
# Date: $(date +'%Y-%m-%d')
#
# Purpose:
#   This script provides a detailed, automated test of the core backend
#   functionality: uploading a video file to the /api/upload endpoint.
#   It captures and logs various outputs for evaluation and debugging.
#   It assumes the backend Node.js server is ALREADY RUNNING separately.
#
# Prerequisites:
#   1. Node.js Backend Server: MUST be running on localhost:3001 before
#      executing this script. Start it in a separate terminal using:
#      `cd backend && npm run dev`
#      RECOMMENDED: Capture server logs to a file while it runs:
#      `cd backend && npm run dev > ../backend_server.log 2>&1`
#   2. Test Video: A file named 'video.mp4' MUST exist in the 'backend/'
#      subdirectory relative to this script's location (project root).
#   3. Tools: `curl` must be installed and available in the PATH.
#      `jq` (optional) provides pretty-printed JSON output in the console.
#
# Usage:
#   Run this script from the project's ROOT directory:
#   ./test_pipeline_detailed.sh
#
# Output Files Generated in Project Root:
#   - backend_server.log: (Manual) Recommended log file for the Node.js server output.
#   - test_run_$(timestamp).log: Captures all console output from THIS script execution.
#   - test_curl_verbose_$(timestamp).log: Detailed verbose output from curl, including headers.
#   - test_response_body_$(timestamp).json: The JSON body returned by the API.
#   - test_response_status_$(timestamp).txt: The HTTP status code returned by the API.
#
# ==============================================================================

# --- Script Configuration ---
readonly SCRIPT_NAME=$(basename "$0")
readonly TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
readonly BACKEND_API_URL="http://localhost:3001/api/upload"
readonly VIDEO_FILE_REL_PATH="backend/video.mp4" # Relative to project root
readonly SCRIPT_LOG_FILE="test_run_${TIMESTAMP}.log"
readonly CURL_VERBOSE_LOG="test_curl_verbose_${TIMESTAMP}.log"
readonly RESPONSE_BODY_FILE="test_response_body_${TIMESTAMP}.json"
readonly STATUS_CODE_FILE="test_response_status_${TIMESTAMP}.txt"

# --- Logging Setup ---
# Redirect all stdout and stderr of this script to a log file AND the console
exec > >(tee "${SCRIPT_LOG_FILE}") 2>&1

# --- Helper Functions ---
print_separator() {
  echo ""
  echo "=============================================================================="
  echo ""
}

log_info() {
  echo "[$(date +'%H:%M:%S')] [INFO] $1"
}

log_success() {
  echo "[$(date +'%H:%M:%S')] [SUCCESS] $1"
}

log_warning() {
  echo "[$(date +'%H:%M:%S')] [WARN] $1"
}

log_error() {
  echo "[$(date +'%H:%M:%S')] [ERROR] $1"
}

# --- Main Script Execution ---

log_info "Starting Detailed Backend Pipeline Test: ${SCRIPT_NAME}"
log_info "Timestamp: ${TIMESTAMP}"
print_separator

# --- 1. Pre-requisite Checks ---
log_info "Phase 1: Verifying Prerequisites..."

# Check 1.1: Test Video File
log_info "Checking for test video file at '${VIDEO_FILE_REL_PATH}'..."
if [[ ! -f "${VIDEO_FILE_REL_PATH}" ]]; then
  log_error "Prerequisite Failed: Test video file not found."
  log_error "Please ensure 'video.mp4' exists in the 'backend/' directory."
  exit 1
fi
log_success "Test video file found."

# Check 1.2: Backend Server Reachability (Basic Check)
log_info "Checking backend server reachability at ${BACKEND_API_URL%/*/*} ..."
# Attempts connection, fails immediately if not listening (-f), silent (-s), max 3s timeout (--max-time)
curl -sf --max-time 3 "${BACKEND_API_URL%/*/*}/" > /dev/null # Check root path
if [[ $? -ne 0 ]]; then
  log_error "Prerequisite Failed: Backend server is not responding at ${BACKEND_API_URL%/*/*}/."
  log_error "Please ensure the server is running. Start it in another terminal:"
  log_error "  cd backend && npm run dev"
  log_error "Recommended: Capture server logs:"
  log_error "  cd backend && npm run dev > ../backend_server.log 2>&1"
  exit 1
fi
log_success "Backend server appears to be running."

# Check 1.3: Check for jq (Optional JSON formatting tool)
jq_available=false
if command -v jq &> /dev/null; then
    jq_available=true
    log_info "jq command found. JSON output will be pretty-printed."
else
    log_info "jq command not found. JSON output will be raw."
fi

print_separator

# --- 2. Execute API Call ---
log_info "Phase 2: Executing Video Upload via cURL..."
log_info "Target URL: ${BACKEND_API_URL}"
log_info "Video File: ${VIDEO_FILE_REL_PATH}"
log_info "Saving response body to: ${RESPONSE_BODY_FILE}"
log_info "Saving HTTP status code to: ${STATUS_CODE_FILE}"
log_info "Saving verbose cURL output to: ${CURL_VERBOSE_LOG}"
echo "" # Newline for readability

# Execute curl command
# -s: Silent mode (hide progress bar)
# -v: Verbose output (includes headers, connection details) redirected to stderr (2>)
# -X POST: Specify POST method
# -w "%{http_code}": Write HTTP status code to stdout AFTER request completion
# -F "video=@<path>": Send file as multipart/form-data field named "video"
# -o <file>: Write response body (JSON) to specified file
# Redirect stderr (-v output) to CURL_VERBOSE_LOG, capture stdout (-w status) into variable
http_status=$(curl -s -v \
    -X POST \
    -w "%{http_code}" \
    -F "video=@${VIDEO_FILE_REL_PATH}" \
    -o "${RESPONSE_BODY_FILE}" \
    "${BACKEND_API_URL}" \
    2> "${CURL_VERBOSE_LOG}")

# Save the captured status code
echo "${http_status}" > "${STATUS_CODE_FILE}"

log_info "cURL command executed."
print_separator

# --- 3. Analyze Results ---
log_info "Phase 3: Analyzing Results..."
echo ""
log_info "HTTP Status Code Recorded: ${http_status} (saved to ${STATUS_CODE_FILE})"

# Check if curl itself failed (status 000 usually means connection refused)
if [[ "${http_status}" == "000" ]]; then
    log_error "Test Failed: cURL reported status 000 - Could not connect to the server."
    log_error "Please verify the backend server is running and accessible at ${BACKEND_API_URL}."
    log_error "Detailed cURL attempt log saved to: ${CURL_VERBOSE_LOG}"
    exit 1
fi

# Check for successful HTTP status codes (200 OK or 201 Created)
if [[ "${http_status}" == "200" ]] || [[ "${http_status}" == "201" ]]; then
    log_success "Test Passed: API responded with success status (${http_status})."
    echo ""
    log_info "Response Body (saved to ${RESPONSE_BODY_FILE}):"
    # Display response body - use jq if available
    if [[ -f "${RESPONSE_BODY_FILE}" ]]; then
        if $jq_available; then
            jq '.' "${RESPONSE_BODY_FILE}" || cat "${RESPONSE_BODY_FILE}" # Fallback if jq fails
        else
            cat "${RESPONSE_BODY_FILE}"
        fi
        echo "" # Ensure newline after output
    else
        log_warning "Response body file (${RESPONSE_BODY_FILE}) not found or empty."
    fi

    # Interpretation Guidance
    if [[ "${http_status}" == "201" ]]; then
        log_info "Interpretation: Status 201 suggests an anomaly WAS detected and an alert WAS created in the database."
        log_info "-> Check the response body above for alert details (including 'frame_filename')."
        log_info "-> Verify the corresponding frame image exists in the 'backend/frames/' directory."
        log_info "-> Verify a new record exists in the 'alerts' table in your RDS database."
    else # Status is 200
        log_info "Interpretation: Status 200 suggests the video was processed successfully, but NO anomaly was detected according to the current rules OR the Python script output was invalid."
        log_info "-> Check the response body message above."
        log_info "-> Verify NO new frame image was saved in 'backend/frames/'."
        log_info "-> Verify NO new record was added to the 'alerts' table in RDS."
    fi
    log_info "For detailed processing steps and potential Python errors, check the backend server logs (e.g., 'backend_server.log' if you captured it)."

else
    # Handle non-success HTTP status codes (4xx, 5xx)
    log_error "Test Failed: API responded with error status (${http_status})."
    echo ""
    log_error "Error Response Body (saved to ${RESPONSE_BODY_FILE}):"
    if [[ -f "${RESPONSE_BODY_FILE}" ]]; then
        if $jq_available; then
            jq '.' "${RESPONSE_BODY_FILE}" || cat "${RESPONSE_BODY_FILE}" # Fallback
        else
            cat "${RESPONSE_BODY_FILE}"
        fi
        echo "" # Ensure newline
    else
        log_warning "Response body file (${RESPONSE_BODY_FILE}) not found or empty."
    fi
    log_error "Check the backend server logs (e.g., 'backend_server.log') for detailed error information."
    log_error "Detailed cURL attempt log (headers, connection info) saved to: ${CURL_VERBOSE_LOG}"
    exit 1 # Exit with failure code for scripting
fi

print_separator
log_info "Detailed Test Script Finished."
exit 0 # Exit successfully