import type { Context } from "@opencode/plugin/tui/context"
import { currentSession, projectLocation, sessionRunning } from "./location"
import { commandText } from "./command-template"
import { skillRequest, workflowSkill } from "./openspec-tooling"

const pending = new WeakSet<Context>()
const wait = (api: Context) => api.ui.toast.show({ variant: "info", message: "Wait until the agent finishes working" })
const commandIn = (text: string) => /^\/(opsx-[\w-]+)(?:\s+([\s\S]*))?$/.exec(text.trim())
const agentFor = (text: string) => commandIn(text)?.[1] === "opsx-explore" ? "plan" : "build"

// V2 exposes session submission and native dialogs. The main composer is never changed.
export async function sendPrompt(api: Context, text: string, opts: { submit?: boolean } = {}): Promise<boolean> {
  const sessionID = currentSession(api)
  const route = JSON.stringify(api.ui.router.current())
  const location = projectLocation(api, sessionID)
  const changed = () => JSON.stringify(api.ui.router.current()) !== route || JSON.stringify(projectLocation(api)) !== JSON.stringify(location)
  if (pending.has(api) || sessionRunning(api, sessionID)) { wait(api); return false }
  pending.add(api)
  try {
    const selected = api.ui.model.current()
    if (!selected) {
      api.ui.toast.show({ variant: "warning", message: "Select a model in OpenCode before running an OpenSpec action." })
      return false
    }
    // Capture before the dialog or switchAgent: the host may change its model selection when
    // the session agent changes. Always submit with the model/variant the user actually saw.
    const model = { id: selected.modelID, providerID: selected.providerID, variant: selected.variant }
    const ready = () => {
      if (changed()) {
        api.ui.toast.show({ variant: "warning", message: "Active session changed. Run the OpenSpec action again." })
        return false
      }
      if (sessionRunning(api, sessionID)) { wait(api); return false }
      return true
    }
    let body: string | undefined = text
    if (!opts.submit) {
      while (true) {
        const agent = agentFor(body)
        body = await api.ui.dialog.prompt({
          title: "Run OpenSpec command",
          description: `Agent: ${agent === "plan" ? "Plan" : "Build"}\nModel: ${model.providerID}/${model.id}\nVariant: ${model.variant ?? "default"}\nEdit the command, then Enter to run. Esc cancels. Your main draft is preserved.`,
          value: body,
        })
        if (!body?.trim() || !ready()) return false
        // A changed command can require Build instead of Plan (or vice versa). Show the new
        // execution settings before accepting it, rather than running under an unseen agent.
        if (agentFor(body) === agent) break
      }
    }
    if (!body?.trim()) return false
    if (!ready()) return false
    const agent = agentFor(body)
    const command = commandIn(body)
    const prompt = command ? await commandPrompt(api, location, command[1]!, command[2] ?? "") : { text: body }
    if (!ready()) return false
    let target = sessionID
    if (!target) {
      const created = await api.client.session.create({ location, agent, model })
      if (!ready()) return false
      target = created.id
      api.ui.router.navigate({ type: "session", sessionID: target })
    } else {
      await api.client.session.switchAgent({ sessionID: target, agent })
      if (!ready()) return false
      await api.client.session.switchModel({ sessionID: target, model })
      if (!ready()) return false
    }
    await api.client.session.prompt({ sessionID: target, ...prompt })
    return true
  } catch (error) {
    api.ui.toast.show({ variant: "error", message: `OpenSpec request failed: ${String(error)}` })
    return false
  } finally {
    pending.delete(api)
  }
}

async function commandPrompt(api: Context, location: Context["location"], name: string, args: string) {
  const text = await commandText(api, location, name, args)
  if (text !== undefined) return { text }

  const skillName = workflowSkill(name)
  if (skillName) {
    const { data } = await api.client.skill.list({ location })
    const skill = data.find((entry) => entry.name === skillName)
    if (skill) return { text: skillRequest(skillName, args), skills: [{ id: skill.id }] }
  }
  throw new Error(`No readable template or OpenSpec skill for /${name}. Run openspec update, then retry.`)
}

export const submitPrompt = (api: Context, text: string) => sendPrompt(api, text, { submit: true })

// Let the current input event finish before the host tears down its renderer.
export function quitOpencode(api: Context) {
  if (pending.has(api) || sessionRunning(api)) { wait(api); return }
  setTimeout(() => api.keymap.dispatch("app.exit"), 0)
}
