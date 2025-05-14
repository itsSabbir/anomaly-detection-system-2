// backend/server.js
console.log('### Top of server.js execution ###') // Strings to single quotes
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs').promises
const { spawn } = require('child_process')
const db = require('./db')

console.log('### server.js __dirname is:', __dirname)

const app = express()
const PORT = process.env.PORT || 3001

// --- Configuration ---
const UPLOAD_DIR = path.join(__dirname, 'uploads')
const FRAME_DIR = path.join(__dirname, 'frames')
const PYTHON_SCRIPT_PATH = path.join(__dirname, 'python', 'detect.py')
// Default to using python from a venv inside backend/, otherwise fallback to env var or system 'python3'
const VENV_PYTHON_PATH = path.join(__dirname, 'venv', 'bin', 'python') // Standard for Linux/macOS venv
let PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || 'python3' // Default to python3
// Synchronous check for venv python, update if found.
try {
  fs.accessSync(VENV_PYTHON_PATH, fs.constants.X_OK) // Check if path exists and is executable
  PYTHON_EXECUTABLE = VENV_PYTHON_PATH
  console.log(`Python executable determined by venv path: ${PYTHON_EXECUTABLE}`)
} catch (err) {
  // VENV_PYTHON_PATH doesn't exist or isn't executable, stick with default or env var.
  console.log(`Venv Python path (${VENV_PYTHON_PATH}) not found or not executable. Using: ${PYTHON_EXECUTABLE}`)
}

// --- Middleware ---
app.use(cors()) // Consider more restrictive CORS for production
app.use(express.json()) // For parsing application/json

// --- Serve Static Frame Files ---
console.log(`### Express static serving path for frames: ${FRAME_DIR}`)
app.use('/frames', express.static(FRAME_DIR))

// --- API Routes (Specific API routes should come BEFORE general static serving & SPA fallback) ---

// --- API Health Check / Status Route ---
app.get('/api/status', (req, res) => {
  console.log('### GET /api/status - Request received')
  res.status(200).json({ message: 'Anomaly Detection Backend API is running!' })
})

