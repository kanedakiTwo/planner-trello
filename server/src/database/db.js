import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const db = new Database(join(__dirname, '../../planner.db'))

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Initialize database with schema
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
db.exec(schema)

export default db
