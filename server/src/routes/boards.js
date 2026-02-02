import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Get all boards for user
router.get('/', authenticateToken, (req, res) => {
  try {
    const boards = db.prepare(`
      SELECT DISTINCT b.*
      FROM boards b
      LEFT JOIN board_members bm ON b.id = bm.board_id
      WHERE b.owner_id = ? OR bm.user_id = ?
      ORDER BY b.created_at DESC
    `).all(req.user.id, req.user.id)

    res.json(boards)
  } catch (error) {
    console.error('Get boards error:', error)
    res.status(500).json({ message: 'Error al obtener tableros' })
  }
})

// Get single board with columns and cards
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id)

    if (!board) {
      return res.status(404).json({ message: 'Tablero no encontrado' })
    }

    const columns = db.prepare(`
      SELECT * FROM columns
      WHERE board_id = ?
      ORDER BY position
    `).all(req.params.id)

    // Get cards for each column with assignees and labels
    const columnsWithCards = columns.map(column => {
      const cards = db.prepare(`
        SELECT c.*,
          (SELECT COUNT(*) FROM comments WHERE card_id = c.id) as comments_count
        FROM cards c
        WHERE c.column_id = ?
        ORDER BY c.position
      `).all(column.id)

      const cardsWithDetails = cards.map(card => {
        const assignees = db.prepare(`
          SELECT u.id, u.name, u.email, u.department
          FROM card_assignees ca
          JOIN users u ON ca.user_id = u.id
          WHERE ca.card_id = ?
        `).all(card.id)

        const labels = db.prepare(`
          SELECT * FROM card_labels WHERE card_id = ?
        `).all(card.id)

        return { ...card, assignees, labels }
      })

      return { ...column, cards: cardsWithDetails }
    })

    res.json({ board, columns: columnsWithCards })
  } catch (error) {
    console.error('Get board error:', error)
    res.status(500).json({ message: 'Error al obtener tablero' })
  }
})

// Create board
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, description } = req.body
    const boardId = uuidv4()

    db.prepare(`
      INSERT INTO boards (id, name, description, owner_id)
      VALUES (?, ?, ?, ?)
    `).run(boardId, name, description || null, req.user.id)

    // Add owner as member
    db.prepare(`
      INSERT INTO board_members (board_id, user_id, role)
      VALUES (?, ?, 'admin')
    `).run(boardId, req.user.id)

    // Create default columns
    const defaultColumns = ['Por hacer', 'En progreso', 'Hecho']
    defaultColumns.forEach((colName, index) => {
      db.prepare(`
        INSERT INTO columns (id, board_id, name, position)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), boardId, colName, index)
    })

    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId)
    res.status(201).json(board)
  } catch (error) {
    console.error('Create board error:', error)
    res.status(500).json({ message: 'Error al crear tablero' })
  }
})

// Update board
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { name, description } = req.body

    db.prepare(`
      UPDATE boards SET name = ?, description = ?
      WHERE id = ?
    `).run(name, description, req.params.id)

    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id)
    res.json(board)
  } catch (error) {
    console.error('Update board error:', error)
    res.status(500).json({ message: 'Error al actualizar tablero' })
  }
})

// Delete board
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM boards WHERE id = ?').run(req.params.id)
    res.json({ message: 'Tablero eliminado' })
  } catch (error) {
    console.error('Delete board error:', error)
    res.status(500).json({ message: 'Error al eliminar tablero' })
  }
})

// Add column to board
router.post('/:boardId/columns', authenticateToken, (req, res) => {
  try {
    const { name } = req.body
    const columnId = uuidv4()

    // Get max position
    const maxPos = db.prepare(`
      SELECT MAX(position) as max FROM columns WHERE board_id = ?
    `).get(req.params.boardId)

    const position = (maxPos?.max ?? -1) + 1

    db.prepare(`
      INSERT INTO columns (id, board_id, name, position)
      VALUES (?, ?, ?, ?)
    `).run(columnId, req.params.boardId, name, position)

    const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(columnId)
    res.status(201).json(column)
  } catch (error) {
    console.error('Create column error:', error)
    res.status(500).json({ message: 'Error al crear columna' })
  }
})

// Get board members
router.get('/:boardId/members', authenticateToken, (req, res) => {
  try {
    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.department, bm.role
      FROM board_members bm
      JOIN users u ON bm.user_id = u.id
      WHERE bm.board_id = ?
    `).all(req.params.boardId)

    res.json(members)
  } catch (error) {
    console.error('Get members error:', error)
    res.status(500).json({ message: 'Error al obtener miembros' })
  }
})

// Add board member
router.post('/:boardId/members', authenticateToken, (req, res) => {
  try {
    const { userId } = req.body

    db.prepare(`
      INSERT OR IGNORE INTO board_members (board_id, user_id, role)
      VALUES (?, ?, 'member')
    `).run(req.params.boardId, userId)

    res.json({ message: 'Miembro agregado' })
  } catch (error) {
    console.error('Add member error:', error)
    res.status(500).json({ message: 'Error al agregar miembro' })
  }
})

export default router
