import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'
import { notifyMention, notifyColumnChange, notifyAssignment } from '../services/teams.js'
import { logAction, logNotification, logError } from '../utils/logger.js'

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
    logError('Get card', error)
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
    logAction(req, 'Actualizar tarjeta', { card: card.title })
    res.json(card)
  } catch (error) {
    logError('Update card', error)
    res.status(500).json({ message: 'Error al actualizar tarjeta' })
  }
})

// Move card
router.patch('/:id/move', authenticateToken, async (req, res) => {
  try {
    const { columnId, position } = req.body

    if (!columnId) {
      return res.status(400).json({ message: 'columnId es obligatorio' })
    }

    // Read current card BEFORE updating (for notification)
    const currentCard = await db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id)
    const previousColumnId = currentCard?.column_id

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

    // Notify if column changed
    const columnChanged = currentCard && previousColumnId !== columnId
    if (columnChanged) {
      const fromCol = await db.prepare('SELECT name FROM columns WHERE id = ?').get(previousColumnId)
      const toCol = await db.prepare('SELECT name FROM columns WHERE id = ?').get(columnId)
      logAction(req, 'Mover tarjeta', { card: currentCard.title, de: fromCol?.name, a: toCol?.name })

      ;(async () => {
        try {
          const board = await db.prepare(`
            SELECT b.name FROM boards b
            JOIN columns c ON c.board_id = b.id
            WHERE c.id = ?
          `).get(columnId)
          const creator = await db.prepare('SELECT id, name, teams_conversation_ref, teams_webhook FROM users WHERE id = ?').get(currentCard.created_by)
          const isSelfMove = currentCard.created_by === req.user.id

          if (creator && fromCol && toCol && board) {
            const col = await db.prepare('SELECT board_id FROM columns WHERE id = ?').get(columnId)
            const appUrl = process.env.APP_URL || 'https://planner-trello-production.up.railway.app'
            const cardUrl = `${appUrl}/board/${col.board_id}?card=${req.params.id}`

            // Notify creator if different from mover
            if (!isSelfMove) {
              const sent = await notifyColumnChange(creator, req.user.name, currentCard.title, fromCol.name, toCol.name, board.name, cardUrl)
              logNotification('Movimiento tarjeta', creator.name, sent, { card: currentCard.title, de: fromCol.name, a: toCol.name })
            }

            // Notify all assignees (except the mover and creator already notified)
            const assignees = await db.prepare(`
              SELECT u.id, u.name, u.teams_conversation_ref, u.teams_webhook
              FROM card_assignees ca
              JOIN users u ON ca.user_id = u.id
              WHERE ca.card_id = ? AND u.id != ?
            `).all(req.params.id, req.user.id)

            for (const assignee of assignees) {
              if (assignee.id === currentCard.created_by) continue
              const sent = await notifyColumnChange(assignee, req.user.name, currentCard.title, fromCol.name, toCol.name, board.name, cardUrl)
              logNotification('Movimiento tarjeta', assignee.name, sent, { card: currentCard.title, rol: 'asignado' })
            }
          }
        } catch (err) {
          logError('Notificacion movimiento tarjeta', err)
        }
      })()
    } else {
      logAction(req, 'Reordenar tarjeta', { card: currentCard?.title, position })
    }

    res.json({ message: 'Tarjeta movida' })
  } catch (error) {
    logError('Move card', error)
    res.status(500).json({ message: 'Error al mover tarjeta' })
  }
})

