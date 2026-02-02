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

    let movedCard = null
    setColumns(prev => {
      const newColumns = prev.map(col => ({
        ...col,
        cards: (col.cards || []).filter(card => {
          if (card.id === cardId) {
            movedCard = card
            return false
          }
          return true
        })
      }))

      return newColumns.map(col => {
        if (col.id === targetColumnId && movedCard) {
          const cards = [...(col.cards || [])]
          cards.splice(position, 0, { ...movedCard, column_id: targetColumnId })
          return { ...col, cards }
        }
        return col
      })
    })
  }

  const deleteCard = async (cardId) => {
    await cardService.deleteCard(cardId)
    setColumns(prev => prev.map(col => ({
      ...col,
      cards: (col.cards || []).filter(card => card.id !== cardId)
    })))
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
      createColumn,
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
