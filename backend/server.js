// backend/server.js
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs').promises
const { spawn } = require('child_process')
const db = require('./db')

const app = express()
const PORT = process.env.PORT || 3001 // Defined here

// --- Configuration ---
const UPLOAD_DIR = path.join(__dirname, 'uploads')
const FRAME_DIR = path.join(__dirname, 'frames')
const PYTHON_SCRIPT_PATH = path.join(__dirname, 'python', 'detect.py')
// Construct path to venv python executable
const VENV_PYTHON_WIN = path.join(__dirname, 'python', 'venv', 'Scripts', 'python.exe')
const VENV_PYTHON_NIX = path.join(__dirname, 'python', 'venv', 'bin', 'python')
// Select the correct path based on OS, or allow override via environment variable
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || (process.platform === 'win32' ? VENV_PYTHON_WIN : VENV_PYTHON_NIX)

// --- Middleware ---
app.use(cors()) // Allow requests from frontend origin (adjust in production)
app.use(express.json()) // Parse JSON request bodies
// Serve static frame files (allows accessing frames via URL like /frames/frame_123.jpg)
app.use('/frames', express.static(FRAME_DIR))

// --- Multer Setup (File Upload Handling) ---
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Ensure upload directory exists before saving
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
      cb(null, UPLOAD_DIR)
    } catch (err) {
      console.error('Multer destination error:', err)
      cb(err) // Pass error to multer
    }
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to prevent overwrites
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname))
  }
})
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    console.log(`Received file filter check: Original Name = ${file.originalname}, MIME Type = ${file.mimetype}`) // Log what's received
    // For curl testing, let's just accept it for now
    // In a real app, you'd want more robust checking perhaps based on extension too
    cb(null, true)
    // Original check:
    // if (file.mimetype.startsWith('video/')) {
    //   cb(null, true)
    // } else {
    //   cb(new Error(`Invalid file type (${file.mimetype}): Only video files are allowed.`), false)
    // }
  }
})

// --- Helper Functions ---
// Checks if the python script exists and is executable (basic check)
async function ensurePythonScriptExists () {
  try {
    await fs.access(PYTHON_SCRIPT_PATH, fs.constants.X_OK) // Check execute permission
    return true
  } catch (error) {
    // If execute permission check fails (common on Windows or if not set), fall back to read check
    try {
      await fs.access(PYTHON_SCRIPT_PATH, fs.constants.R_OK)
      // *** FIX: Use backticks for template literal ***
      console.warn(`Python script at ${PYTHON_SCRIPT_PATH} is readable but maybe not executable.`)
      return true // Allow proceeding if readable
    } catch (readError) {
      // *** FIX: Use backticks for template literal ***
      console.error(`Python script not found or not readable at ${PYTHON_SCRIPT_PATH}`)
      return false
    }
  }
}

// Safely deletes a file, logging any errors
async function cleanupFile (filePath) {
  try {
    await fs.unlink(filePath)
    // *** FIX: Use backticks for template literal ***
    console.log(`Cleaned up file: ${filePath}`)
  } catch (err) {
    // Log error but don't crash server if cleanup fails
    // *** FIX: Use backticks for template literal ***
    console.error(`Failed to delete file ${filePath}: ${err.message}`)
  }
}

