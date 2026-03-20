import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'
import { notifyNewCard } from '../services/teams.js'
import { logAction, logNotification, logError } from '../utils/logger.js'

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
    if (name !== undefined) logAction(req, 'Renombrar columna', { column: name })
    if (position !== undefined) logAction(req, 'Mover columna', { column: column.name, nuevaPosicion: position })
    res.json(column)
  } catch (error) {
    logError('Update column', error)
    res.status(500).json({ message: 'Error al actualizar columna' })
  }
})

// Delete column
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const column = await db.prepare('SELECT name FROM columns WHERE id = ?').get(req.params.id)
    await db.prepare('DELETE FROM columns WHERE id = ?').run(req.params.id)
    logAction(req, 'Eliminar columna', { column: column?.name })
    res.json({ message: 'Columna eliminada' })
  } catch (error) {
    logError('Delete column', error)
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

    // Get column and board info for logging
    const column = await db.prepare('SELECT * FROM columns WHERE id = ?').get(req.params.columnId)
    const board = column ? await db.prepare('SELECT * FROM boards WHERE id = ?').get(column.board_id) : null

    logAction(req, 'Crear tarjeta', { title, board: board?.name, column: column?.name, priority: priority || 'sin prioridad' })

    // Notify board responsible (async, don't block response)
    if (board && board.responsible_id && board.responsible_id !== req.user.id) {
      ;(async () => {
        try {
          const responsible = await db.prepare(
            'SELECT id, name, teams_conversation_ref, teams_webhook FROM users WHERE id = ?'
          ).get(board.responsible_id)

          if (!responsible) {
            logNotification('Nueva tarjeta', board.responsible_id, false, { reason: 'usuario no encontrado' })
            return
          }

          const appUrl = process.env.APP_URL || 'https://planner-trello-production.up.railway.app'
          const cardUrl = `${appUrl}/board/${column.board_id}?card=${cardId}`

          const sent = await notifyNewCard(
            responsible,
            req.user.name,
            title,
            column.name,
            board.name,
            priority || null,
            cardUrl
          )
          logNotification('Nueva tarjeta', responsible.name, sent, {
            board: board.name,
            card: title,
            via: responsible.teams_conversation_ref ? 'bot' : responsible.teams_webhook ? 'webhook' : 'sin canal'
          })
        } catch (err) {
          logError('Notificacion nueva tarjeta', err)
        }
      })()
    } else if (board && !board.responsible_id) {
      logNotification('Nueva tarjeta', '-', false, { reason: 'tablero sin responsable', board: board.name })
    }

    res.status(201).json({ ...card, assignees: [], labels: [], comments_count: 0 })
  } catch (error) {
    logError('Create card', error)
    res.status(500).json({ message: 'Error al crear tarjeta' })
  }
})

export default router
