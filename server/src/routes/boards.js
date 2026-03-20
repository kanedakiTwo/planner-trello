import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'
import { logAction, logError } from '../utils/logger.js'

const router = Router()

// Get all boards (shared between all users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const boards = await db.prepare(`
      SELECT b.*, u.name as owner_name, r.name as responsible_name
      FROM boards b
      JOIN users u ON b.owner_id = u.id
      LEFT JOIN users r ON b.responsible_id = r.id
      ORDER BY b.created_at DESC
    `).all()

    res.json(boards)
  } catch (error) {
    logError('Get boards', error)
    res.status(500).json({ message: 'Error al obtener tableros' })
  }
})

// Get single board with columns and cards
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const board = await db.prepare(`
      SELECT b.*, r.name as responsible_name
      FROM boards b
      LEFT JOIN users r ON b.responsible_id = r.id
      WHERE b.id = ?
    `).get(req.params.id)

    if (!board) {
      return res.status(404).json({ message: 'Tablero no encontrado' })
    }

    const columns = await db.prepare(`
      SELECT * FROM columns
      WHERE board_id = ?
      ORDER BY position
    `).all(req.params.id)

    // Get cards for each column with assignees and labels
    const columnsWithCards = await Promise.all(columns.map(async column => {
      const cards = await db.prepare(`
        SELECT c.*,
          (SELECT COUNT(*) FROM comments WHERE card_id = c.id) as comments_count,
          u.name as created_by_name
        FROM cards c
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.column_id = ?
        ORDER BY c.position
      `).all(column.id)

      const cardsWithDetails = await Promise.all(cards.map(async card => {
        const assignees = await db.prepare(`
          SELECT u.id, u.name, u.email, u.department
          FROM card_assignees ca
          JOIN users u ON ca.user_id = u.id
          WHERE ca.card_id = ?
        `).all(card.id)

        const labels = await db.prepare(`
          SELECT * FROM card_labels WHERE card_id = ?
        `).all(card.id)

        return { ...card, assignees, labels }
      }))

      return { ...column, cards: cardsWithDetails }
    }))

    const colPositions = columnsWithCards.map(c => `${c.name}:${c.position}`).join(', ')
    logAction(req, 'Ver tablero', { board: board.name, columnas: colPositions })
    res.json({ board, columns: columnsWithCards })
  } catch (error) {
    logError('Get board', error)
    res.status(500).json({ message: 'Error al obtener tablero' })
  }
})

// Create board
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, responsible_id } = req.body
    const boardId = uuidv4()

    await db.prepare(`
      INSERT INTO boards (id, name, description, owner_id, responsible_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(boardId, name, description || null, req.user.id, responsible_id || null)

    // Add owner as member
    await db.prepare(`
      INSERT INTO board_members (board_id, user_id, role)
      VALUES (?, ?, 'admin')
    `).run(boardId, req.user.id)

    // Create default columns
    const defaultColumns = ['Por hacer', 'En progreso', 'Hecho']
    for (let index = 0; index < defaultColumns.length; index++) {
      await db.prepare(`
        INSERT INTO columns (id, board_id, name, position)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), boardId, defaultColumns[index], index)
    }

    const board = await db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId)
    logAction(req, 'Crear tablero', { board: name, responsible: responsible_id || 'ninguno' })
    res.status(201).json(board)
  } catch (error) {
    logError('Create board', error)
    res.status(500).json({ message: 'Error al crear tablero' })
  }
})

// Update board
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, responsible_id } = req.body

    const updates = []
    const values = []

    if (name !== undefined) {
      updates.push('name = ?')
      values.push(name)
    }
    if (description !== undefined) {
      updates.push('description = ?')
      values.push(description)
    }
    if (responsible_id !== undefined) {
      updates.push('responsible_id = ?')
      values.push(responsible_id || null)
    }

    if (updates.length > 0) {
      values.push(req.params.id)
      await db.prepare(`UPDATE boards SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    }

    const board = await db.prepare(`
      SELECT b.*, r.name as responsible_name
      FROM boards b
      LEFT JOIN users r ON b.responsible_id = r.id
      WHERE b.id = ?
    `).get(req.params.id)

    logAction(req, 'Actualizar tablero', { board: board.name, responsible: board.responsible_name || 'ninguno' })
    res.json(board)
  } catch (error) {
    logError('Update board', error)
    res.status(500).json({ message: 'Error al actualizar tablero' })
  }
})

// Delete board
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const board = await db.prepare('SELECT name FROM boards WHERE id = ?').get(req.params.id)
    await db.prepare('DELETE FROM boards WHERE id = ?').run(req.params.id)
    logAction(req, 'Eliminar tablero', { board: board?.name })
    res.json({ message: 'Tablero eliminado' })
  } catch (error) {
    logError('Delete board', error)
    res.status(500).json({ message: 'Error al eliminar tablero' })
  }
})

// Add column to board
router.post('/:boardId/columns', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body
    const columnId = uuidv4()

    // Get max position
    const maxPos = await db.prepare(`
      SELECT MAX(position) as max FROM columns WHERE board_id = ?
    `).get(req.params.boardId)

    const position = (maxPos?.max ?? -1) + 1

    await db.prepare(`
      INSERT INTO columns (id, board_id, name, position)
      VALUES (?, ?, ?, ?)
    `).run(columnId, req.params.boardId, name, position)

    const column = await db.prepare('SELECT * FROM columns WHERE id = ?').get(columnId)
    logAction(req, 'Crear columna', { column: name })
    res.status(201).json(column)
  } catch (error) {
    logError('Create column', error)
    res.status(500).json({ message: 'Error al crear columna' })
  }
})

// Get board members
router.get('/:boardId/members', authenticateToken, async (req, res) => {
  try {
    const members = await db.prepare(`
      SELECT u.id, u.name, u.email, u.department, bm.role
      FROM board_members bm
      JOIN users u ON bm.user_id = u.id
      WHERE bm.board_id = ?
    `).all(req.params.boardId)

    res.json(members)
  } catch (error) {
    logError('Get members', error)
    res.status(500).json({ message: 'Error al obtener miembros' })
  }
})

// Add board member
router.post('/:boardId/members', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body

    await db.prepare(`
      INSERT INTO board_members (board_id, user_id, role)
      VALUES (?, ?, 'member')
      ON CONFLICT DO NOTHING
    `).run(req.params.boardId, userId)

    logAction(req, 'Agregar miembro', { userId })
    res.json({ message: 'Miembro agregado' })
  } catch (error) {
    logError('Add member', error)
    res.status(500).json({ message: 'Error al agregar miembro' })
  }
})

export default router
