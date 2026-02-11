import { ActivityHandler, TurnContext, CardFactory } from 'botbuilder'
import { v4 as uuidv4 } from 'uuid'
import db from '../database/db.js'

function parseCommandParams(text) {
  const params = {}
  const regex = /(\w+)="([^"]*)"/g
  let match
  while ((match = regex.exec(text)) !== null) {
    params[match[1].toLowerCase()] = match[2]
  }
  return params
}

export class PlannerBot extends ActivityHandler {
  constructor() {
    super()

    // When a user sends a message
    this.onMessage(async (context, next) => {
      const text = context.activity.text?.toLowerCase().trim()

      const rawText = context.activity.text?.trim() || ''

      if (text === 'conectar' || text === 'vincular' || text === 'link') {
        await this.handleLinkRequest(context)
      } else if (text === 'ayuda' || text === 'help') {
        await this.sendHelpMessage(context)
      } else if (text === 'estado' || text === 'status') {
        await this.sendStatusMessage(context)
      } else if (text === '/tableros' || text === 'tableros' || text === '/tablero' || text === 'tablero') {
        await this.handleTableros(context)
      } else if (text.startsWith('/tarea') || text.startsWith('tarea')) {
        await this.handleCrearTarea(context, rawText)
      } else {
        await context.sendActivity(
          `No entendi "${text}". Escribe **ayuda** para ver los comandos disponibles.`
        )
      }

      await next()
    })

    // When the bot is added to a conversation
    this.onMembersAdded(async (context, next) => {
      for (const member of context.activity.membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await this.sendWelcomeMessage(context)
        }
      }
      await next()
    })

