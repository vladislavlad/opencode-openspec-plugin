import type { Context } from "@opencode/plugin/tui/context"

export function currentSession(api: Context): string | undefined {
  const route = api.ui.router.current()
  return route.type === "session" ? route.sessionID : undefined
}

export function projectLocation(api: Context, sessionID = currentSession(api)) {
  return (sessionID ? api.data.session.get(sessionID)?.location : undefined) ?? api.location ?? api.data.location.default()
}

export function sessionRunning(api: Context, sessionID = currentSession(api)) {
  return sessionID !== undefined && api.data.session.status(sessionID) === "running"
}
