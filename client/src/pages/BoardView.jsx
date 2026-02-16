import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DndContext, DragOverlay, closestCorners, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useBoard } from '../context/BoardContext'
import { useAuth } from '../context/AuthContext'
import { getBoardColor } from '../utils/boardColors'
import Column from '../components/Column/Column'
import Card from '../components/Card/Card'
import CardModal from '../components/Card/CardModal'

export default function BoardView() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, logout } = useAuth()
  const { currentBoard, columns, fetchBoard, createColumn, moveCard, updateBoard, deleteBoard, loading, setColumns } = useBoard()
  const [activeCard, setActiveCard] = useState(null)
  const [showColumnForm, setShowColumnForm] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [selectedCard, setSelectedCard] = useState(null)
  const [editingBoardName, setEditingBoardName] = useState(false)
  const [boardName, setBoardName] = useState('')
  const dragSourceRef = useRef(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    fetchBoard(boardId)
  }, [boardId, fetchBoard])

  useEffect(() => {
    if (currentBoard) setBoardName(currentBoard.name)
  }, [currentBoard])

  // Deep link: open card from ?card= query param
  useEffect(() => {
    const cardId = searchParams.get('card')
    if (cardId && columns.length > 0) {
      const card = columns.flatMap(col => col.cards || []).find(c => c.id === cardId)
      if (card) setSelectedCard(card)
    }
  }, [searchParams, columns])

  // Find which column contains a card
  const findColumnByCardId = useCallback((cardId) => {
    return columns.find(col => (col.cards || []).some(c => c.id === cardId))
  }, [columns])

  const handleDragStart = (event) => {
    const { active } = event
    const card = columns
      .flatMap(col => col.cards || [])
      .find(c => c.id === active.id)
    setActiveCard(card)
    // Remember original position for the API call
    dragSourceRef.current = card ? { columnId: card.column_id } : null
  }

  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over || !active) return

    const activeId = active.id
    const overId = over.id

    // Find which columns the active and over items belong to
    const activeColumn = findColumnByCardId(activeId)
    if (!activeColumn) return

    // Check if we're over a column directly or a card
    const overColumn = columns.find(col => col.id === overId) || findColumnByCardId(overId)
    if (!overColumn) return

    // Only handle cross-column moves here
    if (activeColumn.id === overColumn.id) return

    setColumns(prev => {
      const activeCards = [...(prev.find(c => c.id === activeColumn.id)?.cards || [])]
      const overCards = [...(prev.find(c => c.id === overColumn.id)?.cards || [])]

      const activeIndex = activeCards.findIndex(c => c.id === activeId)
      if (activeIndex === -1) return prev

      const [movedCard] = activeCards.splice(activeIndex, 1)
      const updatedCard = { ...movedCard, column_id: overColumn.id }

      // Find insertion index
      const overCardIndex = overCards.findIndex(c => c.id === overId)
      if (overCardIndex >= 0) {
        overCards.splice(overCardIndex, 0, updatedCard)
      } else {
        overCards.push(updatedCard)
      }

      return prev.map(col => {
        if (col.id === activeColumn.id) return { ...col, cards: activeCards }
        if (col.id === overColumn.id) return { ...col, cards: overCards }
        return col
      })
    })
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const activeId = active.id
    const overId = over.id
    const sourceColumnId = dragSourceRef.current?.columnId

    // Find where the card is NOW (after handleDragOver moved it in state)
    const currentColumn = findColumnByCardId(activeId)
    if (!currentColumn) return

    const overIsColumn = columns.some(col => col.id === overId)

    // Detect cross-column using the ORIGINAL column saved at drag start
    const isCrossColumn = sourceColumnId && sourceColumnId !== currentColumn.id

    if (isCrossColumn) {
      // Cross-column — state already updated by handleDragOver, just call API
      const position = (currentColumn.cards || []).findIndex(c => c.id === activeId)
      moveCard(activeId, currentColumn.id, position >= 0 ? position : 0).catch(console.error)
    } else {
      // Same column reordering
      const cards = currentColumn.cards || []
      const oldIndex = cards.findIndex(c => c.id === activeId)
      const newIndex = overIsColumn ? cards.length - 1 : cards.findIndex(c => c.id === overId)

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(cards, oldIndex, newIndex)
        setColumns(prev => prev.map(col =>
          col.id === currentColumn.id ? { ...col, cards: reordered } : col
        ))
        moveCard(activeId, currentColumn.id, newIndex).catch(console.error)
      }
    }

    dragSourceRef.current = null
  }

  const handleAddColumn = async (e) => {
    e.preventDefault()
    if (!newColumnName.trim()) return
    await createColumn(boardId, { name: newColumnName })
    setNewColumnName('')
    setShowColumnForm(false)
  }

  const handleBoardNameSave = async () => {
    if (boardName.trim() && boardName !== currentBoard?.name) {
      await updateBoard(boardId, { name: boardName.trim(), description: currentBoard?.description })
    }
    setEditingBoardName(false)
  }

  const handleDeleteBoard = async () => {
    if (!confirm('Eliminar este tablero y todas sus tarjetas?')) return
    await deleteBoard(boardId)
    navigate('/')
  }

  if (loading && !currentBoard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-aikit-400 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${getBoardColor(boardId).gradient} flex flex-col`}>
      {/* Header */}
      <header className="bg-black/15 backdrop-blur-md border-b border-white/10">
        <div className="px-5 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            {editingBoardName ? (
              <input
                type="text"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                onBlur={handleBoardNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleBoardNameSave()
                  if (e.key === 'Escape') { setBoardName(currentBoard?.name || ''); setEditingBoardName(false) }
                }}
                className="text-lg font-bold bg-white/15 text-white rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-white/30 font-sans"
                autoFocus
              />
            ) : (
              <h1
                className="text-lg font-bold text-white cursor-pointer hover:bg-white/10 rounded-lg px-3 py-1 transition-colors font-sans"
                onClick={() => setEditingBoardName(true)}
                title="Click para editar nombre"
              >
                {currentBoard?.name}
              </h1>
            )}
            <button
              onClick={handleDeleteBoard}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-red-300 hover:bg-white/10 transition-colors"
              title="Eliminar tablero"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80 font-medium hidden sm:block">{user?.name}</span>
            <div className="w-8 h-8 bg-white/15 rounded-xl flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <button onClick={logout} className="text-xs text-white/60 hover:text-white transition-colors">
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 items-start h-full">
            {columns.map(column => (
              <Column
                key={column.id}
                column={column}
                onCardClick={(card) => {
                  setSelectedCard(card)
                  setSearchParams({ card: card.id }, { replace: true })
                }}
              />
            ))}

            {/* Add column button */}
            <div className="flex-shrink-0 w-72">
              {showColumnForm ? (
                <form onSubmit={handleAddColumn} className="bg-white/15 backdrop-blur-sm rounded-xl p-3">
                  <input
                    type="text"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowColumnForm(false)
                        setNewColumnName('')
                      }
                    }}
                    placeholder="Nombre de la columna (Enter para crear)"
                    className="w-full px-3 py-2 rounded-lg bg-white/90 border-0 focus:ring-2 focus:ring-white/50 outline-none text-sm text-gray-800 placeholder-gray-400 mb-2"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="bg-white text-aikit-600 px-3 py-1.5 rounded-lg hover:bg-white/90 text-sm font-medium transition-colors">
                      Crear
                    </button>
                    <button type="button" onClick={() => setShowColumnForm(false)} className="text-white/70 hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowColumnForm(true)}
                  className="w-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-xl p-3 text-left flex items-center gap-2 transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Anadir columna
                </button>
              )}
            </div>
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
            {activeCard && <Card card={activeCard} isDragging />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Card Modal */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => {
            setSelectedCard(null)
            if (searchParams.has('card')) {
              searchParams.delete('card')
              setSearchParams(searchParams, { replace: true })
            }
          }}
        />
      )}
    </div>
  )
}
