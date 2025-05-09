// backend/check_phase1.js
const fs = require('fs')
const path = require('path')
const chalk = require('chalk') // v4 for CommonJS

const log = console.log
const checkMark = chalk.green('✅')
const crossMark = chalk.red('❌')
const warnMark = chalk.yellow('⚠️')
const infoMark = chalk.blue('ℹ️')

const steps = [
  { id: 'pkg_json', description: '`package.json` exists', check: () => checkFileExists('package.json') },
  { id: 'deps', description: 'Required dependencies installed (`express`, `cors`, `pg`, `dotenv`)', check: checkDependencies },
  { id: 'dev_deps', description: 'Required dev dependencies installed (`jest`, `supertest`, `nodemon`, `eslint`)', check: checkDevDependencies },
  { id: 'scripts', description: 'Essential npm scripts configured (`start`, `dev`, `test`, `lint`)', check: checkNpmScripts },
  { id: 'server_js', description: '`server.js` exists', check: () => checkFileExists('server.js') },
  { id: 'dotenv_file', description: '`.env` file exists', check: () => checkFileExists('.env') },
  { id: 'dotenv_example', description: '`.env.example` file exists (Recommended)', check: () => checkFileExists('.env.example'), optional: true },
  { id: 'gitignore', description: '`.gitignore` exists', check: () => checkFileExists('.gitignore') },
  { id: 'gitignore_env', description: '`.gitignore` ignores `.env`', check: checkGitignoreContent },
  { id: 'eslint_config', description: 'ESLint config file exists (`.eslintrc.*`)', check: checkEslintConfig },
  { id: 'db_js', description: '`db.js` exists', check: () => checkFileExists('db.js') },
  { id: 'rds_setup', description: 'AWS RDS PostgreSQL instance setup (Manual Check)', check: () => null, manual: true }, // Manual check
  { id: 'db_connection', description: 'Database connection successful (Run `npm run dev` to verify)', check: () => null, manual: true }, // Manual check
  { id: 'alerts_table', description: '`alerts` table created in RDS (Manual Check)', check: () => null, manual: true }, // Manual check
  { id: 'routes_dir', description: '`routes/` directory exists', check: () => checkDirectoryExists('routes') },
  { id: 'controllers_dir', description: '`controllers/` directory exists', check: () => checkDirectoryExists('controllers') },
  { id: 'models_dir', description: '`models/` directory exists', check: () => checkDirectoryExists('models') }
]

// --- Check Functions ---

function checkFileExists (filePath) {
  return fs.existsSync(path.resolve(__dirname, filePath))
}

function checkDirectoryExists (dirPath) {
  const fullPath = path.resolve(__dirname, dirPath)
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()
}

function readPackageJson () {
  const pkgPath = path.resolve(__dirname, 'package.json')
  if (!fs.existsSync(pkgPath)) {
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  } catch (error) {
    log(chalk.red('Error reading or parsing package.json:', error.message))
    return null
  }
}

function checkDependencies () {
  const pkg = readPackageJson()
  if (!pkg || !pkg.dependencies) return { status: 'missing', missing: ['package.json or dependencies section'] }
  const required = ['express', 'cors', 'pg', 'dotenv']
  const missing = required.filter(dep => !pkg.dependencies[dep])
  return missing.length > 0 ? { status: 'missing', missing } : { status: 'ok' }
}

function checkDevDependencies () {
  const pkg = readPackageJson()
  if (!pkg || !pkg.devDependencies) return { status: 'missing', missing: ['package.json or devDependencies section'] }
  // Note: Only checking for eslint core, not specific plugins here
  const required = ['jest', 'supertest', 'nodemon', 'eslint']
  const missing = required.filter(dep => !pkg.devDependencies[dep])
  return missing.length > 0 ? { status: 'missing', missing } : { status: 'ok' }
}

function checkNpmScripts () {
  const pkg = readPackageJson()
  if (!pkg || !pkg.scripts) return { status: 'missing', missing: ['package.json or scripts section'] }
  const required = ['start', 'dev', 'test', 'lint']
  const missing = required.filter(script => !pkg.scripts[script])
  return missing.length > 0 ? { status: 'missing', missing } : { status: 'ok' }
}