    // When a conversation update happens
    this.onConversationUpdate(async (context, next) => {
      await next()
    })
  }

  async sendWelcomeMessage(context) {
    const card = CardFactory.heroCard(
      'Bienvenido a Planner Bot',
      'Te enviare notificaciones cuando te mencionen en Planner.',
      null,
      [
        { type: 'messageBack', title: 'Vincular cuenta', text: 'conectar' },
        { type: 'messageBack', title: 'Ayuda', text: 'ayuda' }
      ]
    )

    await context.sendActivity({ attachments: [card] })
  }

  async sendHelpMessage(context) {
    const message = `**Comandos disponibles:**

- **conectar** - Vincula tu cuenta de Planner para recibir notificaciones
- **estado** - Verifica si tu cuenta esta vinculada
- **/tableros** - Lista todos los tableros disponibles
- **/tarea** - Crea una tarea en un tablero
- **ayuda** - Muestra este mensaje

**Crear tarea:**
\`/tarea tablero="Nombre" titulo="Titulo" [prioridad="alta"] [fecha="YYYY-MM-DD"]\`

Una vez vinculado, recibiras notificaciones y podras crear tareas directamente desde Teams.`

    await context.sendActivity(message)
  }

  async sendStatusMessage(context) {
    const teamsUserId = context.activity.from.id
    const user = await db.prepare('SELECT * FROM users WHERE teams_user_id = ?').get(teamsUserId)

    if (user) {
      await context.sendActivity(`Tu cuenta de Teams esta vinculada a **${user.name}** (${user.email}).`)
    } else {
      await context.sendActivity('Tu cuenta de Teams no esta vinculada a ninguna cuenta de Planner. Escribe **conectar** para vincularla.')
    }
  }

  async getLinkedUser(context) {
    const teamsUserId = context.activity.from.id
    return db.prepare('SELECT * FROM users WHERE teams_user_id = ?').get(teamsUserId)
  }

  async handleTableros(context) {
    try {
      const boards = await db.prepare(`
        SELECT b.*, u.name as owner_name
        FROM boards b
        JOIN users u ON b.owner_id = u.id
        ORDER BY b.created_at DESC
      `).all()

      if (boards.length === 0) {
        await context.sendActivity('No hay tableros creados todavia.')
        return
      }

      let message = '**Tableros disponibles:**\n\n'

      for (const board of boards) {
        const columns = await db.prepare(`
          SELECT name FROM columns WHERE board_id = ? ORDER BY position
        `).all(board.id)

        const columnNames = columns.map(c => c.name).join(', ')
        message += `**${board.name}**`
        if (board.description) message += ` - ${board.description}`
        message += `\n   Columnas: ${columnNames || 'Sin columnas'}`
        message += `\n   Creado por: ${board.owner_name}\n\n`
      }

      message += '_Usa **/tarea** para crear una tarea en cualquier tablero._'

      await context.sendActivity(message)
    } catch (error) {
      console.error('Error listing boards:', error)
      await context.sendActivity('Ocurrio un error al obtener los tableros.')
    }
  }

  async handleCrearTarea(context, rawText) {
    try {
      // Verify linked account
      const user = await this.getLinkedUser(context)
      if (!user) {
        await context.sendActivity('Necesitas vincular tu cuenta primero. Escribe **conectar** para vincularla.')
        return
      }

      // Parse parameters from the raw text (preserving case)
      const params = parseCommandParams(rawText)

      // Validate required params
      if (!params.tablero || !params.titulo) {
        const usage = `**Uso de /tarea:**

\`/tarea tablero="Nombre" titulo="Titulo de la tarea"\`

**Parametros opcionales:**
- columna="Nombre columna" (default: primera columna)
- descripcion="Descripcion de la tarea"
- prioridad="alta|media|baja"
- fecha="YYYY-MM-DD"

**Ejemplo:**
\`/tarea tablero="Marketing" titulo="Revisar campaña" prioridad="alta" fecha="2025-04-01"\``

        await context.sendActivity(usage)
        return
      }

      // Find board by name (case-insensitive, partial match)
      const board = await db.prepare(`
        SELECT * FROM boards WHERE LOWER(name) LIKE ?
      `).get(`%${params.tablero.toLowerCase()}%`)

      if (!board) {
        await context.sendActivity(`No encontre un tablero con el nombre "${params.tablero}". Escribe **/tableros** para ver los disponibles.`)
        return
      }

      // Find column
      let column
      if (params.columna) {
        column = await db.prepare(`
          SELECT * FROM columns WHERE board_id = ? AND LOWER(name) LIKE ? ORDER BY position LIMIT 1
        `).get(board.id, `%${params.columna.toLowerCase()}%`)

        if (!column) {
          const columns = await db.prepare(`
            SELECT name FROM columns WHERE board_id = ? ORDER BY position
          `).all(board.id)
          const names = columns.map(c => `"${c.name}"`).join(', ')
          await context.sendActivity(`No encontre la columna "${params.columna}" en el tablero **${board.name}**.\nColumnas disponibles: ${names}`)
          return
        }
      } else {
        // Default to first column
        column = await db.prepare(`
          SELECT * FROM columns WHERE board_id = ? ORDER BY position LIMIT 1
        `).get(board.id)

        if (!column) {
          await context.sendActivity(`El tablero **${board.name}** no tiene columnas.`)
          return
        }
      }

      // Calculate position
      const maxPos = await db.prepare(`
        SELECT MAX(position) as max FROM cards WHERE column_id = ?
      `).get(column.id)
      const position = (maxPos?.max ?? -1) + 1

      // Validate priority
      const validPriorities = ['alta', 'media', 'baja', 'high', 'medium', 'low']
      const priority = params.prioridad && validPriorities.includes(params.prioridad.toLowerCase())
        ? params.prioridad.toLowerCase()
        : params.prioridad || null

      // Create the card
      const cardId = uuidv4()
      await db.prepare(`
        INSERT INTO cards (id, column_id, title, description, priority, due_date, position, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        cardId,
        column.id,
        params.titulo,
        params.descripcion || null,
        priority,
        params.fecha || null,
        position,
        user.id
      )

      // Build confirmation message
      let confirmation = `Tarea creada exitosamente!\n\n`
      confirmation += `**${params.titulo}**\n`
      confirmation += `Tablero: ${board.name}\n`
      confirmation += `Columna: ${column.name}\n`
      if (params.descripcion) confirmation += `Descripcion: ${params.descripcion}\n`
      if (priority) confirmation += `Prioridad: ${priority}\n`
      if (params.fecha) confirmation += `Fecha limite: ${params.fecha}\n`

      await context.sendActivity(confirmation)
    } catch (error) {
      console.error('Error creating task:', error)
      await context.sendActivity('Ocurrio un error al crear la tarea. Verifica los parametros e intenta de nuevo.')
    }
  }

  async handleLinkRequest(context) {
    const teamsUserId = context.activity.from.id
    const teamsUserName = context.activity.from.name
    const conversationRef = TurnContext.getConversationReference(context.activity)

    // Check if already linked
    const existingUser = await db.prepare('SELECT * FROM users WHERE teams_user_id = ?').get(teamsUserId)

    if (existingUser) {
      await context.sendActivity(`Ya estas vinculado a la cuenta **${existingUser.name}** (${existingUser.email}).`)
      return
    }

    // Generate a linking code
    const linkCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Store temporarily (in a real app, use Redis or similar)
    // For now, we'll store in a simple in-memory map exported from this module
    pendingLinks.set(linkCode, {
      teamsUserId,
      teamsUserName,
      conversationRef: JSON.stringify(conversationRef),
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    })

    const card = CardFactory.heroCard(
      'Vincula tu cuenta',
      `Tu codigo de vinculacion es: **${linkCode}**

1. Ve a Planner (tu aplicacion web)
2. Abre Configuracion (icono de engranaje)
3. Introduce este codigo en "Vincular Teams"

El codigo expira en 10 minutos.`,
      null
    )

    await context.sendActivity({ attachments: [card] })
  }
}

// In-memory store for pending link codes
// In production, use Redis or database
export const pendingLinks = new Map()

// Clean expired codes periodically
setInterval(() => {
  const now = Date.now()
  for (const [code, data] of pendingLinks) {
    if (data.expiresAt < now) {
      pendingLinks.delete(code)
    }
  }
}, 60000) // Every minute
