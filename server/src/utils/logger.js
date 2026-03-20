// Structured activity logger

function timestamp() {
  return new Date().toISOString()
}

function formatUser(req) {
  return req.user ? `${req.user.name} (${req.user.id.slice(0, 8)})` : 'anonymous'
}

export function logAction(req, action, details = {}) {
  const meta = Object.keys(details).length > 0
    ? ' | ' + Object.entries(details).map(([k, v]) => `${k}=${v}`).join(', ')
    : ''
  console.log(`[${timestamp()}] [ACTION] ${formatUser(req)} -> ${action}${meta}`)
}

export function logNotification(type, recipient, result, details = {}) {
  const meta = Object.keys(details).length > 0
    ? ' | ' + Object.entries(details).map(([k, v]) => `${k}=${v}`).join(', ')
    : ''
  const status = result ? 'SENT' : 'SKIPPED'
  console.log(`[${timestamp()}] [NOTIFY] ${type} -> ${recipient} [${status}]${meta}`)
}

export function logError(context, error) {
  console.error(`[${timestamp()}] [ERROR] ${context}:`, error.message || error)
}