function checkGitignoreContent () {
  const gitignorePath = path.resolve(__dirname, '.gitignore')
  if (!fs.existsSync(gitignorePath)) {
    // Check root gitignore as fallback
    const rootGitignorePath = path.resolve(__dirname, '../.gitignore')
    if (!fs.existsSync(rootGitignorePath)) {
      return { status: 'missing', missing: ['.gitignore file (checked backend/ and root)'] }
    }
    try {
      const content = fs.readFileSync(rootGitignorePath, 'utf8')
      // Simple check, might need refinement for comments or complex patterns like .env*
      const ignoresEnv = content.split('\n').some(line => line.trim() === '.env' || line.trim() === '.env*')
      return ignoresEnv ? { status: 'ok' } : { status: 'missing', missing: ['.env entry in root .gitignore'] }
    } catch (error) {
      log(chalk.red('Error reading root .gitignore:', error.message))
      return { status: 'error', missing: ['Error reading root .gitignore'] }
    }
  }
  // Check backend/.gitignore if it exists
  try {
    const content = fs.readFileSync(gitignorePath, 'utf8')
    const ignoresEnv = content.split('\n').some(line => line.trim() === '.env')
    return ignoresEnv ? { status: 'ok' } : { status: 'missing', missing: ['.env entry in backend/.gitignore'] }
  } catch (error) {
    log(chalk.red('Error reading backend/.gitignore:', error.message))
    return { status: 'error', missing: ['Error reading backend/.gitignore'] }
  }
}

function checkEslintConfig () {
  // Check for common config file names used by different ESLint versions/formats
  const possibleConfigs = ['.eslintrc.json', '.eslintrc.js', '.eslintrc.yaml', '.eslintrc.yml', '.eslintrc.cjs', 'eslint.config.js']
  return possibleConfigs.some(file => fs.existsSync(path.resolve(__dirname, file)))
}

// --- Main Execution ---

async function runChecks () {
  log(chalk.bold.cyan('--- Anomaly Detection Backend - Phase 1 Check ---'))
  let firstMissingStep = null
  const results = []

  for (const step of steps) {
    let status = 'missing'
    let details = null

    if (step.manual) {
      status = 'manual'
    } else {
      const checkResult = step.check()
      if (typeof checkResult === 'boolean') {
        status = checkResult ? 'ok' : 'missing'
      } else if (typeof checkResult === 'object' && checkResult !== null) {
        status = checkResult.status // 'ok' or 'missing' or 'error'
        details = checkResult.missing // Array of missing items or error message
      }
    }

    results.push({ ...step, status, details })

    if (status === 'missing' && !step.optional && !firstMissingStep && !step.manual) {
      firstMissingStep = step.id
    }
  }

  // Print results
  results.forEach(result => {
    let marker = crossMark
    let detailText = ''
    if (result.status === 'ok') marker = checkMark
    if (result.status === 'manual') marker = infoMark
    if (result.status === 'missing' && result.optional) marker = warnMark

    if (result.details && Array.isArray(result.details) && result.details.length > 0) {
      detailText = chalk.red(` (Missing: ${result.details.join(', ')})`)
    } else if (result.details && typeof result.details === 'string') {
      detailText = chalk.red(` (${result.details})`)
    }

    log(`${marker} ${result.description}${detailText}`)
  })

  log(chalk.cyan('--------------------------------------------------'))

  // Print next steps
  if (firstMissingStep) {
    log(chalk.bold.yellow('Next Step:'))
    printNextStepInstructions(firstMissingStep, results)
  } else {
    const manualStepsPending = results.some(r => r.manual && r.status !== 'ok') // Assuming manual steps aren't marked 'ok'
    if (manualStepsPending) {
      log(chalk.yellow('All automated checks passed! Please complete the manual steps indicated above (ℹ️).'))
      // Find the first *pending* manual step
      const firstManual = results.find(r => r.manual && r.status !== 'ok')
      if (firstManual) {
        printNextStepInstructions(firstManual.id, results) // Guide towards first manual step
      }
    } else {
      log(chalk.bold.green('🎉 Phase 1 appears complete! Proceed to Phase 2: Frontend Foundation.'))
    }
  }
  log(chalk.cyan('--------------------------------------------------'))
}

