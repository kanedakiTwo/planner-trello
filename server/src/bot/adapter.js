import { CloudAdapter, ConfigurationBotFrameworkAuthentication } from 'botbuilder'

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication({
  MicrosoftAppId: process.env.MICROSOFT_APP_ID,
  MicrosoftAppPassword: process.env.MICROSOFT_APP_PASSWORD,
  MicrosoftAppTenantId: process.env.MICROSOFT_APP_TENANT_ID
})

export const adapter = new CloudAdapter(botFrameworkAuthentication)

// Error handler
adapter.onTurnError = async (context, error) => {
  console.error(`Bot error: ${error}`)
  console.error(error.stack)

  await context.sendActivity('Lo siento, ha ocurrido un error. Por favor intenta de nuevo.')
}
