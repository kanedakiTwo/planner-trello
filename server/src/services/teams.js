// Microsoft Teams Webhook Integration

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

export async function notifyMention(mentionedUser, mentionerName, cardTitle, commentContent, boardName, cardUrl) {
  if (!mentionedUser.teams_webhook) {
    return false
  }

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

  return sendTeamsNotification(mentionedUser.teams_webhook, message)
}
