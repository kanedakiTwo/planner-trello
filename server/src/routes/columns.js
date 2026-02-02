import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Update column
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { name, position } = req.body

    if (name !== undefined) {
      db.prepare('UPDATE columns SET name = ? WHERE id = ?').run(name, req.params.id)
    }

    if (position !== undefined) {
      db.prepare('UPDATE columns SET position = ? WHERE id = ?').run(position, req.params.id)
    }

    const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(req.params.id)
    res.json(column)
  } catch (error) {
    console.error('Update column error:', error)
    res.status(500).json({ message: 'Error al actualizar columna' })
  }
})

// Delete column
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM columns WHERE id = ?').run(req.params.id)
    res.json({ message: 'Columna eliminada' })
  } catch (error) {
    console.error('Delete column error:', error)
    res.status(500).json({ message: 'Error al eliminar columna' })
  }
})

// Create card in column
router.post('/:columnId/cards', authenticateToken, (req, res) => {
  try {
    const { title, description, priority, due_date } = req.body
    const cardId = uuidv4()

    // Get max position
    const maxPos = db.prepare(`
      SELECT MAX(position) as max FROM cards WHERE column_id = ?
    `).get(req.params.columnId)

    const position = (maxPos?.max ?? -1) + 1

    db.prepare(`
      INSERT INTO cards (id, column_id, title, description, priority, due_date, position, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(cardId, req.params.columnId, title, description || null, priority || null, due_date || null, position, req.user.id)

    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId)
    res.status(201).json({ ...card, assignees: [], labels: [], comments_count: 0 })
  } catch (error) {
    console.error('Create card error:', error)
    res.status(500).json({ message: 'Error al crear tarjeta' })
  }
})

export default router