// --- Core API Route: Video Upload and Processing ---
// PASTE YOUR ENTIRE, WORKING '/api/upload' ROUTE HANDLER BLOCK HERE
// It starts with app.post('/api/upload', (req, res) => { ... upload.single('video')(req, res, async (err) => { ... }); });
// Make sure this whole block is exactly as it was when it was working perfectly.
// For brevity, I am not re-pasting your entire multi-hundred-line upload handler here.
// Example structure:
app.post('/api/upload', (req, res) => {
  // ... (your entire multer setup and python process spawning logic)
  // Ensure it correctly returns JSON like:
  // On success with anomaly: { message: "...", anomaly_detected: true, alert: { id: ..., ... } }
  // On success without anomaly: { message: "...", anomaly_detected: false }
  // On error: { error: "..." }
  // Keep this exactly as it was when you confirmed the full EC2 pipeline was working with "Definitive detect.py"
  upload.single('video')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer error during upload.single:', err)
      return res.status(400).json({ error: `File upload error: ${err.message}` })
    } else if (err) {
      console.error('Unknown error during multer processing in upload.single:', err)
      return res.status(500).json({ error: 'An unexpected error occurred during upload initialization.' })
    }

    if (!req.file) {
      console.warn('Attempted upload with no file attached.')
      return res.status(400).json({ error: 'No video file uploaded.' })
    }

    const videoPath = req.file.path
    console.log(`Received video for processing: ${videoPath} (Original: ${req.file.originalname})`)

    if (!await ensurePythonScriptExists()) { // ensurePythonScriptExists() must be defined elsewhere
      await cleanupFile(videoPath) // cleanupFile() must be defined elsewhere
      return res.status(500).json({ error: 'Detection script not found or accessible on server.' })
    }

    try {
      await fs.mkdir(FRAME_DIR, { recursive: true }) // FRAME_DIR must be defined
    } catch (mkdirErr) {
      console.error(`Failed to ensure frame directory ${FRAME_DIR} exists:`, mkdirErr)
      await cleanupFile(videoPath)
      return res.status(500).json({ error: 'Could not prepare frame storage directory.' })
    }

    const pythonArgs = [PYTHON_SCRIPT_PATH, videoPath, FRAME_DIR] // These consts must be defined
    console.log(`Executing Python script: ${PYTHON_EXECUTABLE} ${pythonArgs.join(' ')}`) // PYTHON_EXECUTABLE must be defined
    const pythonProcess = spawn(PYTHON_EXECUTABLE, pythonArgs)

    let scriptOutput = ''
    let errorOutput = ''

    pythonProcess.stdout.on('data', (data) => { scriptOutput += data.toString() })
    pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString() })

    pythonProcess.on('close', async (code) => {
      const videoBasename = path.basename(videoPath)
      console.log(`Python script [${videoBasename}] exited with code ${code}`)
      if (errorOutput) console.error(`Python stderr [${videoBasename}]:\n${errorOutput}`)
      if (scriptOutput) console.log(`Python stdout [${videoBasename}]:\n${scriptOutput}`)

      await cleanupFile(videoPath)

      if (code !== 0) {
        return res.status(500).json({
          error: 'Video processing script failed.',
          details: errorOutput || `Script exited with non-zero code (${code}) but no specific stderr output.`
        })
      }

      try {
        const lines = scriptOutput.trim().split('\n')
        const jsonLine = lines.find(line => line.trim().startsWith('{') && line.trim().endsWith('}'))

        if (!jsonLine) {
          console.log(`No valid JSON alert data found in Python script output for [${videoBasename}].`)
          return res.status(200).json({
            message: 'Video processed successfully. No anomalies detected or reported by script.',
            anomaly_detected: false
          })
        }

        const alertData = JSON.parse(jsonLine)
        console.log(`Parsed alert data from Python for [${videoBasename}]:`, alertData)

        if (alertData.alert_type && alertData.message && alertData.frame_filename && alertData.details) {
          const frameKey = alertData.frame_filename
          const detailsJsonString = JSON.stringify(alertData.details)
          const insertQuery = 'INSERT INTO alerts (alert_type, message, frame_storage_key, details) VALUES ($1, $2, $3, $4) RETURNING id'

          try {
            const dbResult = await db.query(insertQuery, [alertData.alert_type, alertData.message, frameKey, detailsJsonString])
            const insertedId = dbResult.rows[0].id
            console.log(`Alert [ID: ${insertedId}] successfully inserted into database for [${videoBasename}].`)

            const responseAlertData = { ...alertData, id: insertedId, frameUrl: `/frames/${frameKey}` }

            return res.status(201).json({
              message: 'Anomaly detected and alert created!',
              anomaly_detected: true,
              alert: responseAlertData
            })
          } catch (dbError) {
            console.error(`Database insertion error for [${videoBasename}]:`, dbError)
            if (dbError.code === '23505') {
              return res.status(409).json({ error: 'Database error: This frame may have already been processed or a unique key conflict occurred.', details: dbError.detail })
            }
            return res.status(500).json({ error: 'Database error while saving alert information.' })
          }
        } else {
          console.warn(`JSON output from Python script for [${videoBasename}] was missing required fields (alert_type, message, frame_filename, details). Output: ${jsonLine}`)
          return res.status(200).json({
            message: 'Video processed, but the output format from the detection script was invalid or incomplete.',
            anomaly_detected: false
          })
        }
      } catch (parseOrProcessingError) {
        console.error(`Error parsing Python script output or processing results for [${videoBasename}]:`, parseOrProcessingError)
        return res.status(500).json({ error: 'Failed to process detection results from script.', details: scriptOutput })
      }
    })

    pythonProcess.on('error', async (err) => {
      console.error(`Failed to start Python process for [${path.basename(videoPath)}]:`, err)
      await cleanupFile(videoPath)
      return res.status(500).json({ error: 'Internal server error: Failed to start video processing script.' })
    })
  })
})
// END OF /api/upload ROUTE - Ensure this matches your working version