// Delete card
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const card = await db.prepare('SELECT title FROM cards WHERE id = ?').get(req.params.id)
    await db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.id)
    logAction(req, 'Eliminar tarjeta', { card: card?.title })
    res.json({ message: 'Tarjeta eliminada' })
  } catch (error) {
    logError('Delete card', error)
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

    const card = await db.prepare(`
      SELECT c.title, c.id, col.name as column_name, col.board_id, b.name as board_name
      FROM cards c
      JOIN columns col ON c.column_id = col.id
      JOIN boards b ON col.board_id = b.id
      WHERE c.id = ?
    `).get(req.params.id)
    const assignee = await db.prepare('SELECT id, name, teams_conversation_ref, teams_webhook FROM users WHERE id = ?').get(userId)
    logAction(req, 'Asignar usuario', { card: card?.title, asignado: assignee?.name })

    // Notify assignee via Teams (don't notify if assigning yourself)
    if (assignee && card && userId !== req.user.id) {
      const appUrl = process.env.APP_URL || 'https://planner-trello-production.up.railway.app'
      const cardUrl = `${appUrl}/board/${card.board_id}?card=${card.id}`
      notifyAssignment(assignee, req.user.name, card.title, card.column_name, card.board_name, cardUrl)
        .then(sent => logNotification('Asignacion', assignee.name, sent, { card: card.title, board: card.board_name }))
        .catch(err => logError('Notificacion asignacion', err))
    }

    res.json({ message: 'Asignado agregado' })
  } catch (error) {
    logError('Add assignee', error)
    res.status(500).json({ message: 'Error al agregar asignado' })
  }
})

// Remove assignee
router.delete('/:id/assignees/:userId', authenticateToken, async (req, res) => {
  try {
    await db.prepare(`
      DELETE FROM card_assignees WHERE card_id = ? AND user_id = ?
    `).run(req.params.id, req.params.userId)

    const card = await db.prepare('SELECT title FROM cards WHERE id = ?').get(req.params.id)
    const user = await db.prepare('SELECT name FROM users WHERE id = ?').get(req.params.userId)
    logAction(req, 'Desasignar usuario', { card: card?.title, desasignado: user?.name })
    res.json({ message: 'Asignado eliminado' })
  } catch (error) {
    logError('Remove assignee', error)
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
    const card = await db.prepare('SELECT title FROM cards WHERE id = ?').get(req.params.id)
    logAction(req, 'Agregar etiqueta', { card: card?.title, etiqueta: name })
    res.status(201).json(label)
  } catch (error) {
    logError('Add label', error)
    res.status(500).json({ message: 'Error al agregar etiqueta' })
  }
})

// Remove label
router.delete('/:id/labels/:labelId', authenticateToken, async (req, res) => {
  try {
    const label = await db.prepare('SELECT name FROM card_labels WHERE id = ?').get(req.params.labelId)
    await db.prepare('DELETE FROM card_labels WHERE id = ?').run(req.params.labelId)
    logAction(req, 'Eliminar etiqueta', { etiqueta: label?.name })
    res.json({ message: 'Etiqueta eliminada' })
  } catch (error) {
    logError('Remove label', error)
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
    logError('Get comments', error)
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

    logAction(req, 'Comentar', { card: card?.title, board: board?.name })

    // Extract mentions and create notifications
    const mentions = content.match(/@([\w\u00C0-\u024F]+)/g) || []
    for (const mention of mentions) {
      const userName = mention.slice(1)
      const mentionedUser = await db.prepare('SELECT id, name, teams_webhook, teams_conversation_ref FROM users WHERE name LIKE ? ORDER BY teams_conversation_ref DESC NULLS LAST LIMIT 1').get(`%${userName}%`)
      if (mentionedUser) {
        await db.prepare(`
          INSERT INTO mentions (id, card_id, comment_id, user_id)
          VALUES (?, ?, ?, ?)
        `).run(uuidv4(), req.params.id, commentId, mentionedUser.id)

        // Send Teams notification
        const appUrl = process.env.APP_URL || 'https://planner-trello-production.up.railway.app'
        const cardUrl = `${appUrl}/board/${card?.board_id}?card=${req.params.id}`

        const sent = await notifyMention(
          mentionedUser,
          req.user.name,
          card?.title || 'Tarjeta',
          content,
          board?.name || 'Tablero',
          cardUrl
        )
        logNotification('Mencion', mentionedUser.name, sent, { card: card?.title, mencionadoPor: req.user.name })
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
    logError('Add comment', error)
    res.status(500).json({ message: 'Error al agregar comentario' })
  }
})

// Delete comment
router.delete('/comments/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id)
    logAction(req, 'Eliminar comentario')
    res.json({ message: 'Comentario eliminado' })
  } catch (error) {
    logError('Delete comment', error)
    res.status(500).json({ message: 'Error al eliminar comentario' })
  }
})

export default router
