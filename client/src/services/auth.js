import { api } from './api'

export const login = (email, password) =>
  api.post('/auth/login', { email, password })

export const register = (userData) =>
  api.post('/auth/register', userData)

export const getProfile = () =>
  api.get('/auth/profile')

export const getUsers = () =>
  api.get('/users')
