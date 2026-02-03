import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { upload, cloudinary } from '../config/cloudinary.js'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Get attachments for a card
router.get('/cards/:cardId/attachments', authenticateToken, async (req, res) => {
  try {
    const attachments = await db.prepare(`
      SELECT a.*, u.name as uploaded_by_name
      FROM attachments a
      JOIN users u ON a.uploaded_by = u.id
      WHERE a.card_id = ?
      ORDER BY a.created_at DESC
    `).all(req.params.cardId)

    res.json(attachments)
  } catch (error) {
    console.error('Get attachments error:', error)
    res.status(500).json({ message: 'Error al obtener adjuntos' })
  }
})

// Upload attachment
router.post('/cards/:cardId/attachments', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se ha proporcionado archivo' })
    }

    const attachmentId = uuidv4()
    const { originalname } = req.file
    const { path: url, filename: public_id } = req.file

    // Get file info
    const fileType = req.file.mimetype
    const fileSize = req.file.size

    await db.prepare(`
      INSERT INTO attachments (id, card_id, filename, url, public_id, file_type, file_size, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(attachmentId, req.params.cardId, originalname, url, public_id, fileType, fileSize, req.user.id)

    const attachment = await db.prepare(`
      SELECT a.*, u.name as uploaded_by_name
      FROM attachments a
      JOIN users u ON a.uploaded_by = u.id
      WHERE a.id = ?
    `).get(attachmentId)

    res.status(201).json(attachment)
  } catch (error) {
    console.error('Upload attachment error:', error)
    res.status(500).json({ message: 'Error al subir adjunto' })
  }
})

// Delete attachment
router.delete('/attachments/:id', authenticateToken, async (req, res) => {
  try {
    const attachment = await db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id)

    if (!attachment) {
      return res.status(404).json({ message: 'Adjunto no encontrado' })
    }

    // Delete from Cloudinary
    if (attachment.public_id) {
      try {
        await cloudinary.uploader.destroy(attachment.public_id)
      } catch (cloudinaryError) {
        console.error('Cloudinary delete error:', cloudinaryError)
      }
    }

    // Delete from database
    await db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.id)

    res.json({ message: 'Adjunto eliminado' })
  } catch (error) {
    console.error('Delete attachment error:', error)
    res.status(500).json({ message: 'Error al eliminar adjunto' })
  }
})

export default router
