import { Router } from 'express'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Get all users (for mentions and assignees)
router.get('/', authenticateToken, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, email, name, department, role
      FROM users
      ORDER BY name
    `).all()

    res.json(users)
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ message: 'Error al obtener usuarios' })
  }
})

// Get user by ID
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, email, name, department, role
      FROM users WHERE id = ?
    `).get(req.params.id)

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    res.json(user)
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ message: 'Error al obtener usuario' })
  }
})

// Get current user settings (including webhook)
router.get('/me/settings', authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, email, name, department, role, teams_webhook
      FROM users WHERE id = ?
    `).get(req.user.id)

    res.json(user)
  } catch (error) {
    console.error('Get settings error:', error)
    res.status(500).json({ message: 'Error al obtener configuracion' })
  }
})

// Update Teams webhook
router.put('/me/teams-webhook', authenticateToken, (req, res) => {
  try {
    const { webhookUrl } = req.body

    db.prepare('UPDATE users SET teams_webhook = ? WHERE id = ?')
      .run(webhookUrl || null, req.user.id)

    res.json({ message: 'Webhook de Teams actualizado' })
  } catch (error) {
    console.error('Update webhook error:', error)
    res.status(500).json({ message: 'Error al actualizar webhook' })
  }
})

export default router
