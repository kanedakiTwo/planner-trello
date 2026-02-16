import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Load environment variables first (needed for module initialization)
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const { Pool } = pg

// Build connection string from Railway POSTGRES_* variables or use DATABASE_URL
function getConnectionConfig() {
  // If DATABASE_URL exists, use it directly
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
    }
  }

  // Otherwise, build from individual POSTGRES_* variables (Railway format)
  if (process.env.PGHOST || process.env.POSTGRES_HOST) {
    const host = process.env.PGHOST || process.env.POSTGRES_HOST
    const port = process.env.PGPORT || process.env.POSTGRES_PORT || 5432
    const database = process.env.PGDATABASE || process.env.POSTGRES_DB
    const user = process.env.PGUSER || process.env.POSTGRES_USER
    const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD

    return {
      host,
      port,
      database,
      user,
      password,
      ssl: { rejectUnauthorized: false }
    }
  }

  // Fallback to local development
  return {
    connectionString: 'postgresql://localhost/planner'
  }
}

const pool = new Pool(getConnectionConfig())

// Initialize schema
async function initializeDatabase() {
  const schemaPath = join(__dirname, 'schema.sql')
  const schema = readFileSync(schemaPath, 'utf8')

  try {
    await pool.query(schema)
    console.log('Database schema initialized')
  } catch (error) {
    // Tables might already exist
    if (!error.message.includes('already exists')) {
      console.error('Schema initialization error:', error.message)
    }
  }
}

// Migrate roles: 'member' → 'user', set admin for miguel
async function migrateRoles() {
  try {
    await pool.query("UPDATE users SET role = 'user' WHERE role = 'member'")
    await pool.query("UPDATE users SET role = 'admin' WHERE email = 'miguel.martin@aikit.es'")
  } catch (error) {
    console.error('Role migration error:', error.message)
  }
}

// Add 'active' column if it doesn't exist
async function migrateActiveColumn() {
  try {
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE")
  } catch (error) {
    console.error('Active column migration error:', error.message)
  }
}

// Seed default departments if table is empty
async function seedDepartments() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM departments')
    if (parseInt(rows[0].count) === 0) {
      const defaults = ['Desarrollo', 'Diseno', 'Marketing', 'Ventas', 'Recursos Humanos', 'Finanzas', 'Operaciones', 'Soporte']
      for (let i = 0; i < defaults.length; i++) {
        const id = `dept-${Date.now()}-${i}`
        await pool.query('INSERT INTO departments (id, name, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [id, defaults[i], i])
      }
      console.log('Default departments seeded')
    }
  } catch (error) {
    console.error('Seed departments error:', error.message)
  }
}

// Initialize on startup
await initializeDatabase()
await migrateRoles()
await migrateActiveColumn()
await seedDepartments()

// Create a wrapper that mimics better-sqlite3 sync API but uses async pg
const dbWrapper = {
  prepare(sql) {
    // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
    let paramIndex = 0
    const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`)

    return {
      async run(...params) {
        const result = await pool.query(pgSql, params)
        return { changes: result.rowCount }
      },
      async get(...params) {
        const result = await pool.query(pgSql, params)
        return result.rows[0] || undefined
      },
      async all(...params) {
        const result = await pool.query(pgSql, params)
        return result.rows
      }
    }
  },
  async exec(sql) {
    await pool.query(sql)
  },
  async query(sql, params = []) {
    const result = await pool.query(sql, params)
    return result.rows
  }
}

export default dbWrapper
export { pool }
