import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getAdminUsers, createAdminUser, deleteAdminUser, updateUserRole, toggleUserActive,
  getDepartments, createDepartment, updateDepartment, deleteDepartment
} from '../services/auth'

export default function Admin() {
  const { user, logout } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', department: '', role: 'user' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Departments state
  const [departments, setDepartments] = useState([])
  const [newDeptName, setNewDeptName] = useState('')
  const [editingDeptId, setEditingDeptId] = useState(null)
  const [editingDeptName, setEditingDeptName] = useState('')

  useEffect(() => {
    loadUsers()
    loadDepartments()
  }, [])

  // Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showModal) setShowModal(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showModal])

  const loadUsers = async () => {
    try {
      const data = await getAdminUsers()
      setUsers(data)
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const data = await getDepartments()
      setDepartments(data)
    } catch (err) {
      console.error('Error loading departments:', err)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      const newUser = await createAdminUser(formData)
      setUsers(prev => [newUser, ...prev])
      setFormData({ name: '', email: '', password: '', department: '', role: 'user' })
      setShowModal(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (userId, userName) => {
    if (!confirm(`Eliminar al usuario "${userName}"? Esta accion no se puede deshacer.`)) return
    try {
      await deleteAdminUser(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (err) {
      alert(err.message)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch (err) {
      alert(err.message)
    }
  }

  const handleToggleActive = async (userId, currentActive) => {
    const newActive = !(currentActive !== false)
    try {
      await toggleUserActive(userId, newActive)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: newActive } : u))
    } catch (err) {
      alert(err.message)
    }
  }

  // Department handlers
  const handleAddDept = async (e) => {
    e.preventDefault()
    if (!newDeptName.trim()) return
    try {
      const dept = await createDepartment(newDeptName.trim())
      setDepartments(prev => [...prev, dept])
      setNewDeptName('')
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSaveDeptEdit = async (id) => {
    if (!editingDeptName.trim()) return
    try {
      await updateDepartment(id, editingDeptName.trim())
      setDepartments(prev => prev.map(d => d.id === id ? { ...d, name: editingDeptName.trim() } : d))
      setEditingDeptId(null)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteDept = async (id, name) => {
    if (!confirm(`Eliminar el departamento "${name}"?`)) return
    try {
      await deleteDepartment(id)
      setDepartments(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-2xl text-aikit-800 hover:text-aikit-600 transition-colors">Planner</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-500">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-sm text-gray-400 hover:text-aikit-400 transition-colors"
            >
              Tableros
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <div className="text-right">
              <p className="text-sm font-medium text-[#0F0F0F]">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.department}</p>
            </div>
            <div className="w-9 h-9 bg-aikit-400 rounded-xl flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-1"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Users Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl text-[#0F0F0F]">Usuarios</h2>
            <p className="text-sm text-gray-400 mt-1">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setError('') }}
            className="bg-aikit-400 text-white px-5 py-2.5 rounded-xl hover:bg-aikit-500 active:bg-aikit-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm shadow-aikit-400/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear Usuario
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-aikit-400 border-t-transparent"></div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Nombre</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">Departamento</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Rol</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Estado</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isActive = u.active !== false
                  return (
                  <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${!isActive ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${isActive ? 'bg-aikit-400' : 'bg-gray-300'}`}>
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-[#0F0F0F]">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 hidden sm:table-cell">{u.department || '—'}</td>
                    <td className="px-6 py-4">
                      {u.id === user?.id ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-aikit-50 text-aikit-600">
                          {u.role === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
                      ) : (
                        <select
                          value={u.role === 'admin' ? 'admin' : 'user'}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 outline-none cursor-pointer"
                        >
                          <option value="user">Usuario</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.id === user?.id ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-600">
                          Activo
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(u.id, u.active)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-green-50 text-green-600 hover:bg-green-100'
                              : 'bg-red-50 text-red-500 hover:bg-red-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                          {isActive ? 'Activo' : 'Inactivo'}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                          title="Eliminar usuario"
                        >
                          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Departments Section */}
        <div className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl text-[#0F0F0F]">Departamentos</h2>
            <p className="text-sm text-gray-400 mt-1">Aparecen como opciones en el registro y al crear usuarios</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {departments.map(dept => (
                <div key={dept.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50/50 transition-colors group">
                  {editingDeptId === dept.id ? (
                    <input
                      type="text"
                      value={editingDeptName}
                      onChange={(e) => setEditingDeptName(e.target.value)}
                      onBlur={() => handleSaveDeptEdit(dept.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveDeptEdit(dept.id)
                        if (e.key === 'Escape') setEditingDeptId(null)
                      }}
                      className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 outline-none text-sm"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="text-sm text-[#0F0F0F] cursor-pointer hover:text-aikit-400 transition-colors"
                      onClick={() => { setEditingDeptId(dept.id); setEditingDeptName(dept.name) }}
                      title="Click para editar"
                    >
                      {dept.name}
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteDept(dept.id, dept.name)}
                    className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 ml-3"
                    title="Eliminar departamento"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add department */}
            <form onSubmit={handleAddDept} className="flex items-center gap-2 px-6 py-3 border-t border-gray-100">
              <input
                type="text"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="Nuevo departamento..."
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 outline-none text-sm"
                onKeyDown={(e) => { if (e.key === 'Escape') setNewDeptName('') }}
              />
              <button
                type="submit"
                disabled={!newDeptName.trim()}
                className="bg-aikit-400 text-white px-4 py-2 rounded-lg hover:bg-aikit-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Anadir
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl text-[#0F0F0F] mb-5">Crear nuevo usuario</h3>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 transition-colors outline-none text-sm"
                    placeholder="Nombre completo"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 transition-colors outline-none text-sm"
                    placeholder="email@empresa.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Contrasena</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 transition-colors outline-none text-sm"
                    placeholder="Minimo 6 caracteres"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Departamento</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 transition-colors outline-none text-sm"
                  >
                    <option value="">Sin departamento</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Rol</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 transition-colors outline-none text-sm"
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 mt-3">{error}</p>
              )}

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-aikit-400 text-white px-5 py-2.5 rounded-xl hover:bg-aikit-500 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {creating ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
