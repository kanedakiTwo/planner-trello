import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DndContext, DragOverlay, closestCorners, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useBoard } from '../context/BoardContext'
import { updateColumn as updateColumnPosition } from '../services/boards'
import { useAuth } from '../context/AuthContext'
import { getBoardColor } from '../utils/boardColors'
import { getUsers } from '../services/auth'
import Column from '../components/Column/Column'
import Card from '../components/Card/Card'
import CardModal from '../components/Card/CardModal'

export default function BoardView() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, logout } = useAuth()
  const { currentBoard, columns, fetchBoard, createColumn, moveCard, updateBoard, deleteBoard, loading, setColumns, moveColumn } = useBoard()
  const [activeCard, setActiveCard] = useState(null)
  const [activeColumn, setActiveColumn] = useState(null)
  const [showColumnForm, setShowColumnForm] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [selectedCard, setSelectedCard] = useState(null)
  const [editingBoardName, setEditingBoardName] = useState(false)
  const [boardName, setBoardName] = useState('')
  const [showResponsiblePicker, setShowResponsiblePicker] = useState(false)
  const [users, setUsers] = useState([])
  const responsibleRef = useRef(null)
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

  useEffect(() => {
    getUsers().then(setUsers).catch(console.error)
  }, [])

  // Close responsible picker on outside click
  useEffect(() => {
    if (!showResponsiblePicker) return
    const handleClick = (e) => {
      if (responsibleRef.current && !responsibleRef.current.contains(e.target)) {
        setShowResponsiblePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showResponsiblePicker])

  const handleChangeResponsible = async (userId) => {
    await updateBoard(boardId, { responsible_id: userId || null })
    setShowResponsiblePicker(false)
  }

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
    const type = active.data.current?.type

    if (type === 'column') {
      const col = columns.find(c => c.id === active.id)
      setActiveColumn(col || null)
      dragSourceRef.current = null
      return
    }

    const card = columns
      .flatMap(col => col.cards || [])
      .find(c => c.id === active.id)
    setActiveCard(card)
    dragSourceRef.current = card ? { columnId: card.column_id } : null
  }

  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over || !active) return

    // Ignore column-over-column here — handled in handleDragEnd
    if (active.data.current?.type === 'column') return

    const activeId = active.id
    const overId = over.id

    // Find which columns the active and over items belong to
    const activeCol = findColumnByCardId(activeId)
    if (!activeCol) return

    // Check if we're over a column directly or a card
    const overCol = columns.find(col => col.id === overId) || findColumnByCardId(overId)
    if (!overCol) return

    // Only handle cross-column moves here
    if (activeCol.id === overCol.id) return

    setColumns(prev => {
      const activeCards = [...(prev.find(c => c.id === activeCol.id)?.cards || [])]
      const overCards = [...(prev.find(c => c.id === overCol.id)?.cards || [])]

      const activeIndex = activeCards.findIndex(c => c.id === activeId)
      if (activeIndex === -1) return prev

      const [movedCard] = activeCards.splice(activeIndex, 1)
      const updatedCard = { ...movedCard, column_id: overCol.id }

      const overCardIndex = overCards.findIndex(c => c.id === overId)
      if (overCardIndex >= 0) {
        overCards.splice(overCardIndex, 0, updatedCard)
      } else {
        overCards.push(updatedCard)
      }

      return prev.map(col => {
        if (col.id === activeCol.id) return { ...col, cards: activeCards }
        if (col.id === overCol.id) return { ...col, cards: overCards }
        return col
      })
    })
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveCard(null)
    setActiveColumn(null)

    if (!over) { dragSourceRef.current = null; return }

    const activeId = active.id
    const overId = over.id
    const type = active.data.current?.type

    // --- Column reorder ---
    if (type === 'column') {
      if (activeId === overId) return
      setColumns(prev => {
        const oldIdx = prev.findIndex(c => c.id === activeId)
        const newIdx = prev.findIndex(c => c.id === overId)
        if (oldIdx === -1 || newIdx === -1) return prev
        const reordered = arrayMove(prev, oldIdx, newIdx)
        // Persist new positions
        reordered.forEach((col, idx) => {
          if (col.position !== idx) updateColumnPosition(col.id, { position: idx })
        })
        return reordered.map((col, idx) => ({ ...col, position: idx }))
      })
      return
    }

    // --- Card reorder / move ---
    const sourceColumnId = dragSourceRef.current?.columnId
    const currentColumn = findColumnByCardId(activeId)
    if (!currentColumn) { dragSourceRef.current = null; return }

    const overIsColumn = columns.some(col => col.id === overId)
    const isCrossColumn = sourceColumnId && sourceColumnId !== currentColumn.id

    if (isCrossColumn) {
      const position = (currentColumn.cards || []).findIndex(c => c.id === activeId)
      moveCard(activeId, currentColumn.id, position >= 0 ? position : 0).catch(console.error)
    } else {
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
      <header className="bg-black/15 backdrop-blur-md border-b border-white/10 relative z-20">
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
            {/* Responsible selector */}
            <div className="relative" ref={responsibleRef}>
              <button
                onClick={() => setShowResponsiblePicker(!showResponsiblePicker)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white text-xs"
                title="Responsable del tablero"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden sm:inline">
                  {currentBoard?.responsible_name || 'Sin responsable'}
                </span>
                {currentBoard?.responsible_name && (
                  <span className="sm:hidden">
                    {currentBoard.responsible_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
              {showResponsiblePicker && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 min-w-[200px] max-h-60 overflow-y-auto">
                  <button
                    onClick={() => handleChangeResponsible(null)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${!currentBoard?.responsible_id ? 'text-aikit-500 font-medium' : 'text-gray-500'}`}
                  >
                    Sin responsable
                  </button>
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleChangeResponsible(u.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${currentBoard?.responsible_id === u.id ? 'text-aikit-500 font-medium' : 'text-gray-700'}`}
                    >
                      <div className="w-6 h-6 bg-aikit-100 rounded-lg flex items-center justify-center text-aikit-600 text-xs font-bold flex-shrink-0">
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <span>{u.name}</span>
                        {u.department && <span className="text-gray-400 text-xs ml-1">({u.department})</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

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
            <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
              {columns.map((column, idx) => (
                <Column
                  key={column.id}
                  column={column}
                  onCardClick={(card) => {
                    setSelectedCard(card)
                    setSearchParams({ card: card.id }, { replace: true })
                  }}
                  isFirst={idx === 0}
                  isLast={idx === columns.length - 1}
                  onMoveLeft={() => moveColumn(column.id, 'left')}
                  onMoveRight={() => moveColumn(column.id, 'right')}
                />
              ))}
            </SortableContext>

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
            {activeColumn && (
              <div className="flex-shrink-0 w-72 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl opacity-90 border-2 border-aikit-400/30">
                <div className="p-3 flex items-center gap-2">
                  <span className="font-semibold text-[#0F0F0F] text-sm px-2 py-0.5 truncate">
                    {activeColumn.name}
                  </span>
                  <span className="bg-aikit-50 text-aikit-600 text-xs px-2 py-0.5 rounded-full font-medium ml-auto flex-shrink-0">
                    {(activeColumn.cards || []).length}
                  </span>
                </div>
              </div>
            )}
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