// --- NEW API Route: Get Specific Alert Details by ID ---
app.get('/api/alerts/:id', async (req, res) => {
  // Validate and parse the alert ID from the request parameters
  const alertIdParam = req.params.id
  const alertId = parseInt(alertIdParam, 10) // Base 10 for parsing

  console.log(`### GET /api/alerts/${alertIdParam} - Request received for alert ID.`)

  // Check if parsing resulted in a valid number and it's positive
  if (isNaN(alertId) || alertId <= 0) {
    console.warn(`Invalid alert ID format requested: '${alertIdParam}'. Parsed as: ${alertId}`)
    return res.status(400).json({ error: 'Invalid alert ID format. Must be a positive integer.' })
  }

  try {
    // SQL query to fetch the specific alert by its ID
    // Assuming your 'alerts' table has these columns based on previous discussions.
    // The 'details' column is JSONB and will be automatically parsed into a JS object by the 'pg' driver.
    const queryText = `
      SELECT 
        id, 
        alert_type, 
        message, 
        frame_storage_key, 
        details,  -- This is the JSONB column
        created_at 
      FROM alerts 
      WHERE id = $1;
    `

    const { rows } = await db.query(queryText, [alertId])

    // Check if an alert was found
    if (rows.length === 0) {
      console.warn(`No alert found with ID: ${alertId}`)
      return res.status(404).json({ error: `Alert with ID ${alertId} not found.` })
    }

    // The first row (and only row, since ID is primary key) contains our alert data
    const alertDataFromDb = rows[0]

    // Construct a frameUrl that the frontend can use to display the image.
    // This assumes your server is configured to serve static files from '/frames/'
    // and `frame_storage_key` is just the filename (e.g., "annotated_frame_123_456.jpg").
    alertDataFromDb.frameUrl = `/frames/${alertDataFromDb.frame_storage_key}`

    console.log(`Successfully fetched and prepared alert details for ID ${alertId}.`)
    // console.debug("Alert data being sent to client:", alertDataFromDb); // Optional: for detailed debugging

    // Send the alert data back to the client
    res.status(200).json(alertDataFromDb)
  } catch (dbError) {
    console.error(`Database error while fetching alert ID ${alertId}:`, dbError)
    // Avoid sending detailed DB errors to client in production
    res.status(500).json({ error: 'An internal server error occurred while fetching alert details.' })
  }
})

// END OF NEW API Route

