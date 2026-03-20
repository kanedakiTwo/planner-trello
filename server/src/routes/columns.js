import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'
import { notifyNewCard } from '../services/teams.js'

const router = Router()

// Update column
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, position } = req.body

    if (name !== undefined) {
      await db.prepare('UPDATE columns SET name = ? WHERE id = ?').run(name, req.params.id)
    }

    if (position !== undefined) {
      await db.prepare('UPDATE columns SET position = ? WHERE id = ?').run(position, req.params.id)
    }

    const column = await db.prepare('SELECT * FROM columns WHERE id = ?').get(req.params.id)
    res.json(column)
  } catch (error) {
    console.error('Update column error:', error)
    res.status(500).json({ message: 'Error al actualizar columna' })
  }
})

// Delete column
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare('DELETE FROM columns WHERE id = ?').run(req.params.id)
    res.json({ message: 'Columna eliminada' })
  } catch (error) {
    console.error('Delete column error:', error)
    res.status(500).json({ message: 'Error al eliminar columna' })
  }
})

// Create card in column
router.post('/:columnId/cards', authenticateToken, async (req, res) => {
  try {
    const { title, description, priority, due_date } = req.body
    const cardId = uuidv4()

    // Get max position
    const maxPos = await db.prepare(`
      SELECT MAX(position) as max FROM cards WHERE column_id = ?
    `).get(req.params.columnId)

    const position = (maxPos?.max ?? -1) + 1

    await db.prepare(`
      INSERT INTO cards (id, column_id, title, description, priority, due_date, position, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(cardId, req.params.columnId, title, description || null, priority || null, due_date || null, position, req.user.id)

    const card = await db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId)

    // Notify board responsible (async, don't block response)
    ;(async () => {
      try {
        const column = await db.prepare('SELECT * FROM columns WHERE id = ?').get(req.params.columnId)
        if (!column) return

        const board = await db.prepare('SELECT * FROM boards WHERE id = ?').get(column.board_id)
        if (!board || !board.responsible_id) return

        // Don't notify if the creator IS the responsible
        if (board.responsible_id === req.user.id) return

        const responsible = await db.prepare(
          'SELECT id, name, teams_conversation_ref, teams_webhook FROM users WHERE id = ?'
        ).get(board.responsible_id)

        if (!responsible) return

        const appUrl = process.env.APP_URL || 'https://planner-trello-production.up.railway.app'
        const cardUrl = `${appUrl}/board/${column.board_id}?card=${cardId}`

        notifyNewCard(
          responsible,
          req.user.name,
          title,
          column.name,
          board.name,
          priority || null,
          cardUrl
        ).catch(err => console.error('New card notification error:', err))
      } catch (err) {
        console.error('Error preparing new card notification:', err)
      }
    })()

    res.status(201).json({ ...card, assignees: [], labels: [], comments_count: 0 })
  } catch (error) {
    console.error('Create card error:', error)
    res.status(500).json({ message: 'Error al crear tarjeta' })
  }
})

export default router
