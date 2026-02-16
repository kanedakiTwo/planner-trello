import { createContext, useContext, useState, useCallback } from 'react'
import * as boardService from '../services/boards'
import * as cardService from '../services/cards'

const BoardContext = createContext(null)

export function BoardProvider({ children }) {
  const [boards, setBoards] = useState([])
  const [currentBoard, setCurrentBoard] = useState(null)
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchBoards = useCallback(async () => {
    setLoading(true)
    try {
      const data = await boardService.getBoards()
      setBoards(data)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBoard = useCallback(async (boardId) => {
    setLoading(true)
    try {
      const data = await boardService.getBoard(boardId)
      setCurrentBoard(data.board)
      setColumns(data.columns)
    } finally {
      setLoading(false)
    }
  }, [])

  const createBoard = async (boardData) => {
    const newBoard = await boardService.createBoard(boardData)
    setBoards(prev => [...prev, newBoard])
    return newBoard
  }

  const createColumn = async (boardId, columnData) => {
    const newColumn = await boardService.createColumn(boardId, columnData)
    setColumns(prev => [...prev, { ...newColumn, cards: [] }])
    return newColumn
  }

  const createCard = async (columnId, cardData) => {
    const newCard = await cardService.createCard(columnId, cardData)
    setColumns(prev => prev.map(col =>
      col.id === columnId
        ? { ...col, cards: [...(col.cards || []), newCard] }
        : col
    ))
    return newCard
  }

  const updateCard = async (cardId, cardData) => {
    const updatedCard = await cardService.updateCard(cardId, cardData)
    setColumns(prev => prev.map(col => ({
      ...col,
      cards: (col.cards || []).map(card =>
        card.id === cardId ? { ...card, ...updatedCard } : card
      )
    })))
    return updatedCard
  }

  const moveCard = async (cardId, targetColumnId, position) => {
    await cardService.moveCard(cardId, targetColumnId, position)
  }

  const deleteCard = async (cardId) => {
    await cardService.deleteCard(cardId)
    setColumns(prev => prev.map(col => ({
      ...col,
      cards: (col.cards || []).filter(card => card.id !== cardId)
    })))
  }

  const updateBoard = async (boardId, boardData) => {
    const updated = await boardService.updateBoard(boardId, boardData)
    setCurrentBoard(prev => ({ ...prev, ...updated }))
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, ...updated } : b))
    return updated
  }

  const deleteBoard = async (boardId) => {
    await boardService.deleteBoard(boardId)
    setBoards(prev => prev.filter(b => b.id !== boardId))
  }

  const updateColumn = async (columnId, columnData) => {
    const updated = await boardService.updateColumn(columnId, columnData)
    setColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, ...updated } : col
    ))
    return updated
  }

  const deleteColumn = async (columnId) => {
    await boardService.deleteColumn(columnId)
    setColumns(prev => prev.filter(col => col.id !== columnId))
  }

  return (
    <BoardContext.Provider value={{
      boards,
      currentBoard,
      columns,
      loading,
      fetchBoards,
      fetchBoard,
      createBoard,
      updateBoard,
      deleteBoard,
      createColumn,
      updateColumn,
      deleteColumn,
      createCard,
      updateCard,
      moveCard,
      deleteCard,
      setColumns
    }}>
      {children}
    </BoardContext.Provider>
  )
}

export function useBoard() {
  const context = useContext(BoardContext)
  if (!context) {
    throw new Error('useBoard must be used within a BoardProvider')
  }
  return context
}
