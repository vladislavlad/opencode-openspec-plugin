import type { FileClient } from "./openspec"

const workflows = {
  "opsx-apply": "openspec-apply-change",
  "opsx-archive": "openspec-archive-change",
  "opsx-explore": "openspec-explore",
  "opsx-propose": "openspec-propose",
  "opsx-sync": "openspec-sync-specs",
  "opsx-update": "openspec-update-change",
} as const

export const OPSX_COMMANDS = Object.keys(workflows)
export const OPENSPEC_SKILLS = Object.values(workflows)
export const MODERN_SKILL_DIR = ".agents/skills"
export const LEGACY_SKILL_DIR = ".opencode/skills"

export function workflowSkill(command: string): string | undefined {
  return Object.hasOwn(workflows, command) ? workflows[command as keyof typeof workflows] : undefined
}

export function skillRequest(skill: string, args: string): string {
  return [`Follow the ${skill} skill for this OpenSpec project.`, args.trim()].filter(Boolean).join("\n\n")
}

export function hasWorkflowSkills(names: Iterable<string>): boolean {
  const available = new Set(names)
  return OPENSPEC_SKILLS.every((skill) => available.has(skill))
}

export async function hasOpenSpecTooling(client: FileClient): Promise<boolean> {
  const list = (path: string) => client.list(path).catch(() => [])
  const modern = await list(MODERN_SKILL_DIR)
  if (hasWorkflowSkills(modern.filter((entry) => entry.type === "directory").map((entry) => entry.name))) return true

  const [commands, legacy] = await Promise.all([list(".opencode/commands"), list(LEGACY_SKILL_DIR)])
  const commandNames = new Set(commands.filter((entry) => entry.type === "file").map((entry) => entry.name))
  return OPSX_COMMANDS.every((name) => commandNames.has(`${name}.md`))
    && hasWorkflowSkills(legacy.filter((entry) => entry.type === "directory").map((entry) => entry.name))
}
