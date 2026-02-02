import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dbPath = join(__dirname, '../../planner.db')
const schemaPath = join(__dirname, 'schema.sql')

// Initialize SQL.js
const SQL = await initSqlJs()

// Load existing database or create new one
let db
if (existsSync(dbPath)) {
  const buffer = readFileSync(dbPath)
  db = new SQL.Database(buffer)
} else {
  db = new SQL.Database()
}

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON')

// Initialize database with schema
const schema = readFileSync(schemaPath, 'utf8')
db.run(schema)

// Save database periodically and on changes
function saveDatabase() {
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(dbPath, buffer)
}

// Create a wrapper that mimics better-sqlite3 API
const dbWrapper = {
  prepare(sql) {
    return {
      run(...params) {
        db.run(sql, params)
        saveDatabase()
        return { changes: db.getRowsModified() }
      },
      get(...params) {
        const stmt = db.prepare(sql)
        stmt.bind(params)
        if (stmt.step()) {
          const row = stmt.getAsObject()
          stmt.free()
          return row
        }
        stmt.free()
        return undefined
      },
      all(...params) {
        const results = []
        const stmt = db.prepare(sql)
        stmt.bind(params)
        while (stmt.step()) {
          results.push(stmt.getAsObject())
        }
        stmt.free()
        return results
      }
    }
  },
  exec(sql) {
    db.run(sql)
    saveDatabase()
  },
  pragma(statement) {
    db.run(`PRAGMA ${statement}`)
  }
}

export default dbWrapper
