import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { DndContext, DragOverlay, pointerWithin, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { useBoard } from '../context/BoardContext'
import { useAuth } from '../context/AuthContext'
import Column from '../components/Column/Column'
import Card from '../components/Card/Card'
import CardModal from '../components/Card/CardModal'

export default function BoardView() {
  const { boardId } = useParams()
  const { user, logout } = useAuth()
  const { currentBoard, columns, fetchBoard, createColumn, moveCard, loading, setColumns } = useBoard()
  const [activeCard, setActiveCard] = useState(null)
  const [showColumnForm, setShowColumnForm] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [selectedCard, setSelectedCard] = useState(null)

  // Configurar sensor con distancia minima para activar drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requiere mover 8px antes de activar drag
      },
    })
  )

  useEffect(() => {
    fetchBoard(boardId)
  }, [boardId, fetchBoard])

  const handleDragStart = (event) => {
    const { active } = event
    const card = columns
      .flatMap(col => col.cards || [])
      .find(c => c.id === active.id)
    setActiveCard(card)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const activeCard = columns
      .flatMap(col => col.cards || [])
      .find(c => c.id === active.id)

    if (!activeCard) return

    let targetColumnId = over.id
    let targetPosition = 0

    // Check if dropping on a column
    const targetColumn = columns.find(col => col.id === over.id)
    if (targetColumn) {
      targetPosition = (targetColumn.cards || []).length
    } else {
      // Dropping on a card
      const overCard = columns
        .flatMap(col => col.cards || [])
        .find(c => c.id === over.id)

      if (overCard) {
        targetColumnId = overCard.column_id
        const targetCol = columns.find(col => col.id === targetColumnId)
        targetPosition = (targetCol?.cards || []).findIndex(c => c.id === over.id)
      }
    }

    if (activeCard.column_id === targetColumnId) {
      // Reorder within same column
      const column = columns.find(col => col.id === targetColumnId)
      const cards = [...(column?.cards || [])]
      const oldIndex = cards.findIndex(c => c.id === active.id)
      const newIndex = targetPosition

      if (oldIndex !== newIndex) {
        cards.splice(oldIndex, 1)
        cards.splice(newIndex > oldIndex ? newIndex - 1 : newIndex, 0, activeCard)

        setColumns(prev => prev.map(col =>
          col.id === targetColumnId ? { ...col, cards } : col
        ))

        await moveCard(active.id, targetColumnId, newIndex)
      }
    } else {
      // Move to different column
      await moveCard(active.id, targetColumnId, targetPosition)
    }
  }

  const handleAddColumn = async (e) => {
    e.preventDefault()
    if (!newColumnName.trim()) return

    await createColumn(boardId, { name: newColumnName })
    setNewColumnName('')
    setShowColumnForm(false)
  }

  if (loading && !currentBoard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex flex-col">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-white hover:text-white/80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-white">{currentBoard?.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-white">
              <p className="font-medium">{user?.name}</p>
            </div>
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <button onClick={logout} className="text-white/80 hover:text-white text-sm">
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 items-start h-full">
            {columns.map(column => (
              <Column
                key={column.id}
                column={column}
                onCardClick={setSelectedCard}
              />
            ))}

            {/* Add column button */}
            <div className="flex-shrink-0 w-72">
              {showColumnForm ? (
                <form onSubmit={handleAddColumn} className="bg-gray-100 rounded-lg p-3">
                  <input
                    type="text"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="Nombre de la columna"
                    className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
                    >
                      Crear
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowColumnForm(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowColumnForm(true)}
                  className="w-full bg-white/20 hover:bg-white/30 text-white rounded-lg p-3 text-left flex items-center gap-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Anadir columna
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeCard && <Card card={activeCard} isDragging />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Card Modal */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  )
}
