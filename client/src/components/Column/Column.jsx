import { useState } from 'react'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Card from '../Card/Card'
import { useBoard } from '../../context/BoardContext'

export default function Column({ column, onCardClick, onMoveLeft, onMoveRight, isFirst, isLast }) {
  const { createCard, updateColumn, deleteColumn } = useBoard()
  const [showForm, setShowForm] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [columnName, setColumnName] = useState(column.name)

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: column.id, data: { type: 'column' } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
  }

  const handleAddCard = async (e) => {
    e.preventDefault()
    if (!newCardTitle.trim()) return

    await createCard(column.id, { title: newCardTitle })
    setNewCardTitle('')
    setShowForm(false)
  }

  const handleColumnNameSave = async () => {
    if (columnName.trim() && columnName !== column.name) {
      await updateColumn(column.id, { name: columnName.trim() })
    } else {
      setColumnName(column.name)
    }
    setEditingName(false)
  }

  const handleDeleteColumn = async () => {
    if (!confirm(`Eliminar columna "${column.name}" y todas sus tarjetas?`)) return
    await deleteColumn(column.id)
  }

  const cards = column.cards || []

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex-shrink-0 w-72 bg-white/90 backdrop-blur-sm rounded-xl flex flex-col max-h-[calc(100vh-140px)] shadow-sm transition-opacity ${
        isOver ? 'ring-2 ring-aikit-400/50' : ''
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      {/* Column Header */}
      <div className="p-3 flex justify-between items-center group">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-0.5 -ml-1"
            title="Arrastra para mover columna"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
            </svg>
          </div>
          {editingName ? (
            <input
              type="text"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              onBlur={handleColumnNameSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleColumnNameSave()
                if (e.key === 'Escape') { setColumnName(column.name); setEditingName(false) }
              }}
              className="font-semibold bg-white text-[#0F0F0F] rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-aikit-400/30 w-full text-sm"
              autoFocus
            />
          ) : (
            <span
              className="font-semibold text-[#0F0F0F] text-sm cursor-pointer hover:bg-black/5 rounded-lg px-2 py-0.5 transition-colors truncate"
              onClick={() => setEditingName(true)}
              title="Click para editar nombre"
            >
              {column.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="bg-aikit-50 text-aikit-600 text-xs px-2 py-0.5 rounded-full font-medium">
            {cards.length}
          </span>
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onMoveLeft}
              disabled={isFirst}
              className="text-gray-300 hover:text-aikit-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              title="Mover columna a la izquierda"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={onMoveRight}
              disabled={isLast}
              className="text-gray-300 hover:text-aikit-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              title="Mover columna a la derecha"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={handleDeleteColumn}
              className="text-gray-300 hover:text-red-400 transition-colors ml-0.5"
              title="Eliminar columna"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto px-2 pb-1 custom-scrollbar min-h-[50px]">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {cards.map(card => (
              <Card
                key={card.id}
                card={card}
                onClick={() => onCardClick(card)}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      {/* Add Card Form */}
      <div className="p-2">
        {showForm ? (
          <form onSubmit={handleAddCard}>
            <textarea
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddCard(e)
                }
                if (e.key === 'Escape') {
                  setShowForm(false)
                  setNewCardTitle('')
                }
              }}
              placeholder="Titulo de la tarjeta... (Enter para crear)"
              className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 resize-none outline-none text-sm"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="bg-aikit-400 text-white px-3 py-1.5 rounded-lg hover:bg-aikit-500 text-sm font-medium transition-colors"
              >
                Anadir
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setNewCardTitle('')
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full text-left text-gray-400 hover:text-aikit-400 hover:bg-aikit-50 rounded-lg p-2 text-sm flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Anadir tarjeta
          </button>
        )}
      </div>
    </div>
  )
}
