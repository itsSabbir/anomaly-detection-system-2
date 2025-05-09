// backend/routes/alertRoutes.js
const express = require('express')
const alertController = require('../controllers/alertController') // We will create this next

const router = express.Router()

// --- Alert Routes ---

// GET /api/alerts - Retrieve a list of alerts
// Query Params:
//   search?: string - Filter alerts by message or type (implement later)
//   limit?: number - Limit number of results (default 100)
//   offset?: number - Offset for pagination (default 0)
//   sortBy?: string - Field to sort by (default 'timestamp')
//   sortOrder?: 'ASC' | 'DESC' - Sort order (default 'DESC')
router.get('/', alertController.listAlerts)

// GET /api/alerts/:id - Retrieve details for a specific alert
// Includes pre-signed URL for the associated frame
router.get('/:id', alertController.getAlertById)

// POST /api/alerts - (Internal Use Primarily) Create a new alert
// This route might not be directly called by the frontend, but used internally
// after ML processing. We can define it for completeness or testing.
// router.post('/', alertController.createAlert); // Uncomment if needed

// DELETE /api/alerts/:id - (Optional) Delete an alert
// router.delete('/:id', alertController.deleteAlert); // Uncomment if needed

// --- Module Exports ---
module.exports = router
