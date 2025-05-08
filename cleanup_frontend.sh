#!/bin/bash

# --- Production-Quality Barebones Frontend Cleanup Script ---
# This script removes default Vite template files that are not strictly
# necessary for a minimal React + MUI + TypeScript + Axios upload application.
# RUN THIS FROM THE PROJECT ROOT (e.g., anomaly-detection-system-2)
# WARNING: This script performs deletions. Ensure you have committed any work you want to save.

FRONTEND_DIR="./frontend"

echo "Starting cleanup of frontend directory: ${FRONTEND_DIR}"

# Safety check: Ensure we are in a directory that contains frontend/
if [ ! -d "${FRONTEND_DIR}" ]; then
    echo "ERROR: Could not find '${FRONTEND_DIR}' directory from current location ($(pwd))."
    echo "Please run this script from the project root."
    exit 1
fi

# Files and directories to remove (relative to FRONTEND_DIR)
TARGETS=(
    "src/App.css"
    "src/index.css"
    "src/assets" # Removes the entire assets folder and its contents
    "public/vite.svg"
    # "public/react.svg" # react.svg is usually in src/assets which is already targeted
    # "README.md" # Vite sometimes adds a README here, root README is preferred
)

# Optional: If a README.md specific to frontend exists and is not wanted
if [ -f "${FRONTEND_DIR}/README.md" ]; then
    echo "Removing ${FRONTEND_DIR}/README.md (project root README.md is preferred)"
    rm -f "${FRONTEND_DIR}/README.md"
fi


for target in "${TARGETS[@]}"; do
    path_to_remove="${FRONTEND_DIR}/${target}"
    if [ -f "$path_to_remove" ]; then
        echo "Removing file: $path_to_remove"
        rm -f "$path_to_remove"
    elif [ -d "$path_to_remove" ]; then
        echo "Removing directory: $path_to_remove"
        rm -rf "$path_to_remove" # Use -rf for directories
    else
        echo "Skipping (not found): $path_to_remove"
    fi
done

echo ""
echo "Checking for empty default import in src/main.tsx (related to index.css)"
MAIN_TSX_PATH="${FRONTEND_DIR}/src/main.tsx"
if [ -f "$MAIN_TSX_PATH" ]; then
    # Remove line 'import './index.css'' if present using sed
    # This command works on Linux/macOS sed. For MinGW's sed, syntax might differ slightly.
    # Making a backup first (though git is better)
    cp "$MAIN_TSX_PATH" "$MAIN_TSX_PATH.bak"
    sed -i "/import '\.\/index.css';/d" "$MAIN_TSX_PATH"
    sed -i "/import '\.\/App.css';/d" "${FRONTEND_DIR}/src/App.tsx" # Also check App.tsx for App.css
    echo "Removed default CSS imports from main.tsx and App.tsx (if they existed)."
    echo "Backup of main.tsx created as main.tsx.bak (review and delete if ok)."
else
    echo "Warning: ${MAIN_TSX_PATH} not found."
fi

echo ""
echo "Cleanup script finished."
echo "Review remaining files in ${FRONTEND_DIR}/src/ and ${FRONTEND_DIR}/public/."
echo "You should generally keep:"
echo "  - public/index.html (Vite modifies this if you add favicon.ico for example)"
echo "  - src/App.tsx (will be replaced with our content)"
echo "  - src/main.tsx (will be replaced with our content)"
echo "  - src/vite-env.d.ts"
echo "  - tsconfig.json, tsconfig.node.json, vite.config.ts"
echo "  - package.json, package-lock.json, eslint.config.js, .gitignore"
echo ""
echo "Next step: Populate src/ with the correct files for the minimal app."