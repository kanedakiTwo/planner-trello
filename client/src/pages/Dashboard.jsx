import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBoard } from '../context/BoardContext'
import { getUserSettings, updateTeamsWebhook } from '../services/auth'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const { boards, fetchBoards, createBoard, loading } = useBoard()
  const [showModal, setShowModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardDesc, setNewBoardDesc] = useState('')
  const [teamsWebhook, setTeamsWebhook] = useState('')
  const [savingWebhook, setSavingWebhook] = useState(false)

  useEffect(() => {
    fetchBoards()
  }, [fetchBoards])

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
    } catch (error) {
      console.error('Error loading settings:', error)
    }
    setShowSettingsModal(true)
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

  const boardColors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-yellow-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Planner</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleOpenSettings}
              className="text-gray-500 hover:text-gray-700"
              title="Configuracion"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <div className="text-right">
              <p className="font-medium text-gray-800">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.department}</p>
            </div>
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-gray-700 ml-2"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-700">Mis Tableros</h2>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Tablero
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No tienes tableros</h3>
            <p className="text-gray-500">Crea tu primer tablero para empezar a organizar tus tareas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {boards.map((board, index) => (
              <Link
                key={board.id}
                to={`/board/${board.id}`}
                className={`${boardColors[index % boardColors.length]} rounded-lg p-4 h-32 hover:opacity-90 transition-opacity`}
              >
                <h3 className="text-white font-bold text-lg">{board.name}</h3>
                {board.description && (
                  <p className="text-white/80 text-sm mt-1 line-clamp-2">{board.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Board Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Crear nuevo tablero</h3>
            <form onSubmit={handleCreateBoard}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del tablero
                </label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Proyecto Marketing Q1"
                  autoFocus
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripcion (opcional)
                </label>
                <textarea
                  value={newBoardDesc}
                  onChange={(e) => setNewBoardDesc(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe el proposito de este tablero"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Configuracion</h3>
            <form onSubmit={handleSaveWebhook}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Microsoft Teams Webhook URL
                </label>
                <input
                  type="url"
                  value={teamsWebhook}
                  onChange={(e) => setTeamsWebhook(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="https://outlook.office.com/webhook/..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Configura un webhook de Teams para recibir notificaciones cuando te mencionen.
                  <a
                    href="https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline ml-1"
                  >
                    Como crear un webhook
                  </a>
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <h4 className="text-sm font-medium text-blue-800 mb-1">Instrucciones rapidas:</h4>
                <ol className="text-xs text-blue-700 list-decimal list-inside space-y-1">
                  <li>Abre Teams y ve al canal deseado</li>
                  <li>Click en "..." → Conectores → Incoming Webhook</li>
                  <li>Configura el nombre y copia la URL</li>
                  <li>Pega la URL aqui</li>
                </ol>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingWebhook}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingWebhook ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
