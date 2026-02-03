import { Router } from 'express'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Import pendingLinks lazily to avoid issues if bot is not configured
let pendingLinks = null
const getPendingLinks = async () => {
  if (pendingLinks === null && process.env.MICROSOFT_APP_ID) {
    try {
      const botModule = await import('../bot/teamsBot.js')
      pendingLinks = botModule.pendingLinks
    } catch (e) {
      console.error('Could not load pendingLinks:', e)
    }
  }
  return pendingLinks
}

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

// Get current user settings (including webhook and Teams link status)
router.get('/me/settings', authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, email, name, department, role, teams_webhook, teams_user_id, teams_conversation_ref
      FROM users WHERE id = ?
    `).get(req.user.id)

    // Add a flag to indicate if Teams bot is linked
    res.json({
      ...user,
      teamsLinked: !!user.teams_conversation_ref
    })
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

// Link Teams account using bot code
router.post('/me/teams-link', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ message: 'Codigo requerido' })
    }

    const links = await getPendingLinks()
    if (!links) {
      return res.status(400).json({ message: 'Bot de Teams no configurado' })
    }

    const linkData = links.get(code.toUpperCase())

    if (!linkData) {
      return res.status(400).json({ message: 'Codigo invalido o expirado' })
    }

    // Check if code has expired
    if (Date.now() > linkData.expiresAt) {
      links.delete(code.toUpperCase())
      return res.status(400).json({ message: 'Codigo expirado. Solicita uno nuevo en Teams.' })
    }

    // Save the conversation reference to the user
    db.prepare(`
      UPDATE users
      SET teams_user_id = ?, teams_conversation_ref = ?
      WHERE id = ?
    `).run(linkData.teamsUserId, linkData.conversationRef, req.user.id)

    // Remove the used code
    links.delete(code.toUpperCase())

    res.json({
      message: 'Cuenta de Teams vinculada correctamente',
      teamsUserName: linkData.teamsUserName
    })
  } catch (error) {
    console.error('Link Teams error:', error)
    res.status(500).json({ message: 'Error al vincular cuenta de Teams' })
  }
})

// Unlink Teams account
router.delete('/me/teams-link', authenticateToken, (req, res) => {
  try {
    db.prepare(`
      UPDATE users
      SET teams_user_id = NULL, teams_conversation_ref = NULL
      WHERE id = ?
    `).run(req.user.id)

    res.json({ message: 'Cuenta de Teams desvinculada' })
  } catch (error) {
    console.error('Unlink Teams error:', error)
    res.status(500).json({ message: 'Error al desvincular cuenta de Teams' })
  }
})

export default router
