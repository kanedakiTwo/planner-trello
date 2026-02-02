import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, department } = req.body

    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya esta registrado' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const userId = uuidv4()
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, department)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, email, passwordHash, name, department)

    // Generate token
    const token = jwt.sign(
      { id: userId, email, name, department },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      token,
      user: { id: userId, email, name, department }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: 'Error al registrar usuario' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user) {
      return res.status(401).json({ message: 'Credenciales invalidas' })
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciales invalidas' })
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, department: user.department },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        department: user.department,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Error al iniciar sesion' })
  }
})

// Get profile
router.get('/profile', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, email, name, department, role FROM users WHERE id = ?').get(req.user.id)
  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' })
  }
  res.json({ user })
})

export default router