// --- Core API Route: Video Upload and Processing ---
app.post('/api/upload', (req, res) => {
  // Use multer middleware with custom error handling
  upload.single('video')(req, res, async (err) => {
    // Handle Multer errors (e.g., file size limit, invalid file type)
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err)
      // *** FIX: Use backticks for template literal ***
      return res.status(400).json({ error: `File upload error: ${err.message}` })
    } else if (err) {
      // Handle other potential errors during upload setup
      console.error('Unknown upload error:', err)
      return res.status(500).json({ error: 'An unexpected error occurred during upload.' })
    }

    // Proceed if upload middleware succeeded
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded.' })
    }

    const videoPath = req.file.path
    console.log(`Received video: ${videoPath}`) // This one was correct

    if (!await ensurePythonScriptExists()) {
      await cleanupFile(videoPath)
      return res.status(500).json({ error: 'Detection script not found or accessible on server.' })
    }

    // Ensure frame directory exists before calling python
    try {
      await fs.mkdir(FRAME_DIR, { recursive: true })
    } catch (mkdirErr) {
      console.error(`Failed to ensure frame directory ${FRAME_DIR}:`, mkdirErr) // This one was correct
      await cleanupFile(videoPath)
      return res.status(500).json({ error: 'Could not prepare frame storage.' })
    }

    // *** FIX: Use backticks for template literal *** (though these were likely correct already, good practice to ensure)
    console.log(`Executing: ${PYTHON_EXECUTABLE} ${PYTHON_SCRIPT_PATH} ${videoPath} ${FRAME_DIR}`)
    const pythonProcess = spawn(PYTHON_EXECUTABLE, [PYTHON_SCRIPT_PATH, videoPath, FRAME_DIR])

    let scriptOutput = ''
    let errorOutput = ''

    pythonProcess.stdout.on('data', (data) => { scriptOutput += data.toString() })
    pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString() })

    pythonProcess.on('close', async (code) => {
      // *** FIX: Use backticks for template literal *** (though this was likely correct already)
      console.log(`Python script [${path.basename(videoPath)}] exited with code ${code}`)
      // *** FIX: Use backticks for template literal *** (though this was likely correct already)
      if (errorOutput) console.error(`Python stderr:\n${errorOutput}`)
      // *** FIX: Use backticks for template literal *** (though this was likely correct already)
      if (scriptOutput) console.log(`Python stdout:\n${scriptOutput}`)

      // Always cleanup uploaded video
      await cleanupFile(videoPath)

      if (code !== 0) {
        return res.status(500).json({ error: 'Video processing script failed.', details: errorOutput || 'Script exited with non-zero code but no stderr output.' })
      }

      // Process successful output
      try {
        const lines = scriptOutput.split('\n')
        // Find the first line that looks like a valid JSON object
        const jsonLine = lines.find(line => line.trim().startsWith('{') && line.trim().endsWith('}'))

        if (!jsonLine) {
          console.log('No JSON alert data found in script output.')
          // Send success even if no anomaly, script finished correctly
          return res.status(200).json({ message: 'Video processed successfully, no anomalies detected (or no JSON output).' })
        }

        const alertData = JSON.parse(jsonLine)
        console.log('Parsed alert data:', alertData)

        // Validate required fields before DB insert
        if (alertData.alert_type && alertData.message && alertData.frame_filename) {
          const frameKey = alertData.frame_filename
          const detailsJson = alertData.details ? JSON.stringify(alertData.details) : null
          const insertQuery = 'INSERT INTO alerts (alert_type, message, frame_storage_key, details) VALUES ($1, $2, $3, $4) RETURNING id'

          try {
            const dbResult = await db.query(insertQuery, [alertData.alert_type, alertData.message, frameKey, detailsJson])
            // *** FIX: Use backticks for template literal ***
            console.log(`Alert inserted with ID: ${dbResult.rows[0].id}`)
            // Add frameUrl for potential frontend use
            // *** FIX: Use backticks for template literal ***
            alertData.frameUrl = `/frames/${frameKey}`
            return res.status(201).json({ message: 'Anomaly detected and alert created!', alert: alertData })
          } catch (dbError) {
            console.error('Database insertion error:', dbError)
            // Provide more specific feedback if possible (e.g., unique constraint violation)
            if (dbError.code === '23505') { // Unique violation (e.g., frame_storage_key)
              return res.status(409).json({ error: 'Database error: Duplicate frame key detected.', details: dbError.detail })
            }
            return res.status(500).json({ error: 'Database error while saving alert.' })
          }
        } else {
          console.warn('JSON output from script missing required fields (alert_type, message, frame_filename).')
          return res.status(200).json({ message: 'Video processed, but output format was invalid.' })
        }
      } catch (parseOrDbError) {
        console.error('Failed to parse Python script output or save to DB:', parseOrDbError)
        return res.status(500).json({ error: 'Failed to process detection results.', details: scriptOutput })
      }
    }) // End of 'close' event handler

    pythonProcess.on('error', async (err) => {
      console.error('Failed to start Python process:', err)
      await cleanupFile(videoPath) // Attempt cleanup even if process didn't start
      return res.status(500).json({ error: 'Failed to start video processing script.' })
    }) // End of 'error' event handler
  }) // End of multer middleware callback
}) // End of POST /api/upload

// --- Simple Root Route ---
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Anomaly Detection Backend (Barebones) is running!' })
})

// --- Error Handling Middleware (Keep these last) ---
// 404 Handler
app.use((req, res, next) => {
  // *** FIX: Use backticks for template literal ***
  res.status(404).json({ error: `Not Found - ${req.originalUrl}` })
})

// General Error Handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack || err.message || err)
  // Avoid leaking stack trace in production
  const errorResponse = { error: err.message || 'Internal Server Error' }
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack
  }
  res.status(err.status || 500).json(errorResponse)
})

// --- Start Server Function ---
async function startServer () {
  try {
    // Ensure essential directories exist before starting
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    await fs.mkdir(FRAME_DIR, { recursive: true })
    // *** FIX: Use backticks for template literals ***
    console.log(`Upload directory: ${UPLOAD_DIR}`)
    // *** FIX: Use backticks for template literals ***
    console.log(`Frame directory: ${FRAME_DIR}`)

    // Check DB connection before listening
    if (await db.checkConnection()) {
      // *** FIX: Ensure app.listen uses PORT and has the correct callback structure ***
      app.listen(PORT, () => { // Pass PORT to app.listen
        // *** FIX: Use backticks for template literal ***
        console.log(`Server listening on http://localhost:${PORT}`)
      })
    } else {
      throw new Error('Database connection failed on startup.')
    }
  } catch (error) {
    console.error('FATAL: Server failed to start.', error)
    process.exit(1) // Exit if essential setup fails
  }
}

// --- Initiate Server Start ---
startServer()

module.exports = app // Export for potential testing
