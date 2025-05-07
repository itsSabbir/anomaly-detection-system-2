// backend/db.js
const { Pool } = require('pg')
// Ensure dotenv is configured. Ideally called once at app entry (server.js),
// but calling here provides safety if this module is imported early.
require('dotenv').config()

// Validate essential DB environment variables
const requiredEnv = ['DB_USER', 'DB_HOST', 'DB_DATABASE', 'DB_PASSWORD', 'DB_PORT']
const missingEnv = requiredEnv.filter(v => !process.env[v])
if (missingEnv.length > 0) {
  console.error(`FATAL ERROR: Missing required database environment variables: ${missingEnv.join(', ')}`)
  process.exit(1) // Exit if essential config is missing
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10), // Ensure port is a number

  // *** IMPORTANT: SSL is typically REQUIRED for AWS RDS ***
  ssl: {
    // Allows connection to RDS without needing the CA certificate locally.
    // For production, consider downloading the AWS RDS CA cert and setting
    // rejectUnauthorized: true, ca: fs.readFileSync('path/to/rds-ca-cert.pem').toString()
    // For now, this setting makes the connection work during development.
    rejectUnauthorized: false
  }

  // Optional: Add connection timeout (e.g., 5 seconds)
  // connectionTimeoutMillis: 5000,
})

// Enhanced connection check function
const checkConnection = async () => {
  let client
  try {
    client = await pool.connect() // Try to get a client from the pool
    const res = await client.query('SELECT NOW()') // Test with a simple query
    // Use the database name in the success message for clarity
    console.log(`[DB] Connection to '${process.env.DB_DATABASE}' successful at: ${res.rows[0].now}`)
    return true
  } catch (err) {
    console.error('[DB] Connection Test FAILED.')
    // Provide more specific error feedback including the error code
    if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
      console.error(`   -> Network Error (${err.code}): Could not resolve host '${process.env.DB_HOST}'. Check DB_HOST and network connectivity.`)
    } else if (err.code === '28P01') { // PostgreSQL password auth failed
      console.error(`   -> Authentication Error (${err.code}): Password authentication failed for user '${process.env.DB_USER}'. Check DB_USER and DB_PASSWORD.`)
    } else if (err.message.includes('pg_hba.conf')) { // Keep this check as pg library might still report it
      console.error(`   -> Authorization Error: Connection refused by pg_hba.conf rules or equivalent (Check RDS Security Group Inbound Rules for your IP). Code: ${err.code || 'N/A'}`)
    } else if (err.code === '3D000') { // Invalid database name
      console.error(`   -> Database Error (${err.code}): Database '${process.env.DB_DATABASE}' does not exist. Check DB_DATABASE.`)
    } else {
      console.error(`   -> Unknown Error (${err.code || 'N/A'}): ${err.message}`) // Log the raw error message and code if available
    }
    // console.error(err.stack); // Keep commented out unless deep debugging needed
    return false
  } finally {
    if (client) {
      client.release() // IMPORTANT: Always release the client!
    }
  }
}

// Export a safe query function, the check function, and the pool itself
// Exporting the pool can be useful for graceful shutdown procedures
module.exports = {
  query: (text, params) => pool.query(text, params),
  checkConnection,
  pool
}
