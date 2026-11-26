import type { Context } from "@opencode/plugin/tui/context"

export function currentSession(api: Context): string | undefined {
  const route = api.ui.router.current()
  return route.type === "session" ? route.sessionID : undefined
}

export function projectLocation(api: Context, sessionID = currentSession(api)) {
  return (sessionID ? api.data.session.get(sessionID)?.location : undefined) ?? api.location ?? api.data.location.default()
}

export function sessionRunning(api: Context, sessionID = currentSession(api)) {
  if (!sessionID) return false
  const { session, job } = api.data
  if (session.status(sessionID) === "running") return true
  if (job?.list(sessionID).some((entry) => entry.kind === "subagent" && entry.status === "running")) return true

  // OpenCode queues a subagent report before waking the parent. A report left over from
  // an earlier turn can remain in the inbox after the user interrupts that turn.
  const reports = session.pending?.list(sessionID).filter(
    (item) => item.type === "synthetic" && item.payload.metadata?.source === "subagent",
  )
  if (!reports?.length) return false
  const lastIdle = session.message?.list(sessionID).findLast((entry) => entry.type === "idle")
  return reports.some((item) => item.time.created > (lastIdle?.time.created ?? -Infinity))
}
