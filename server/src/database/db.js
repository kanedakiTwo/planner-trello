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

// Use DATABASE_URL from Railway or fallback to local
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
})

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

// Initialize on startup
await initializeDatabase()

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
