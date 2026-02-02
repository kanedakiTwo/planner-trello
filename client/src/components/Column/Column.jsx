import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import Card from '../Card/Card'
import { useBoard } from '../../context/BoardContext'

export default function Column({ column, onCardClick }) {
  const { createCard } = useBoard()
  const [showForm, setShowForm] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  const handleAddCard = async (e) => {
    e.preventDefault()
    if (!newCardTitle.trim()) return

    await createCard(column.id, { title: newCardTitle })
    setNewCardTitle('')
    setShowForm(false)
  }

  const cards = column.cards || []

  return (
    <div
      className={`flex-shrink-0 w-72 bg-gray-100 rounded-lg flex flex-col max-h-[calc(100vh-140px)] ${
        isOver ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      {/* Column Header */}
      <div className="p-3 font-semibold text-gray-700 flex justify-between items-center">
        <span>{column.name}</span>
        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
          {cards.length}
        </span>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 custom-scrollbar min-h-[50px]"
      >
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
              placeholder="Titulo de la tarjeta..."
              className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm"
              >
                Anadir
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setNewCardTitle('')
                }}
                className="text-gray-500 hover:text-gray-700"
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
            className="w-full text-left text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded p-2 text-sm flex items-center gap-1 transition-colors"
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
