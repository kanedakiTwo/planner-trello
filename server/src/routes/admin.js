import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import db from '../database/db.js'
import { authenticateToken, authorizeAdmin } from '../middleware/auth.js'

const router = Router()

// All admin routes require authentication + admin role
router.use(authenticateToken, authorizeAdmin)

// GET /api/admin/users — List all users
router.get('/users', async (req, res) => {
  try {
    const users = await db.prepare(
      `SELECT id, email, name, department, role, active, created_at,
        teams_conversation_ref IS NOT NULL as teams_linked,
        teams_webhook IS NOT NULL as has_webhook
      FROM users ORDER BY created_at DESC`
    ).all()
    res.json(users)
  } catch (error) {
    console.error('Admin list users error:', error)
    res.status(500).json({ message: 'Error al obtener usuarios' })
  }
})

// POST /api/admin/users — Create user
router.post('/users', async (req, res) => {
  try {
    const { email, password, name, department, role } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, contraseña y nombre son obligatorios' })
    }

    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) {
      return res.status(400).json({ message: 'El email ya esta registrado' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const userId = uuidv4()
    const userRole = role === 'admin' ? 'admin' : 'user'

    await db.prepare(`
      INSERT INTO users (id, email, password_hash, name, department, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, email, passwordHash, name, department || null, userRole)

    res.status(201).json({
      id: userId,
      email,
      name,
      department: department || null,
      role: userRole
    })
  } catch (error) {
    console.error('Admin create user error:', error)
    res.status(500).json({ message: 'Error al crear usuario' })
  }
})

// DELETE /api/admin/users/:id — Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' })
    }

    const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id)
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    const userId = req.params.id

    // Clean up foreign key dependencies (non-CASCADE references)
    await db.prepare('DELETE FROM attachments WHERE uploaded_by = ?').run(userId)
    await db.prepare('DELETE FROM comments WHERE user_id = ?').run(userId)
    await db.prepare('DELETE FROM cards WHERE created_by = ?').run(userId)
    await db.prepare('DELETE FROM boards WHERE owner_id = ?').run(userId)

    // These have ON DELETE CASCADE but clean explicitly just in case
    await db.prepare('DELETE FROM card_assignees WHERE user_id = ?').run(userId)
    await db.prepare('DELETE FROM board_members WHERE user_id = ?').run(userId)
    await db.prepare('DELETE FROM mentions WHERE user_id = ?').run(userId)

    await db.prepare('DELETE FROM users WHERE id = ?').run(userId)
    res.json({ message: 'Usuario eliminado' })
  } catch (error) {
    console.error('Admin delete user error:', error)
    res.status(500).json({ message: 'Error al eliminar usuario' })
  }
})

// PATCH /api/admin/users/:id/role — Change user role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body
    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ message: 'Rol debe ser "admin" o "user"' })
    }

    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'No puedes cambiar tu propio rol' })
    }

    await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id)
    res.json({ message: 'Rol actualizado' })
  } catch (error) {
    console.error('Admin update role error:', error)
    res.status(500).json({ message: 'Error al actualizar rol' })
  }
})

// PATCH /api/admin/users/:id/active — Toggle user active status
router.patch('/users/:id/active', async (req, res) => {
  try {
    const { active } = req.body
    if (typeof active !== 'boolean') {
      return res.status(400).json({ message: 'active debe ser true o false' })
    }

    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'No puedes desactivarte a ti mismo' })
    }

    await db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active, req.params.id)
    res.json({ message: active ? 'Usuario activado' : 'Usuario desactivado' })
  } catch (error) {
    console.error('Admin toggle active error:', error)
    res.status(500).json({ message: 'Error al cambiar estado del usuario' })
  }
})

// ---- Departments CRUD ----

// GET /api/admin/departments
router.get('/departments', async (req, res) => {
  try {
    const departments = await db.prepare('SELECT * FROM departments ORDER BY position, name').all()
    res.json(departments)
  } catch (error) {
    console.error('Admin list departments error:', error)
    res.status(500).json({ message: 'Error al obtener departamentos' })
  }
})

// POST /api/admin/departments
router.post('/departments', async (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' })

    const existing = await db.prepare('SELECT id FROM departments WHERE name = ?').get(name.trim())
    if (existing) return res.status(400).json({ message: 'Ya existe un departamento con ese nombre' })

    const maxPos = await db.prepare('SELECT MAX(position) as max FROM departments').get()
    const position = (maxPos?.max ?? -1) + 1
    const id = uuidv4()

    await db.prepare('INSERT INTO departments (id, name, position) VALUES (?, ?, ?)').run(id, name.trim(), position)
    res.status(201).json({ id, name: name.trim(), position })
  } catch (error) {
    console.error('Admin create department error:', error)
    res.status(500).json({ message: 'Error al crear departamento' })
  }
})

// PATCH /api/admin/departments/:id
router.patch('/departments/:id', async (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' })

    await db.prepare('UPDATE departments SET name = ? WHERE id = ?').run(name.trim(), req.params.id)
    res.json({ message: 'Departamento actualizado' })
  } catch (error) {
    console.error('Admin update department error:', error)
    res.status(500).json({ message: 'Error al actualizar departamento' })
  }
})

// DELETE /api/admin/departments/:id
router.delete('/departments/:id', async (req, res) => {
  try {
    await db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id)
    res.json({ message: 'Departamento eliminado' })
  } catch (error) {
    console.error('Admin delete department error:', error)
    res.status(500).json({ message: 'Error al eliminar departamento' })
  }
})

export default router
