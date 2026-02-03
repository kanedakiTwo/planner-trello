// Microsoft Teams Integration (Webhook + Bot)

// Lazy load bot dependencies to avoid errors when not configured
let CardFactory = null
let adapter = null

const loadBotDependencies = async () => {
  if (adapter === null && process.env.MICROSOFT_APP_ID) {
    try {
      const botbuilder = await import('botbuilder')
      const adapterModule = await import('../bot/adapter.js')
      CardFactory = botbuilder.CardFactory
      adapter = adapterModule.adapter
    } catch (e) {
      console.error('Could not load bot dependencies:', e)
    }
  }
  return { CardFactory, adapter }
}

// ============ WEBHOOK NOTIFICATIONS (to channels) ============

export async function sendTeamsNotification(webhookUrl, message) {
  if (!webhookUrl) {
    console.log('No Teams webhook configured for user')
    return false
  }

  try {
    const payload = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": "0076D7",
      "summary": message.title,
      "sections": [{
        "activityTitle": message.title,
        "activitySubtitle": message.subtitle || "",
        "activityImage": "https://cdn-icons-png.flaticon.com/512/906/906343.png",
        "facts": message.facts || [],
        "markdown": true,
        "text": message.text
      }],
      "potentialAction": message.actionUrl ? [{
        "@type": "OpenUri",
        "name": "Ver en Planner",
        "targets": [{
          "os": "default",
          "uri": message.actionUrl
        }]
      }] : []
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error('Teams webhook error:', response.status, await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending Teams notification:', error)
    return false
  }
}

// ============ BOT PROACTIVE MESSAGES (personal chat) ============

export async function sendProactiveMessage(conversationRefJson, message) {
  if (!conversationRefJson) {
    console.log('No conversation reference for user')
    return false
  }

  const { CardFactory: CF, adapter: adp } = await loadBotDependencies()
  if (!adp || !CF) {
    console.log('Bot not configured, cannot send proactive message')
    return false
  }

  try {
    const conversationRef = JSON.parse(conversationRefJson)

    await adp.continueConversationAsync(
      process.env.MICROSOFT_APP_ID,
      conversationRef,
      async (context) => {
        // Create an Adaptive Card for rich notification
        const card = CF.adaptiveCard({
          "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
          "type": "AdaptiveCard",
          "version": "1.4",
          "body": [
            {
              "type": "TextBlock",
              "text": message.title,
              "weight": "Bolder",
              "size": "Medium",
              "color": "Accent"
            },
            {
              "type": "TextBlock",
              "text": message.subtitle,
              "isSubtle": true,
              "spacing": "None"
            },
            {
              "type": "TextBlock",
              "text": message.text,
              "wrap": true,
              "spacing": "Medium"
            },
            {
              "type": "FactSet",
              "facts": message.facts.map(f => ({ title: f.name, value: f.value })),
              "spacing": "Medium"
            }
          ],
          "actions": message.actionUrl ? [
            {
              "type": "Action.OpenUrl",
              "title": "Ver en Planner",
              "url": message.actionUrl
            }
          ] : []
        })

        await context.sendActivity({ attachments: [card] })
      }
    )

    return true
  } catch (error) {
    console.error('Error sending proactive message:', error)
    return false
  }
}

// ============ UNIFIED NOTIFICATION FUNCTION ============

export async function notifyMention(mentionedUser, mentionerName, cardTitle, commentContent, boardName, cardUrl) {
  const message = {
    title: `Te han mencionado en Planner`,
    subtitle: `${mentionerName} te menciono en "${cardTitle}"`,
    text: commentContent,
    facts: [
      { name: "Tablero", value: boardName },
      { name: "Tarjeta", value: cardTitle },
      { name: "Mencionado por", value: mentionerName }
    ],
    actionUrl: cardUrl
  }

  // Priority 1: Send via bot (personal message)
  if (mentionedUser.teams_conversation_ref) {
    const sent = await sendProactiveMessage(mentionedUser.teams_conversation_ref, message)
    if (sent) return true
  }

  // Priority 2: Fall back to webhook (channel message)
  if (mentionedUser.teams_webhook) {
    return sendTeamsNotification(mentionedUser.teams_webhook, message)
  }

  return false
}
