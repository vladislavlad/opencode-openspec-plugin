import type { Context, KeymapCommand, KeymapLayer, Route, ToastOptions } from "@opencode/plugin/tui/context"

export function fixture() {
  const commands: KeymapCommand[] = []
  const calls: { kind: string; input: any }[] = []
  const toasts: ToastOptions[] = []
  const state = {
    route: { type: "session", sessionID: "session-a" } as Route, directory: "/project", busy: false,
    model: { modelID: "model", providerID: "provider", variant: "high" } as ReturnType<Context["ui"]["model"]["current"]>,
  }
  const handlers = {
    dialog: async (input: { value?: string }) => input.value,
    create: async (_input: unknown) => ({ id: "new-session" }),
    prompt: async (_input: unknown) => {},
    command: async (_input: unknown) => {},
    switchAgent: async (_input: unknown) => {},
    switchModel: async (_input: unknown) => {},
    config: async (_input: unknown): ReturnType<Context["client"]["config"]["get"]> => [{ type: "document", info: {
      commands: Object.fromEntries(["apply", "propose", "explore", "update", "archive", "sync"].map((action) => [`opsx-${action}`, { template: `Run ${action}: $ARGUMENTS` }])),
    } }],
    skills: async (_input: unknown): Promise<{ data: { name: string; id: string }[] }> => ({ data: [] }),
    read: async (_input: unknown): Promise<Uint8Array> => { throw { _tag: "FileNotFoundError" } },
  }
  const location = () => ({ directory: state.directory })
  const api = {
    app: { version: "2.4.1" },
    get location() { return location() },
    data: { session: { get: () => ({ location: location() }), status: () => state.busy ? "running" : "idle" }, location: { default: location } },
    keymap: {
      layer: (factory: () => KeymapLayer) => commands.push(...factory().commands ?? []),
      dispatch: (id: string) => calls.push({ kind: "dispatch", input: id }),
    },
    ui: {
      toast: { show: (toast: ToastOptions) => toasts.push(toast) },
      dialog: { prompt: async (input: { value?: string }) => { calls.push({ kind: "dialog", input }); return handlers.dialog(input) } },
      router: { current: () => state.route, navigate: (route: Route) => { state.route = route; calls.push({ kind: "navigate", input: route }) } },
      model: { current: () => state.model },
    },
    client: {
      skill: { list: (input: unknown) => handlers.skills(input) },
      config: { get: async (input: unknown) => { calls.push({ kind: "config", input }); return handlers.config(input) } },
      file: { read: async (input: unknown) => { calls.push({ kind: "read", input }); return handlers.read(input) } },
      session: {
      create: async (input: unknown) => { calls.push({ kind: "create", input }); return handlers.create(input) },
      prompt: async (input: unknown) => { calls.push({ kind: "prompt", input }); await handlers.prompt(input) },
      command: async (input: unknown) => { calls.push({ kind: "command", input }); await handlers.command(input) },
      switchAgent: async (input: unknown) => { calls.push({ kind: "switchAgent", input }); await handlers.switchAgent(input) },
      switchModel: async (input: unknown) => { calls.push({ kind: "switchModel", input }); await handlers.switchModel(input) },
    } },
  } as unknown as Context
  return { api, calls, toasts, state, handlers, commands }
}
