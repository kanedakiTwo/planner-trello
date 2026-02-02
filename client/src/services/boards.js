import { api } from './api'

export const getBoards = () =>
  api.get('/boards')

export const getBoard = (boardId) =>
  api.get(`/boards/${boardId}`)

export const createBoard = (boardData) =>
  api.post('/boards', boardData)

export const updateBoard = (boardId, boardData) =>
  api.put(`/boards/${boardId}`, boardData)

export const deleteBoard = (boardId) =>
  api.delete(`/boards/${boardId}`)

export const createColumn = (boardId, columnData) =>
  api.post(`/boards/${boardId}/columns`, columnData)

export const updateColumn = (columnId, columnData) =>
  api.put(`/columns/${columnId}`, columnData)

export const deleteColumn = (columnId) =>
  api.delete(`/columns/${columnId}`)

export const getBoardMembers = (boardId) =>
  api.get(`/boards/${boardId}/members`)

export const addBoardMember = (boardId, userId) =>
  api.post(`/boards/${boardId}/members`, { userId })
