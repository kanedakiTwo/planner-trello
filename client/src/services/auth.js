import { api } from './api'

export const login = (email, password) =>
  api.post('/auth/login', { email, password })

export const register = (userData) =>
  api.post('/auth/register', userData)

export const getProfile = () =>
  api.get('/auth/profile')

export const getUsers = () =>
  api.get('/users')

export const getUserSettings = () =>
  api.get('/users/me/settings')

export const updateTeamsWebhook = (webhookUrl) =>
  api.put('/users/me/teams-webhook', { webhookUrl })

export const linkTeamsAccount = (code) =>
  api.post('/users/me/teams-link', { code })

export const unlinkTeamsAccount = () =>
  api.delete('/users/me/teams-link')

// Admin endpoints
export const getAdminUsers = () =>
  api.get('/admin/users')

export const createAdminUser = (userData) =>
  api.post('/admin/users', userData)

export const deleteAdminUser = (userId) =>
  api.delete(`/admin/users/${userId}`)

export const updateUserRole = (userId, role) =>
  api.patch(`/admin/users/${userId}/role`, { role })

export const toggleUserActive = (userId, active) =>
  api.patch(`/admin/users/${userId}/active`, { active })

// Departments (public)
export const getDepartments = () =>
  api.get('/departments')

// Departments (admin)
export const createDepartment = (name) =>
  api.post('/admin/departments', { name })

export const updateDepartment = (id, name) =>
  api.patch(`/admin/departments/${id}`, { name })

export const deleteDepartment = (id) =>
  api.delete(`/admin/departments/${id}`)
