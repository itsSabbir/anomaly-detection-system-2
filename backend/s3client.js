// backend/s3Client.js
const { S3Client } = require('@aws-sdk/client-s3')
require('dotenv').config()

// --- Configuration Validation ---
const requiredEnvVars = [
  'AWS_REGION'
  // AWS credentials (ACCESS_KEY_ID, SECRET_ACCESS_KEY) are typically handled
  // by the SDK's default credential chain (IAM role, ~/.aws/credentials, etc.)
  // Only explicitly check if you *require* them in .env for some reason.
]
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingEnvVars.length > 0) {
  console.error(
    `FATAL ERROR: Missing required AWS environment variables for S3 client: ${missingEnvVars.join(', ')}`
  )
  console.error('Please ensure they are defined in your .env file or AWS credentials are configured correctly.')
  process.exit(1) // Exit if essential config is missing
}

// --- Initialize S3 Client ---
// The SDK will automatically attempt to find credentials in the following order:
// 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN)
// 2. Shared credential file (~/.aws/credentials)
// 3. Shared configuration file (~/.aws/config)
// 4. EC2 instance profile (IAM Role attached to the EC2 instance) - PREFERRED FOR EC2
const s3Client = new S3Client({
  region: process.env.AWS_REGION
  // You generally DON'T need to specify credentials here if using IAM roles or standard credential files.
  // Only uncomment and use process.env if absolutely necessary and NOT using IAM roles.
  // credentials: {
  //   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  // },

  // Optional: Add endpoint configuration if using S3-compatible storage or VPC endpoints
  // endpoint: process.env.S3_ENDPOINT_URL,
  // forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', // Needed for some S3-compatible storage like MinIO
})

console.log(`S3 Client: Configured for region ${process.env.AWS_REGION}`)

// --- Module Exports ---
module.exports = s3Client
