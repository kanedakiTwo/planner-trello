import { api } from './api'

export const createCard = (columnId, cardData) =>
  api.post(`/columns/${columnId}/cards`, cardData)

export const getCard = (cardId) =>
  api.get(`/cards/${cardId}`)

export const updateCard = (cardId, cardData) =>
  api.put(`/cards/${cardId}`, cardData)

export const deleteCard = (cardId) =>
  api.delete(`/cards/${cardId}`)

export const moveCard = (cardId, columnId, position) =>
  api.patch(`/cards/${cardId}/move`, { columnId, position })

export const addAssignee = (cardId, userId) =>
  api.post(`/cards/${cardId}/assignees`, { userId })

export const removeAssignee = (cardId, userId) =>
  api.delete(`/cards/${cardId}/assignees/${userId}`)

export const addLabel = (cardId, labelData) =>
  api.post(`/cards/${cardId}/labels`, labelData)

export const removeLabel = (cardId, labelId) =>
  api.delete(`/cards/${cardId}/labels/${labelId}`)

export const getComments = (cardId) =>
  api.get(`/cards/${cardId}/comments`)

export const addComment = (cardId, content) =>
  api.post(`/cards/${cardId}/comments`, { content })

export const deleteComment = (commentId) =>
  api.delete(`/comments/${commentId}`)
