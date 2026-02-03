import { ActivityHandler, TurnContext, CardFactory } from 'botbuilder'
import db from '../database/db.js'

export class PlannerBot extends ActivityHandler {
  constructor() {
    super()

    // When a user sends a message
    this.onMessage(async (context, next) => {
      const text = context.activity.text?.toLowerCase().trim()

      if (text === 'conectar' || text === 'vincular' || text === 'link') {
        await this.handleLinkRequest(context)
      } else if (text === 'ayuda' || text === 'help') {
        await this.sendHelpMessage(context)
      } else if (text === 'estado' || text === 'status') {
        await this.sendStatusMessage(context)
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
- **ayuda** - Muestra este mensaje

Una vez vinculado, recibiras un mensaje personal cuando alguien te mencione en un comentario.`

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
