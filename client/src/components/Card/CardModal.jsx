import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useBoard } from '../../context/BoardContext'
import { getUsers } from '../../services/auth'
import * as cardService from '../../services/cards'

const priorityOptions = [
  { value: 'low', label: 'Baja', color: 'bg-[#12B76A]' },
  { value: 'medium', label: 'Media', color: 'bg-[#FFA90A]' },
  { value: 'high', label: 'Alta', color: 'bg-[#ff9f1a]' },
  { value: 'urgent', label: 'Urgente', color: 'bg-[#F14437]' },
]

const labelColors = [
  '#12B76A', '#FFA90A', '#ff9f1a', '#F14437',
  '#c377e0', '#4569FC', '#00c2e0', '#51e898',
]

export default function CardModal({ card, onClose }) {
  const { boardId } = useParams()
  const { updateCard, deleteCard, columns, setColumns, moveCard } = useBoard()
  const [linkCopied, setLinkCopied] = useState(false)
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [priority, setPriority] = useState(card.priority || '')
  const [dueDate, setDueDate] = useState(card.due_date ? card.due_date.slice(0, 10) : '')
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [users, setUsers] = useState([])
  const [assignees, setAssignees] = useState(card.assignees || [])
  const [labels, setLabels] = useState(card.labels || [])
  const [attachments, setAttachments] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionIndex, setMentionIndex] = useState(-1)
  const commentInputRef = useRef(null)
  const fileInputRef = useRef(null)

  const [currentColumnId, setCurrentColumnId] = useState(card.column_id)
  const column = columns.find(col => col.id === currentColumnId)

  const handleColumnChange = async (newColumnId) => {
    if (newColumnId === currentColumnId) return
    const targetCol = columns.find(col => col.id === newColumnId)
    const position = (targetCol?.cards || []).length
    await moveCard(card.id, newColumnId, position)
    setCurrentColumnId(newColumnId)
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/board/${boardId}?card=${card.id}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  useEffect(() => {
    getUsers().then(setUsers).catch(console.error)
    cardService.getComments(card.id).then(setComments).catch(console.error)
    cardService.getAttachments(card.id).then(setAttachments).catch(console.error)
  }, [card.id])

  // Escape to close modal (or close dropdowns first)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showLabelPicker) { setShowLabelPicker(false); return }
        if (showUserDropdown) { setShowUserDropdown(false); return }
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, showLabelPicker, showUserDropdown])

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
    const newAssignees = [...assignees, user]
    setAssignees(newAssignees)
    setShowUserDropdown(false)
    setColumns(prev => prev.map(col => ({
      ...col,
      cards: (col.cards || []).map(c =>
        c.id === card.id ? { ...c, assignees: newAssignees } : c
      )
    })))
  }

  const handleRemoveAssignee = async (userId) => {
    await cardService.removeAssignee(card.id, userId)
    const newAssignees = assignees.filter(a => a.id !== userId)
    setAssignees(newAssignees)
    setColumns(prev => prev.map(col => ({
      ...col,
      cards: (col.cards || []).map(c =>
        c.id === card.id ? { ...c, assignees: newAssignees } : c
      )
    })))
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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      const attachment = await cardService.uploadAttachment(card.id, file)
      setAttachments(prev => [attachment, ...prev])
    } catch (error) {
      alert(error.message)
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm('Eliminar este adjunto?')) return

    await cardService.deleteAttachment(attachmentId)
    setAttachments(prev => prev.filter(a => a.id !== attachmentId))
  }

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return '🖼️'
    if (fileType?.includes('pdf')) return '📄'
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝'
    if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return '📊'
    if (fileType?.includes('zip') || fileType?.includes('archive')) return '📦'
    return '📎'
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-10" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 my-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-start">
          <div className="flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              className="text-xl font-bold text-[#0F0F0F] w-full border-none focus:ring-0 p-0 outline-none font-serif"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              en columna <span className="font-medium text-aikit-400">{column?.name}</span>
              {card.created_at && (
                <>
                  <span className="mx-1.5">·</span>
                  Creada el {new Date(card.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyLink}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-aikit-400 hover:bg-gray-50 transition-colors relative"
              title="Copiar link"
            >
              {linkCopied ? (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 grid grid-cols-3 gap-5">
          {/* Main content */}
          <div className="col-span-2 space-y-5">
            {/* Labels */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Etiquetas</h4>
              <div className="flex flex-wrap gap-1.5">
                {labels.map(label => (
                  <span
                    key={label.id}
                    className="px-2.5 py-1 rounded-lg text-white text-xs flex items-center gap-1 font-medium"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                    <button
                      onClick={() => handleRemoveLabel(label.id)}
                      className="hover:bg-white/20 rounded ml-0.5"
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
                    className="px-2.5 py-1 border border-dashed border-gray-200 rounded-lg text-gray-400 text-xs hover:border-aikit-300 hover:text-aikit-400 transition-colors"
                  >
                    + Etiqueta
                  </button>
                  {showLabelPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg p-2.5 z-10">
                      <div className="grid grid-cols-4 gap-1.5">
                        {labelColors.map(color => (
                          <button
                            key={color}
                            onClick={() => handleAddLabel(color)}
                            className="w-8 h-6 rounded-lg hover:scale-110 transition-transform"
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
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Descripcion</h4>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSave}
                placeholder="Anade una descripcion mas detallada..."
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 resize-none outline-none text-sm"
                rows={4}
              />
            </div>

            {/* Attachments */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Adjuntos</h4>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="mb-3 px-3 py-2.5 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm hover:border-aikit-300 hover:text-aikit-400 w-full flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              >
                {uploadingFile ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Subiendo...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Adjuntar archivo
                  </>
                )}
              </button>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map(attachment => {
                    const isImage = attachment.file_type?.startsWith('image/')
                    return isImage ? (
                      <div key={attachment.id} className="group relative rounded-xl overflow-hidden border border-gray-100">
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={attachment.url}
                            alt={attachment.filename}
                            className="w-full max-h-48 object-cover bg-gray-50"
                          />
                        </a>
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-600 truncate">{attachment.filename}</p>
                            <p className="text-[10px] text-gray-400">{formatFileSize(attachment.file_size)}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={attachment.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl group hover:bg-aikit-50/50 transition-colors">
                        <span className="text-lg">{getFileIcon(attachment.file_type)}</span>
                        <div className="flex-1 min-w-0">
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-aikit-400 hover:text-aikit-500 truncate block transition-colors"
                          >
                            {attachment.filename}
                          </a>
                          <p className="text-xs text-gray-400">
                            {formatFileSize(attachment.file_size)} - {attachment.uploaded_by_name}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Comentarios</h4>

              <form onSubmit={handleAddComment} className="mb-4 relative">
                <textarea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={handleCommentChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      handleAddComment(e)
                    }
                  }}
                  placeholder="Escribe un comentario... (Ctrl+Enter para enviar)"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 resize-none outline-none text-sm"
                  rows={2}
                />
                {mentionSearch && filteredUsers.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-40 overflow-y-auto w-48">
                    {filteredUsers.slice(0, 5).map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleMentionSelect(user)}
                        className="w-full text-left px-3 py-2 hover:bg-aikit-50 flex items-center gap-2 transition-colors"
                      >
                        <div className="w-6 h-6 bg-aikit-400 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <span className="text-sm">{user.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="submit"
                  className="mt-2 bg-aikit-400 text-white px-4 py-1.5 rounded-lg hover:bg-aikit-500 text-sm font-medium transition-colors"
                >
                  Comentar
                </button>
              </form>

              <div className="space-y-3">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-7 h-7 bg-aikit-400 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                      {comment.user_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-[#0F0F0F]">{comment.user_name}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(comment.created_at).toLocaleString('es-ES')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap leading-relaxed">
                        {comment.content.split(/(@\w+)/g).map((part, i) =>
                          part.startsWith('@') ? (
                            <span key={i} className="text-aikit-400 font-medium">{part}</span>
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
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Asignados</h4>
              <div className="space-y-1.5">
                {assignees.map(assignee => (
                  <div key={assignee.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-aikit-400 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                        {assignee.name.charAt(0)}
                      </div>
                      <span className="text-sm text-[#0F0F0F]">{assignee.name}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveAssignee(assignee.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="relative">
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="w-full text-left px-2.5 py-2 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs hover:border-aikit-300 hover:text-aikit-400 transition-colors"
                  >
                    + Asignar persona
                  </button>
                  {showUserDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-y-auto w-full z-10">
                      {users.filter(u => !assignees.some(a => a.id === u.id)).map(user => (
                        <button
                          key={user.id}
                          onClick={() => handleAddAssignee(user)}
                          className="w-full text-left px-3 py-2 hover:bg-aikit-50 flex items-center gap-2 transition-colors"
                        >
                          <div className="w-6 h-6 bg-aikit-400 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-sm text-[#0F0F0F]">{user.name}</span>
                            <span className="text-[10px] text-gray-400 block">{user.department}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Columna</h4>
              <select
                value={currentColumnId}
                onChange={(e) => handleColumnChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 text-sm outline-none transition-colors"
              >
                {columns.map(col => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Prioridad</h4>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value)
                  updateCard(card.id, { priority: e.target.value })
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 text-sm outline-none transition-colors"
              >
                <option value="">Sin prioridad</option>
                {priorityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fecha limite</h4>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value)
                  updateCard(card.id, { due_date: e.target.value || null })
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 text-sm outline-none transition-colors"
              />
            </div>

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-100 hover:text-red-500 text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar tarjeta
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