// --- Multer Setup (Define before use in routes) ---
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
      cb(null, UPLOAD_DIR)
    } catch (err) {
      console.error('Multer destination setup error:', err)
      cb(err) // Pass error to multer's error handling
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `video-${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit
  fileFilter: (req, file, cb) => {
    console.log(`File filter check for multer: Original Name = ${file.originalname}, MIME Type = ${file.mimetype}`)
    if (file.mimetype.startsWith('video/')) {
      cb(null, true) // Accept file
    } else {
      console.warn(`Rejected file due to invalid MIME type: ${file.mimetype}`)
      cb(new Error('Invalid file type. Only video files are accepted.'), false) // Reject file
    }
  }
})

// --- Helper Functions ---
async function ensurePythonScriptExists () {
  try {
    await fs.access(PYTHON_SCRIPT_PATH)
    return true
  } catch (error) {
    console.error(`Python script check failed: Not found or not accessible at ${PYTHON_SCRIPT_PATH}. Error: ${error.message}`)
    return false
  }
}

async function cleanupFile (filePath) {
  try {
    // Check if file exists before unlinking to prevent error if already deleted
    if (filePath && await fs.access(filePath).then(() => true).catch(() => false)) {
      await fs.unlink(filePath)
      console.log(`Successfully cleaned up temporary file: ${filePath}`)
    } else if (filePath) {
      console.log(`File for cleanup not found (already deleted or never created): ${filePath}`)
    }
  } catch (err) {
    console.error(`Error during cleanup of file ${filePath}: ${err.message}`)
  }
}

// --- Core API Route: Video Upload and Processing ---
app.post('/api/upload', (req, res) => {
  upload.single('video')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer error during upload.single:', err)
      return res.status(400).json({ error: `File upload error: ${err.message}` })
    } else if (err) {
      console.error('Unknown error during multer processing in upload.single:', err)
      return res.status(500).json({ error: 'An unexpected error occurred during upload initialization.' })
    }

    if (!req.file) {
      console.warn('Attempted upload with no file attached.')
      return res.status(400).json({ error: 'No video file uploaded.' })
    }

    const videoPath = req.file.path
    console.log(`Received video for processing: ${videoPath} (Original: ${req.file.originalname})`)

    if (!await ensurePythonScriptExists()) {
      await cleanupFile(videoPath)
      return res.status(500).json({ error: 'Detection script not found or accessible on server.' })
    }

    try {
      await fs.mkdir(FRAME_DIR, { recursive: true })
    } catch (mkdirErr) {
      console.error(`Failed to ensure frame directory ${FRAME_DIR} exists:`, mkdirErr)
      await cleanupFile(videoPath)
      return res.status(500).json({ error: 'Could not prepare frame storage directory.' })
    }

    const pythonArgs = [PYTHON_SCRIPT_PATH, videoPath, FRAME_DIR]
    console.log(`Executing Python script: ${PYTHON_EXECUTABLE} ${pythonArgs.join(' ')}`)
    const pythonProcess = spawn(PYTHON_EXECUTABLE, pythonArgs)

    let scriptOutput = ''
    let errorOutput = ''

    pythonProcess.stdout.on('data', (data) => { scriptOutput += data.toString() })
    pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString() })

    pythonProcess.on('close', async (code) => {
      const videoBasename = path.basename(videoPath)
      console.log(`Python script [${videoBasename}] exited with code ${code}`)
      if (errorOutput) console.error(`Python stderr [${videoBasename}]:\n${errorOutput}`)
      if (scriptOutput) console.log(`Python stdout [${videoBasename}]:\n${scriptOutput}`)

      await cleanupFile(videoPath)

      if (code !== 0) {
        return res.status(500).json({
          error: 'Video processing script failed.',
          details: errorOutput || `Script exited with non-zero code (${code}) but no specific stderr output.`
        })
      }

      try {
        const lines = scriptOutput.trim().split('\n')
        const jsonLine = lines.find(line => line.trim().startsWith('{') && line.trim().endsWith('}'))

        if (!jsonLine) {
          console.log(`No valid JSON alert data found in Python script output for [${videoBasename}].`)
          return res.status(200).json({
            message: 'Video processed successfully. No anomalies detected or reported by script.',
            anomaly_detected: false
          })
        }

        const alertData = JSON.parse(jsonLine)
        console.log(`Parsed alert data from Python for [${videoBasename}]:`, alertData)

        if (alertData.alert_type && alertData.message && alertData.frame_filename && alertData.details) {
          const frameKey = alertData.frame_filename
          const detailsJsonString = JSON.stringify(alertData.details)
          const insertQuery = 'INSERT INTO alerts (alert_type, message, frame_storage_key, details) VALUES ($1, $2, $3, $4) RETURNING id'

          try {
            const dbResult = await db.query(insertQuery, [alertData.alert_type, alertData.message, frameKey, detailsJsonString])
            const insertedId = dbResult.rows[0].id
            console.log(`Alert [ID: ${insertedId}] successfully inserted into database for [${videoBasename}].`)

            const responseAlertData = { ...alertData, id: insertedId, frameUrl: `/frames/${frameKey}` }

            return res.status(201).json({
              message: 'Anomaly detected and alert created!',
              anomaly_detected: true,
              alert: responseAlertData
            })
          } catch (dbError) {
            console.error(`Database insertion error for [${videoBasename}]:`, dbError)
            if (dbError.code === '23505') {
              return res.status(409).json({ error: 'Database error: This frame may have already been processed or a unique key conflict occurred.', details: dbError.detail })
            }
            return res.status(500).json({ error: 'Database error while saving alert information.' })
          }
        } else {
          console.warn(`JSON output from Python script for [${videoBasename}] was missing required fields (alert_type, message, frame_filename, details). Output: ${jsonLine}`)
          return res.status(200).json({
            message: 'Video processed, but the output format from the detection script was invalid or incomplete.',
            anomaly_detected: false
          })
        }
      } catch (parseOrProcessingError) {
        console.error(`Error parsing Python script output or processing results for [${videoBasename}]:`, parseOrProcessingError)
        return res.status(500).json({ error: 'Failed to process detection results from script.', details: scriptOutput })
      }
    })

    pythonProcess.on('error', async (err) => {
      console.error(`Failed to start Python process for [${path.basename(videoPath)}]:`, err)
      await cleanupFile(videoPath)
      return res.status(500).json({ error: 'Internal server error: Failed to start video processing script.' })
    })
  })
})

// --- SERVE STATIC FRONTEND FILES ---
const frontendDistPath = path.join(__dirname, '../frontend/dist')
console.log(`### Attempting to serve static frontend from: ${frontendDistPath}`)
app.use(express.static(frontendDistPath))

// --- SPA FALLBACK (Client-Side Routing Support) ---
const spaFallbackPath = path.join(frontendDistPath, 'index.html')
console.log(`### SPA Fallback configured to serve: ${spaFallbackPath}`)
app.get(/^(?!\/api|\/frames).*$/, (req, res, next) => {
  console.log(`### SPA Fallback triggered for path: ${req.path}. Attempting to send index.html.`)
  res.sendFile(spaFallbackPath, (err) => {
    if (err) {
      console.error(`### Error sending SPA fallback file (${spaFallbackPath}) for ${req.path}:`, err)
      if (err.code === 'ENOENT') {
        res.status(404).send('Frontend application not found on server.')
      } else {
        next(err)
      }
    }
  })
})

// --- Error Handling Middleware (These should be LAST) ---
app.use((req, res, next) => {
  console.log(`### Final 404 Handler reached for: ${req.originalUrl}`)
  res.status(404).json({ error: `Not Found - The requested resource ${req.originalUrl} does not exist.` })
})

app.use((err, req, res, next) => {
  console.error('Unhandled Error Caught by Final General Handler:', err.stack || err.message || err)
  const errorResponse = { error: err.message || 'Internal Server Error' }
  if (process.env.NODE_ENV !== 'production') { // Show stack only in dev
    errorResponse.stack = err.stack // Corrected to only add stack if in non-production
  }
  res.status(err.status || 500).json(errorResponse)
})

// --- Start Server Function ---
async function startServer () {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    await fs.mkdir(FRAME_DIR, { recursive: true })
    console.log(`Upload directory initialized: ${UPLOAD_DIR}`)
    console.log(`Frame directory initialized: ${FRAME_DIR}`)
    console.log(`Python executable set to: ${PYTHON_EXECUTABLE}`)

    if (await db.checkConnection()) {
      app.listen(PORT, () => {
        console.log(`Server successfully started and listening on http://localhost:${PORT}`)
        console.log(`To access externally (if deployed & firewall configured): http://<YOUR_EC2_PUBLIC_IP>:${PORT}`)
      })
    } else {
      throw new Error('Database connection check failed. Server cannot start reliably.')
    }
  } catch (error) {
    console.error('FATAL: Server failed to start due to an unrecoverable error:', error)
    process.exit(1)
  }
}

// Initiate Server Start
startServer()

module.exports = app // Export 'app' for potential testing
