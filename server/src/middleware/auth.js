import jwt from 'jsonwebtoken'
import db from '../database/db.js'

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Token de autenticacion requerido' })
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET)
    req.user = user
    next()
  } catch (error) {
    return res.status(403).json({ message: 'Token invalido o expirado' })
  }
}

export async function authorizeAdmin(req, res, next) {
  try {
    // If JWT doesn't have role (old token), check DB
    let role = req.user.role
    if (!role) {
      const user = await db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id)
      role = user?.role
    }
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Acceso no autorizado' })
    }
    next()
  } catch (error) {
    console.error('authorizeAdmin error:', error)
    return res.status(500).json({ message: 'Error de autorizacion' })
  }
}
