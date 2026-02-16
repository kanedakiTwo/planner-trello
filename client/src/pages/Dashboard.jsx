import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBoard } from '../context/BoardContext'
import { getUserSettings, updateTeamsWebhook, linkTeamsAccount, unlinkTeamsAccount } from '../services/auth'
import { getBoardColor } from '../utils/boardColors'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const { boards, fetchBoards, createBoard, loading } = useBoard()
  const [showModal, setShowModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardDesc, setNewBoardDesc] = useState('')
  const [teamsWebhook, setTeamsWebhook] = useState('')
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [teamsLinked, setTeamsLinked] = useState(false)
  const [linkCode, setLinkCode] = useState('')
  const [linkingTeams, setLinkingTeams] = useState(false)
  const [linkError, setLinkError] = useState('')

  useEffect(() => {
    fetchBoards()
  }, [fetchBoards])

  // Escape to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showModal) setShowModal(false)
        else if (showSettingsModal) setShowSettingsModal(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showModal, showSettingsModal])

  const handleCreateBoard = async (e) => {
    e.preventDefault()
    if (!newBoardName.trim()) return

    await createBoard({ name: newBoardName, description: newBoardDesc })
    setNewBoardName('')
    setNewBoardDesc('')
    setShowModal(false)
  }

  const handleOpenSettings = async () => {
    try {
      const settings = await getUserSettings()
      setTeamsWebhook(settings.teams_webhook || '')
      setTeamsLinked(settings.teamsLinked || false)
      setLinkCode('')
      setLinkError('')
    } catch (error) {
      console.error('Error loading settings:', error)
    }
    setShowSettingsModal(true)
  }

  const handleLinkTeams = async (e) => {
    e.preventDefault()
    if (!linkCode.trim()) return

    setLinkingTeams(true)
    setLinkError('')
    try {
      await linkTeamsAccount(linkCode.trim())
      setTeamsLinked(true)
      setLinkCode('')
    } catch (error) {
      setLinkError(error.response?.data?.message || 'Error al vincular cuenta')
    } finally {
      setLinkingTeams(false)
    }
  }

  const handleUnlinkTeams = async () => {
    if (!confirm('Desvincular cuenta de Teams?')) return

    try {
      await unlinkTeamsAccount()
      setTeamsLinked(false)
    } catch (error) {
      alert('Error al desvincular cuenta')
    }
  }

  const handleSaveWebhook = async (e) => {
    e.preventDefault()
    setSavingWebhook(true)
    try {
      await updateTeamsWebhook(teamsWebhook)
      setShowSettingsModal(false)
    } catch (error) {
      alert('Error al guardar webhook')
    } finally {
      setSavingWebhook(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl text-aikit-800">Planner</h1>
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-aikit-400 hover:bg-aikit-50 transition-colors"
                title="Admin"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </Link>
            )}
            <button
              onClick={handleOpenSettings}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-aikit-400 hover:bg-aikit-50 transition-colors"
              title="Configuracion"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <div className="text-right">
              <p className="text-sm font-medium text-[#0F0F0F]">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.department}</p>
            </div>
            <div className="w-9 h-9 bg-aikit-400 rounded-xl flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-1"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl text-[#0F0F0F]">Mis Tableros</h2>
            <p className="text-sm text-gray-400 mt-1">{boards.length} tablero{boards.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-aikit-400 text-white px-5 py-2.5 rounded-xl hover:bg-aikit-500 active:bg-aikit-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm shadow-aikit-400/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Tablero
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-aikit-400 border-t-transparent"></div>
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto bg-aikit-50 rounded-2xl flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-aikit-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h3 className="text-lg text-[#0F0F0F] mb-2">No tienes tableros</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">Crea tu primer tablero para empezar a organizar tus tareas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {boards.map((board) => (
              <Link
                key={board.id}
                to={`/board/${board.id}`}
                className={`${getBoardColor(board.id).gradient} rounded-2xl p-5 h-36 hover:scale-[1.02] hover:shadow-lg transition-all duration-200 flex flex-col justify-between group`}
              >
                <h3 className="text-white font-bold text-lg leading-tight">{board.name}</h3>
                {board.description && (
                  <p className="text-white/70 text-sm line-clamp-2 group-hover:text-white/90 transition-colors">{board.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Board Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl text-[#0F0F0F] mb-5">Crear nuevo tablero</h3>
            <form onSubmit={handleCreateBoard}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Nombre del tablero
                </label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 transition-colors outline-none text-sm"
                  placeholder="Ej: Proyecto Marketing Q1"
                  autoFocus
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Descripcion (opcional)
                </label>
                <textarea
                  value={newBoardDesc}
                  onChange={(e) => setNewBoardDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 transition-colors outline-none text-sm resize-none"
                  placeholder="Describe el proposito de este tablero"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-aikit-400 text-white px-5 py-2.5 rounded-xl hover:bg-aikit-500 transition-colors text-sm font-medium"
                >
                  Crear tablero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl text-[#0F0F0F] mb-6">Configuracion</h3>

            {/* Teams Bot Linking Section */}
            <div className="mb-6 border-b border-gray-100 pb-6">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <div className="w-7 h-7 bg-aikit-50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-aikit-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.5 6h-3V4.5A1.5 1.5 0 0015 3H9a1.5 1.5 0 00-1.5 1.5V6h-3A1.5 1.5 0 003 7.5v12A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-12A1.5 1.5 0 0019.5 6zM9 4.5h6V6H9V4.5z"/>
                  </svg>
                </div>
                Bot de Teams
              </h4>

              {teamsLinked ? (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-green-700 font-medium">Cuenta vinculada</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnlinkTeams}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      Desvincular
                    </button>
                  </div>
                  <p className="text-xs text-green-600 mt-1.5">
                    Recibiras notificaciones como mensajes personales del bot.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-aikit-50 rounded-xl p-4 mb-3">
                    <h5 className="text-sm font-medium text-aikit-800 mb-2">Como vincular tu cuenta:</h5>
                    <ol className="text-xs text-aikit-600 list-decimal list-inside space-y-1">
                      <li>Abre Teams y busca el bot "Planner"</li>
                      <li>Envia el mensaje <code className="bg-aikit-100 px-1.5 py-0.5 rounded-md text-aikit-700">conectar</code></li>
                      <li>El bot te dara un codigo de 6 caracteres</li>
                      <li>Ingresa ese codigo aqui abajo</li>
                    </ol>
                  </div>
                  <form onSubmit={handleLinkTeams} className="flex gap-2">
                    <input
                      type="text"
                      value={linkCode}
                      onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 transition-colors outline-none text-sm uppercase tracking-widest text-center font-mono"
                      placeholder="ABC123"
                      maxLength={6}
                    />
                    <button
                      type="submit"
                      disabled={linkingTeams || linkCode.length < 6}
                      className="bg-aikit-400 text-white px-4 py-2.5 rounded-xl hover:bg-aikit-500 disabled:opacity-50 text-sm font-medium transition-colors"
                    >
                      {linkingTeams ? '...' : 'Vincular'}
                    </button>
                  </form>
                  {linkError && (
                    <p className="text-xs text-red-500 mt-2">{linkError}</p>
                  )}
                </>
              )}
            </div>

            {/* Webhook Section (Fallback) */}
            <form onSubmit={handleSaveWebhook}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Webhook de Teams (alternativo)
                </label>
                <input
                  type="url"
                  value={teamsWebhook}
                  onChange={(e) => setTeamsWebhook(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-aikit-400/30 focus:border-aikit-400 transition-colors outline-none text-sm"
                  placeholder="https://outlook.office.com/webhook/..."
                />
                <p className="text-xs text-gray-400 mt-2">
                  Si no puedes usar el bot, configura un webhook para recibir notificaciones en un canal.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={savingWebhook}
                  className="bg-aikit-400 text-white px-5 py-2.5 rounded-xl hover:bg-aikit-500 disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  {savingWebhook ? 'Guardando...' : 'Guardar Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
