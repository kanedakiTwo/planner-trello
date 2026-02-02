import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const priorityConfig = {
  low: { label: 'Baja', color: 'bg-green-500' },
  medium: { label: 'Media', color: 'bg-yellow-500' },
  high: { label: 'Alta', color: 'bg-orange-500' },
  urgent: { label: 'Urgente', color: 'bg-red-500' },
}

export default function Card({ card, onClick, isDragging }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priority = priorityConfig[card.priority]
  const isOverdue = card.due_date && new Date(card.due_date) < new Date()

  const handleClick = () => {
    // El sensor tiene distancia de activacion, asi que el click funciona normal
    if (!isSortableDragging && !isDragging) {
      onClick?.()
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`bg-white rounded-lg shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4 select-none ${
        priority ? priority.color.replace('bg-', 'border-') : 'border-transparent'
      } ${isSortableDragging || isDragging ? 'opacity-50 shadow-lg' : ''}`}
    >
      {/* Labels */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map(label => (
            <span
              key={label.id}
              className="h-2 w-10 rounded-full"
              style={{ backgroundColor: label.color }}
              title={label.name}
            />
          ))}
        </div>
      )}

      {/* Title */}
      <h4 className="text-sm text-gray-800 font-medium">{card.title}</h4>

      {/* Footer with metadata */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {/* Priority badge */}
        {priority && (
          <span className={`${priority.color} text-white text-xs px-2 py-0.5 rounded`}>
            {priority.label}
          </span>
        )}

        {/* Due date */}
        {card.due_date && (
          <span className={`text-xs flex items-center gap-1 ${
            isOverdue ? 'text-red-500 bg-red-50' : 'text-gray-500 bg-gray-100'
          } px-2 py-0.5 rounded`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(card.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </span>
        )}

        {/* Comments count */}
        {card.comments_count > 0 && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {card.comments_count}
          </span>
        )}

        {/* Description indicator */}
        {card.description && (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        )}
      </div>

      {/* Assignees */}
      {card.assignees && card.assignees.length > 0 && (
        <div className="flex -space-x-2 mt-2">
          {card.assignees.slice(0, 3).map(assignee => (
            <div
              key={assignee.id}
              className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium"
              title={assignee.name}
            >
              {assignee.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {card.assignees.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-gray-600 text-xs">
              +{card.assignees.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