// --- Instructions ---

function printNextStepInstructions (stepId, results) {
  switch (stepId) {
    case 'pkg_json':
      log(chalk.yellow('Initialize your Node.js project:'))
      log(chalk.white('  Run: `npm init -y`'))
      break
    case 'deps': { // Added braces for block scope
      const depsResult = results.find(r => r.id === 'deps')
      log(chalk.yellow(`Install required dependencies: ${depsResult.details.join(', ')}`))
      log(chalk.white(`  Run: npm install ${depsResult.details.join(' ')}`))
      break
    }
    case 'dev_deps': { // Added braces for block scope
      const devDepsResult = results.find(r => r.id === 'dev_deps')
      log(chalk.yellow(`Install required dev dependencies: ${devDepsResult.details.join(', ')}`))
      log(chalk.white(`  Run: npm install --save-dev ${devDepsResult.details.join(' ')}`))
      break
    }
    case 'scripts': { // Added braces for block scope
      const scriptsResult = results.find(r => r.id === 'scripts')
      log(chalk.yellow(`Add missing npm scripts to package.json: ${scriptsResult.details.join(', ')}`))
      log(chalk.white('  Edit `package.json` and add/update the "scripts" section:'))
      log(chalk.greenBright(`
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "cross-env NODE_ENV=test jest --coverage --detectOpenHandles",
    "lint": "eslint . --ext .js",
    "lint:fix": "eslint . --ext .js --fix",
    "check": "node check_phase1.js"
    // Add other existing scripts here if any
  },
            `))
      break
    }
    case 'server_js':
      log(chalk.yellow('Create the main server file `server.js`:'))
      log(chalk.white('  Run: `touch server.js` (or create manually)'))
      log(chalk.white('  Add basic Express setup code (see Phase 1 Step 1.2 / corrected version). Example:'))
      log(chalk.greenBright(`
// backend/server.js
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const db = require('./db')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Backend running!' })
})

// Add error handling middleware later

db.query('SELECT NOW()')
  .then(res => {
    console.log('DB connection verified')
    app.listen(PORT, () => { console.log(\`Server listening on port \${PORT}\`) })
    return null
  })
  .catch(err => {
    console.error('FATAL: DB connection failed.')
    process.exit(1)
  })

module.exports = app // For testing
            `))
      break
    case 'dotenv_file':
      log(chalk.yellow('Create the environment variables file `.env`:'))
      log(chalk.white('  Run: `touch .env` (or create manually)'))
      log(chalk.white('  Add initial variables like `PORT=3001`.'))
      log(chalk.white('  Later, add database credentials: DB_USER, DB_HOST, DB_DATABASE, DB_PASSWORD, DB_PORT.'))
      log(chalk.red('  IMPORTANT: Ensure `.env` is listed in your `.gitignore` file!'))
      break
    case 'dotenv_example':
      log(chalk.yellow('Create an example environment file `.env.example` (Recommended):'))
      log(chalk.white('  Run: `touch .env.example` (or create manually)'))
      log(chalk.white('  Copy the variable names from `.env` but without the secret values.'))
      log(chalk.white('  Example:'))
      log(chalk.greenBright(`
PORT=3001
DB_USER=
DB_HOST=
DB_DATABASE=
DB_PASSWORD=
DB_PORT=5432
            `))
      log(chalk.white('  Commit `.env.example` to Git, but NOT `.env`.'))
      break
    case 'gitignore':
      log(chalk.yellow('Create a `.gitignore` file:'))
      log(chalk.white('  Run: `touch .gitignore` (or create manually in backend/ or project root)'))
      log(chalk.white('  Add common Node.js ignores (like `node_modules/`) and crucially, `.env`.'))
      log(chalk.white('  See Phase 0 Step 6 for a good example root `.gitignore`.'))
      break
    case 'gitignore_env':
      log(chalk.yellow('Ensure `.env` is ignored by Git:'))
      log(chalk.white('  Edit your `.gitignore` file (root or backend/) and add the following line if missing:'))
      log(chalk.greenBright('\n.env\n'))
      break
    case 'eslint_config':
      log(chalk.yellow('Setup ESLint configuration:'))
      log(chalk.white('  Manually create `.eslintrc.json` in the `backend` directory.'))
      log(chalk.white('  Paste the correct JSON content for CommonJS/Standard style guide (see Phase 1 manual fix).'))
      log(chalk.white('  Ensure `eslint` (v8) and `eslint-config-standard` are installed:'))
      log(chalk.white('  Run: `npm install --save-dev eslint@^8.0.0 eslint-config-standard eslint-plugin-import eslint-plugin-n eslint-plugin-promise`'))
      break
    case 'db_js':
      log(chalk.yellow('Create the database connection module `db.js`:'))
      log(chalk.white('  Run: `touch db.js` (or create manually)'))
      log(chalk.white('  Add the `pg` Pool connection code (see Phase 1 Step 1.5 / corrected version).'))
      log(chalk.white('  Ensure your database credentials are correctly set in `.env`.'))
      log(chalk.greenBright(`
// backend/db.js
const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
})

module.exports = {
  query: (text, params) => pool.query(text, params)
}
            `))
      log(chalk.white('  Ensure `require(\'./db\')` is uncommented in `server.js`.'))
      break
    case 'rds_setup':
      log(chalk.yellow('Manual Step: Setup AWS RDS PostgreSQL Instance:'))
      log(chalk.white('  - Log in to AWS Console (`ca-central-1` region).'))
      log(chalk.white('  - Navigate to RDS -> Create database.'))
      log(chalk.white('  - Choose PostgreSQL, Free Tier template.'))
      log(chalk.white('  - Set DB identifier, master username, password (SAVE THESE!).'))
      log(chalk.white('  - Enable Public Access: Yes (for now).'))
      log(chalk.white('  - Create a new VPC security group (e.g., `anomaly-db-sg`).'))
      log(chalk.white('  - Set Initial database name (e.g., `anomalydb`).'))
      log(chalk.white('  - Create the database and wait for it to become Available.'))
      log(chalk.white('  - Note the Endpoint name.'))
      log(chalk.white('  - Update the `anomaly-db-sg` security group inbound rules to allow PostgreSQL (port 5432) from `My IP`.'))
      log(chalk.white('  - Add the DB credentials (USER, HOST, DATABASE, PASSWORD, PORT) to your `.env` file.'))
      break
    case 'db_connection':
      log(chalk.yellow('Manual Step: Verify Database Connection:'))
      log(chalk.white('  - Ensure `db.js` is created and required in `server.js`.'))
      log(chalk.white('  - Ensure RDS credentials in `.env` are correct.'))
      log(chalk.white('  - Ensure RDS security group allows access from your IP.'))
      log(chalk.white('  - Run the backend server: `npm run dev`'))
      log(chalk.white('  - Look for the "Database connection verified..." message in the console output.'))
      log(chalk.white('  - Troubleshoot credentials, endpoint, or security group if connection fails.'))
      break
    case 'alerts_table':
      log(chalk.yellow('Manual Step: Create `alerts` Table in RDS:'))
      log(chalk.white('  - Connect to your RDS instance using `psql` or a GUI tool (DBeaver, pgAdmin).'))
      log(chalk.white('  - Use the Host (Endpoint), Port (5432), Database name (`anomalydb`), User, and Password from `.env`.'))
      log(chalk.white('  - Execute the following SQL command:'))
      log(chalk.greenBright(`
  CREATE TABLE alerts (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
      alert_type VARCHAR(100) NOT NULL,
      message TEXT,
      frame_storage_key TEXT UNIQUE,
      details JSONB
  );
            `))
      log(chalk.white('  - Verify creation with `\\dt alerts` (psql) or the GUI tool.'))
      break
    case 'routes_dir':
    case 'controllers_dir':
    case 'models_dir':
      log(chalk.yellow('Create placeholder directories for MVC structure:'))
      log(chalk.white('  Run: `mkdir routes controllers models`'))
      log(chalk.white('  (You can create empty files like `routes/alertRoutes.js` inside them later).'))
      break
    default:
      log(chalk.red('Unknown step ID:', stepId))
  }
}

// --- Run the checks ---
runChecks().catch(error => {
  log(chalk.red.bold('An error occurred during the check:'), error)
})
