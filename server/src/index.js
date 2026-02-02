import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

dotenv.config()

import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import boardsRoutes from './routes/boards.js'
import columnsRoutes from './routes/columns.js'
import cardsRoutes from './routes/cards.js'
import attachmentsRoutes from './routes/attachments.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/boards', boardsRoutes)
app.use('/api/columns', columnsRoutes)
app.use('/api/cards', cardsRoutes)
app.use('/api', attachmentsRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(__dirname, '../../client/dist')
  app.use(express.static(clientDist))

  // Handle SPA routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(join(clientDist, 'index.html'))
  })
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Error interno del servidor' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})
