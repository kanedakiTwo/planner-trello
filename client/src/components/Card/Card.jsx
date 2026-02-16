import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const priorityConfig = {
  low: { label: 'Baja', color: 'bg-[#12B76A]', border: 'border-[#12B76A]' },
  medium: { label: 'Media', color: 'bg-[#FFA90A]', border: 'border-[#FFA90A]' },
  high: { label: 'Alta', color: 'bg-[#ff9f1a]', border: 'border-[#ff9f1a]' },
  urgent: { label: 'Urgente', color: 'bg-[#F14437]', border: 'border-[#F14437]' },
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
    transition: transition || 'transform 200ms ease',
  }

  const priority = priorityConfig[card.priority]
  const isOverdue = card.due_date && new Date(card.due_date) < new Date()

  const handleClick = () => {
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
      className={`rounded-xl p-3 cursor-pointer transition-all border select-none ${
        isSortableDragging
          ? 'opacity-40 border-2 border-dashed border-aikit-300 bg-aikit-50/50 shadow-none'
          : isDragging
            ? 'bg-white shadow-xl scale-105 border-gray-100 rotate-2'
            : `bg-white hover:shadow-md border-gray-100 shadow-sm ${priority ? `border-l-[3px] ${priority.border}` : ''}`
      }`}
    >
      {/* Labels */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map(label => (
            <span
              key={label.id}
              className="h-1.5 w-8 rounded-full"
              style={{ backgroundColor: label.color }}
              title={label.name}
            />
          ))}
        </div>
      )}

      {/* Title */}
      <h4 className="text-sm text-[#0F0F0F] font-medium leading-snug">{card.title}</h4>

      {/* Footer with metadata */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {/* Priority badge */}
        {priority && (
          <span className={`${priority.color} text-white text-[10px] px-1.5 py-0.5 rounded-md font-medium`}>
            {priority.label}
          </span>
        )}

        {/* Due date */}
        {card.due_date && (
          <span className={`text-[10px] flex items-center gap-1 ${
            isOverdue ? 'text-[#F14437] bg-red-50' : 'text-gray-500 bg-gray-50'
          } px-1.5 py-0.5 rounded-md`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(card.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </span>
        )}

        {/* Comments count */}
        {card.comments_count > 0 && (
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {card.comments_count}
          </span>
        )}

        {/* Description indicator */}
        {card.description && (
          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        )}
      </div>

      {/* Footer row: creator + date + assignees */}
      <div className="flex items-center justify-between mt-2">
        {/* Creator + date */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[60%]">
          {card.created_by_name && (
            <span className="text-[10px] text-gray-400 truncate">
              {card.created_by_name}
            </span>
          )}
          {card.created_at && (
            <span className="text-[10px] text-gray-300 whitespace-nowrap">
              {new Date(card.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>

        {/* Assignees */}
        {card.assignees && card.assignees.length > 0 && (
          <div className="flex -space-x-1.5 ml-auto">
            {card.assignees.slice(0, 3).map(assignee => (
              <div
                key={assignee.id}
                className="w-6 h-6 rounded-lg bg-aikit-400 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
                title={assignee.name}
              >
                {assignee.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {card.assignees.length > 3 && (
              <div className="w-6 h-6 rounded-lg bg-gray-200 border-2 border-white flex items-center justify-center text-gray-500 text-[10px] font-bold">
                +{card.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
