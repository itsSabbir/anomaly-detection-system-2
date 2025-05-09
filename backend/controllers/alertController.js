// backend/controllers/alertController.js
const db = require('../db'); // Import the database query function
const s3Client = require('../s3Client'); // Import the configured S3 client
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

// --- Helper Function ---
// Generates a pre-signed URL for accessing an S3 object (the frame)
const generateFrameUrl = async (frameKey) => {
  if (!frameKey) {
    return null; // No frame associated with this alert
  }

  const bucketName = process.env.S3_FRAMES_BUCKET_NAME;
  if (!bucketName) {
    console.error('Error: S3_FRAMES_BUCKET_NAME environment variable is not set.');
    return null; // Cannot generate URL without bucket name
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: frameKey,
  });

  const expiration = parseInt(process.env.S3_PRESIGNED_URL_EXPIRATION || '900', 10); // Default to 15 mins

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: expiration });
    // console.log(`Generated pre-signed URL for ${frameKey}: ${signedUrl.substring(0, 100)}...`); // Debug log
    return signedUrl;
  } catch (error) {
    console.error(`Error generating pre-signed URL for key ${frameKey} in bucket ${bucketName}:`, error);
    return null; // Return null if URL generation fails
  }
};


// --- Controller Functions ---

/**
 * @description Get a list of alerts with basic details.
 * @route GET /api/alerts
 */
exports.listAlerts = async (req, res, next) => {
  // Basic implementation: Fetch latest N alerts
  // TODO: Implement pagination, filtering, sorting based on query params (req.query)
  const limit = parseInt(req.query.limit || '100', 10);
  const offset = parseInt(req.query.offset || '0', 10);
  // Basic validation for limit/offset
  if (isNaN(limit) || limit <= 0 || isNaN(offset) || offset < 0) {
      return res.status(400).json({ error: 'Invalid limit or offset parameter.' });
  }

  try {
    // Note: frame_storage_key is included but URL generation is deferred until detail view
    const queryText = `
      SELECT id, timestamp, alert_type, message, frame_storage_key
      FROM alerts
      ORDER BY timestamp DESC
      LIMIT $1 OFFSET $2
    `;
    const { rows } = await db.query(queryText, [limit, offset]);

    // Optionally get total count for pagination headers
    const countResult = await db.query('SELECT COUNT(*) FROM alerts');
    const totalCount = parseInt(countResult.rows[0].count, 10);

    res.status(200).json({
        alerts: rows,
        pagination: {
            total: totalCount,
            limit: limit,
            offset: offset,
            hasNextPage: (offset + rows.length) < totalCount
        }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    next(error); // Pass error to the generic error handler
  }
};

/**
 * @description Get detailed information for a single alert by ID, including a frame URL.
 * @route GET /api/alerts/:id
 */
exports.getAlertById = async (req, res, next) => {
  const { id } = req.params;

  // Validate ID
  const alertId = parseInt(id, 10);
  if (isNaN(alertId)) {
    return res.status(400).json({ error: 'Invalid alert ID format.' });
  }

  try {
    const queryText = `
      SELECT id, timestamp, alert_type, message, frame_storage_key, details
      FROM alerts
      WHERE id = $1
    `;
    const { rows, rowCount } = await db.query(queryText, [alertId]);

    if (rowCount === 0) {
      return res.status(404).json({ error: `Alert with ID ${alertId} not found.` });
    }

    const alert = rows[0];

    // Generate pre-signed URL for the frame if a key exists
    const frameUrl = await generateFrameUrl(alert.frame_storage_key);

    // Combine alert data with the generated URL
    const alertDetails = {
      ...alert,
      frameUrl: frameUrl, // Add the generated URL (or null)
    };
    // Don't send the raw storage key to the frontend if not needed
    delete alertDetails.frame_storage_key;

    res.status(200).json(alertDetails);
  } catch (error) {
    console.error(`Error fetching alert with ID ${id}:`, error);
    next(error); // Pass error to the generic error handler
  }
};

/**
 * @description Create a new alert entry (intended for internal use after ML processing).
 * @route POST /api/alerts (Example - might not be exposed directly)
 */
exports.createAlert = async (alertData) => {
    // This function is designed to be called internally, not directly from an HTTP request handler
    // It expects an object like: { alert_type, message, frame_storage_key, details? }
    const { alert_type, message, frame_storage_key, details } = alertData;

    if (!alert_type || !message) {
        console.error('Error creating alert: Missing required fields (alert_type, message).');
        throw new Error('Alert type and message are required.'); // Throw error for internal handling
    }

    const queryText = `
        INSERT INTO alerts (alert_type, message, frame_storage_key, details)
        VALUES ($1, $2, $3, $4)
        RETURNING *; -- Return the created alert row
    `;
    const params = [
        alert_type,
        message,
        frame_storage_key || null, // Ensure null if undefined/empty
        details ? JSON.stringify(details) : null // Store details as JSONB
    ];

    try {
        const { rows } = await db.query(queryText, params);
        console.log(`Alert created successfully with ID: ${rows[0].id}`);
        return rows[0]; // Return the created alert object
    } catch (error) {
        console.error('Error inserting alert into database:', error);
        throw error; // Re-throw for internal handling
    }
}

// Add other controller functions (deleteAlert, updateAlert) if needed later.