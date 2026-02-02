import { useState, useEffect, useRef } from 'react'
import { useBoard } from '../../context/BoardContext'
import { getUsers } from '../../services/auth'
import * as cardService from '../../services/cards'

const priorityOptions = [
  { value: 'low', label: 'Baja', color: 'bg-green-500' },
  { value: 'medium', label: 'Media', color: 'bg-yellow-500' },
  { value: 'high', label: 'Alta', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-500' },
]

const labelColors = [
  '#61bd4f', '#f2d600', '#ff9f1a', '#eb5a46',
  '#c377e0', '#0079bf', '#00c2e0', '#51e898',
]

export default function CardModal({ card, onClose }) {
  const { updateCard, deleteCard, columns } = useBoard()
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [priority, setPriority] = useState(card.priority || '')
  const [dueDate, setDueDate] = useState(card.due_date || '')
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [users, setUsers] = useState([])
  const [assignees, setAssignees] = useState(card.assignees || [])
  const [labels, setLabels] = useState(card.labels || [])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionIndex, setMentionIndex] = useState(-1)
  const commentInputRef = useRef(null)

  const column = columns.find(col => col.id === card.column_id)

  useEffect(() => {
    getUsers().then(setUsers).catch(console.error)
    cardService.getComments(card.id).then(setComments).catch(console.error)
  }, [card.id])

  const handleSave = async () => {
    await updateCard(card.id, { title, description, priority, due_date: dueDate || null })
  }

  const handleDelete = async () => {
    if (confirm('Estas seguro de que quieres eliminar esta tarjeta?')) {
      await deleteCard(card.id)
      onClose()
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const comment = await cardService.addComment(card.id, newComment)
    setComments(prev => [...prev, comment])
    setNewComment('')
  }

  const handleCommentChange = (e) => {
    const value = e.target.value
    setNewComment(value)

    // Check for @mention
    const lastAtIndex = value.lastIndexOf('@')
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1)
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt.toLowerCase())
        setMentionIndex(lastAtIndex)
        return
      }
    }
    setMentionSearch('')
    setMentionIndex(-1)
  }

  const handleMentionSelect = (user) => {
    const beforeMention = newComment.slice(0, mentionIndex)
    const afterMention = newComment.slice(mentionIndex + mentionSearch.length + 1)
    setNewComment(`${beforeMention}@${user.name} ${afterMention}`)
    setMentionSearch('')
    setMentionIndex(-1)
    commentInputRef.current?.focus()
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(mentionSearch) &&
    !assignees.some(a => a.id === u.id)
  )

  const handleAddAssignee = async (user) => {
    await cardService.addAssignee(card.id, user.id)
    setAssignees(prev => [...prev, user])
    setShowUserDropdown(false)
  }

  const handleRemoveAssignee = async (userId) => {
    await cardService.removeAssignee(card.id, userId)
    setAssignees(prev => prev.filter(a => a.id !== userId))
  }

  const handleAddLabel = async (color) => {
    const labelName = prompt('Nombre de la etiqueta:')
    if (!labelName) return

    const label = await cardService.addLabel(card.id, { name: labelName, color })
    setLabels(prev => [...prev, label])
    setShowLabelPicker(false)
  }

  const handleRemoveLabel = async (labelId) => {
    await cardService.removeLabel(card.id, labelId)
    setLabels(prev => prev.filter(l => l.id !== labelId))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-10">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 my-auto">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-start">
          <div className="flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              className="text-xl font-bold text-gray-800 w-full border-none focus:ring-0 p-0"
            />
            <p className="text-sm text-gray-500 mt-1">
              en columna <span className="font-medium">{column?.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 grid grid-cols-3 gap-4">
          {/* Main content */}
          <div className="col-span-2 space-y-4">
            {/* Labels */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Etiquetas</h4>
              <div className="flex flex-wrap gap-2">
                {labels.map(label => (
                  <span
                    key={label.id}
                    className="px-3 py-1 rounded text-white text-sm flex items-center gap-1"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                    <button
                      onClick={() => handleRemoveLabel(label.id)}
                      className="hover:bg-white/20 rounded"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
                <div className="relative">
                  <button
                    onClick={() => setShowLabelPicker(!showLabelPicker)}
                    className="px-2 py-1 border border-dashed border-gray-300 rounded text-gray-500 text-sm hover:border-gray-400"
                  >
                    + Etiqueta
                  </button>
                  {showLabelPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 z-10">
                      <div className="grid grid-cols-4 gap-1">
                        {labelColors.map(color => (
                          <button
                            key={color}
                            onClick={() => handleAddLabel(color)}
                            className="w-8 h-6 rounded"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Descripcion</h4>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSave}
                placeholder="Anade una descripcion mas detallada..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            {/* Comments */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Comentarios</h4>

              <form onSubmit={handleAddComment} className="mb-4 relative">
                <textarea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={handleCommentChange}
                  placeholder="Escribe un comentario... Usa @nombre para mencionar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={2}
                />
                {mentionSearch && filteredUsers.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto w-48">
                    {filteredUsers.slice(0, 5).map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleMentionSelect(user)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <span className="text-sm">{user.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="submit"
                  className="mt-2 bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm"
                >
                  Comentar
                </button>
              </form>

              <div className="space-y-3">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium">
                      {comment.user_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{comment.user_name}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.created_at).toLocaleString('es-ES')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                        {comment.content.split(/(@\w+)/g).map((part, i) =>
                          part.startsWith('@') ? (
                            <span key={i} className="text-blue-600 font-medium">{part}</span>
                          ) : part
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Assignees */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Asignados</h4>
              <div className="space-y-2">
                {assignees.map(assignee => (
                  <div key={assignee.id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                        {assignee.name.charAt(0)}
                      </div>
                      <span className="text-sm">{assignee.name}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveAssignee(assignee.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="relative">
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="w-full text-left px-2 py-1.5 border border-dashed border-gray-300 rounded text-gray-500 text-sm hover:border-gray-400"
                  >
                    + Asignar persona
                  </button>
                  {showUserDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto w-full z-10">
                      {users.filter(u => !assignees.some(a => a.id === u.id)).map(user => (
                        <button
                          key={user.id}
                          onClick={() => handleAddAssignee(user)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-sm">{user.name}</span>
                            <span className="text-xs text-gray-400 block">{user.department}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Priority */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Prioridad</h4>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value)
                  updateCard(card.id, { priority: e.target.value })
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Sin prioridad</option>
                {priorityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Fecha limite</h4>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value)
                  updateCard(card.id, { due_date: e.target.value || null })
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar tarjeta
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
