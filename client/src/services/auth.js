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
