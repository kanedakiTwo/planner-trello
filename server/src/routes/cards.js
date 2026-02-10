import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'
import { notifyMention } from '../services/teams.js'

const router = Router()

// Get card details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const card = await db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id)

    if (!card) {
      return res.status(404).json({ message: 'Tarjeta no encontrada' })
    }

    const assignees = await db.prepare(`
      SELECT u.id, u.name, u.email, u.department
      FROM card_assignees ca
      JOIN users u ON ca.user_id = u.id
      WHERE ca.card_id = ?
    `).all(req.params.id)

    const labels = await db.prepare('SELECT * FROM card_labels WHERE card_id = ?').all(req.params.id)

    res.json({ ...card, assignees, labels })
  } catch (error) {
    console.error('Get card error:', error)
    res.status(500).json({ message: 'Error al obtener tarjeta' })
  }
})

// Update card
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, priority, due_date } = req.body

    const updates = []
    const values = []

    if (title !== undefined) {
      updates.push('title = ?')
      values.push(title)
    }
    if (description !== undefined) {
      updates.push('description = ?')
      values.push(description)
    }
    if (priority !== undefined) {
      updates.push('priority = ?')
      values.push(priority || null)
    }
    if (due_date !== undefined) {
      updates.push('due_date = ?')
      values.push(due_date || null)
    }

    if (updates.length > 0) {
      values.push(req.params.id)
      await db.prepare(`UPDATE cards SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    }

    const card = await db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id)
    res.json(card)
  } catch (error) {
    console.error('Update card error:', error)
    res.status(500).json({ message: 'Error al actualizar tarjeta' })
  }
})

// Move card
router.patch('/:id/move', authenticateToken, async (req, res) => {
  try {
    const { columnId, position } = req.body

    // Update card position and column
    await db.prepare(`
      UPDATE cards SET column_id = ?, position = ? WHERE id = ?
    `).run(columnId, position, req.params.id)

    // Reorder other cards in target column
    const cards = await db.prepare(`
      SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position
    `).all(columnId, req.params.id)

    for (let index = 0; index < cards.length; index++) {
      const newPosition = index >= position ? index + 1 : index
      await db.prepare('UPDATE cards SET position = ? WHERE id = ?').run(newPosition, cards[index].id)
    }

    res.json({ message: 'Tarjeta movida' })
  } catch (error) {
    console.error('Move card error:', error)
    res.status(500).json({ message: 'Error al mover tarjeta' })
  }
})

// Delete card
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.id)
    res.json({ message: 'Tarjeta eliminada' })
  } catch (error) {
    console.error('Delete card error:', error)
    res.status(500).json({ message: 'Error al eliminar tarjeta' })
  }
})

// Add assignee
router.post('/:id/assignees', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body

    await db.prepare(`
      INSERT INTO card_assignees (card_id, user_id)
      VALUES (?, ?)
      ON CONFLICT DO NOTHING
    `).run(req.params.id, userId)

    res.json({ message: 'Asignado agregado' })
  } catch (error) {
    console.error('Add assignee error:', error)
    res.status(500).json({ message: 'Error al agregar asignado' })
  }
})

// Remove assignee
router.delete('/:id/assignees/:userId', authenticateToken, async (req, res) => {
  try {
    await db.prepare(`
      DELETE FROM card_assignees WHERE card_id = ? AND user_id = ?
    `).run(req.params.id, req.params.userId)

    res.json({ message: 'Asignado eliminado' })
  } catch (error) {
    console.error('Remove assignee error:', error)
    res.status(500).json({ message: 'Error al eliminar asignado' })
  }
})

// Add label
router.post('/:id/labels', authenticateToken, async (req, res) => {
  try {
    const { name, color } = req.body
    const labelId = uuidv4()

    await db.prepare(`
      INSERT INTO card_labels (id, card_id, name, color)
      VALUES (?, ?, ?, ?)
    `).run(labelId, req.params.id, name, color)

    const label = await db.prepare('SELECT * FROM card_labels WHERE id = ?').get(labelId)
    res.status(201).json(label)
  } catch (error) {
    console.error('Add label error:', error)
    res.status(500).json({ message: 'Error al agregar etiqueta' })
  }
})

// Remove label
router.delete('/:id/labels/:labelId', authenticateToken, async (req, res) => {
  try {
    await db.prepare('DELETE FROM card_labels WHERE id = ?').run(req.params.labelId)
    res.json({ message: 'Etiqueta eliminada' })
  } catch (error) {
    console.error('Remove label error:', error)
    res.status(500).json({ message: 'Error al eliminar etiqueta' })
  }
})

// Get comments
router.get('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const comments = await db.prepare(`
      SELECT c.*, u.name as user_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.card_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id)

    res.json(comments)
  } catch (error) {
    console.error('Get comments error:', error)
    res.status(500).json({ message: 'Error al obtener comentarios' })
  }
})

// Add comment
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body
    const commentId = uuidv4()

    await db.prepare(`
      INSERT INTO comments (id, card_id, user_id, content)
      VALUES (?, ?, ?, ?)
    `).run(commentId, req.params.id, req.user.id, content)

    // Get card and board info for notifications
    const card = await db.prepare(`
      SELECT c.*, col.board_id
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      WHERE c.id = ?
    `).get(req.params.id)

    const board = card ? await db.prepare('SELECT name FROM boards WHERE id = ?').get(card.board_id) : null

    // Extract mentions and create notifications
    const mentions = content.match(/@([\w\u00C0-\u024F]+)/g) || []
    console.log('Mentions found:', mentions)
    for (const mention of mentions) {
      const userName = mention.slice(1)
      const mentionedUser = await db.prepare('SELECT id, name, teams_webhook, teams_conversation_ref FROM users WHERE name LIKE ? ORDER BY teams_conversation_ref DESC NULLS LAST LIMIT 1').get(`%${userName}%`)
      console.log('Mentioned user found:', mentionedUser?.name, 'has_ref:', !!mentionedUser?.teams_conversation_ref)
      if (mentionedUser) {
        await db.prepare(`
          INSERT INTO mentions (id, card_id, comment_id, user_id)
          VALUES (?, ?, ?, ?)
        `).run(uuidv4(), req.params.id, commentId, mentionedUser.id)

        // Send Teams notification
        const appUrl = process.env.APP_URL || 'http://localhost:5173'
        const cardUrl = `${appUrl}/board/${card?.board_id}?card=${req.params.id}`

        notifyMention(
          mentionedUser,
          req.user.name,
          card?.title || 'Tarjeta',
          content,
          board?.name || 'Tablero',
          cardUrl
        ).catch(err => console.error('Teams notification error:', err))
      }
    }

    const comment = await db.prepare(`
      SELECT c.*, u.name as user_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(commentId)

    res.status(201).json(comment)
  } catch (error) {
    console.error('Add comment error:', error)
    res.status(500).json({ message: 'Error al agregar comentario' })
  }
})

// Delete comment
router.delete('/comments/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id)
    res.json({ message: 'Comentario eliminado' })
  } catch (error) {
    console.error('Delete comment error:', error)
    res.status(500).json({ message: 'Error al eliminar comentario' })
  }
})

export default router
