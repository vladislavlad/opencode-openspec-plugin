import { expect, test } from "bun:test"
import { createSignal } from "solid-js"
import { testRender } from "@opentui/solid"
import { SearchField } from "../src/components/search"
import type { CliRenderer, Renderable, TuiThemeCurrent } from "@opencode-ai/plugin/tui"

const theme = () =>
  ({ text: "#ffffff", textMuted: "#888888", accent: "#00aaff" }) as unknown as TuiThemeCurrent

const WIDTH = 40 // the "✕" sits in the last column of the row
const FIELD_X = 5 // inside the input: past the "🔍" (two cells) and the gap

// The component subscribes to the renderer while it renders, before `testRender` hands one back —
// so it gets a stand-in that forwards to the real renderer once it exists.
function deferredRenderer() {
  const pending: [string, (...args: never[]) => void][] = []
  let real: CliRenderer | null = null
  const proxy = {
    get currentFocusedRenderable() {
      return real?.currentFocusedRenderable ?? null
    },
    on: (event: string, handler: (...args: never[]) => void) => {
      if (real) real.on(event, handler)
      else pending.push([event, handler])
    },
    off: (event: string, handler: (...args: never[]) => void) => real?.off(event, handler),
  } as unknown as CliRenderer
  return {
    proxy,
    attach: (renderer: CliRenderer) => {
      real = renderer
      for (const [event, handler] of pending) renderer.on(event, handler)
    },
  }
}

// Renders the field next to a second input standing in for opencode's chat prompt.
async function mount() {
  const [value, setValue] = createSignal("")
  const { proxy, attach } = deferredRenderer()
  let prompt: Renderable | undefined
  const setup = await testRender(
    () => (
      <box>
        <input ref={(el) => (prompt = el)} placeholder="Chat prompt" />
        <SearchField
          theme={theme}
          renderer={proxy}
          value={value}
          onInput={setValue}
          placeholder="Search specs"
        />
      </box>
    ),
    { width: WIDTH, height: 6 },
  )
  attach(setup.renderer as unknown as CliRenderer)
  await setup.renderOnce()
  prompt!.focus()
  return { ...setup, value, prompt: prompt! }
}

test("shows the placeholder while empty", async () => {
  const { captureCharFrame, renderer } = await mount()
  expect(captureCharFrame()).toContain("Search specs")
  renderer.destroy()
})

test("a click focuses the field and typed text reaches onInput", async () => {
  const { mockMouse, mockInput, renderOnce, captureCharFrame, value, renderer } = await mount()
  await mockMouse.click(FIELD_X, 1)
  await mockInput.typeText("archive")
  await renderOnce()
  expect(value()).toBe("archive")
  expect(captureCharFrame()).toContain("archive")
  renderer.destroy()
})

test("Esc blurs and hands focus back to the prompt, keeping the query", async () => {
  const { mockMouse, mockInput, renderOnce, value, prompt, renderer } = await mount()
  await mockMouse.click(FIELD_X, 1)
  await mockInput.typeText("spec")
  mockInput.pressEscape()
  await new Promise((r) => setTimeout(r, 50)) // a lone ESC is only parsed once the sequence times out
  await renderOnce()
  expect(prompt.focused).toBe(true)
  expect(value()).toBe("spec")
  renderer.destroy()
})

test("Enter blurs and hands focus back to the prompt", async () => {
  const { mockMouse, mockInput, renderOnce, prompt, renderer } = await mount()
  await mockMouse.click(FIELD_X, 1)
  await mockInput.typeText("spec")
  mockInput.pressEnter()
  await renderOnce()
  expect(prompt.focused).toBe(true)
  renderer.destroy()
})

test("clicking away and back re-focuses the field", async () => {
  const { mockMouse, mockInput, renderOnce, value, prompt, renderer } = await mount()
  await mockMouse.click(FIELD_X, 1)
  await mockInput.typeText("one")
  // Focus moves to the prompt without going through the field (as a click on the chat input does).
  prompt.focus()
  await renderOnce()
  await mockMouse.click(WIDTH - 3, 1) // past the text, so the cursor lands at the end
  await mockInput.typeText("two")
  await renderOnce()
  expect(prompt.focused).toBe(false)
  expect(value()).toBe("onetwo")
  renderer.destroy()
})

test("the ✕ clears the query", async () => {
  const { mockMouse, mockInput, renderOnce, captureCharFrame, value, renderer } = await mount()
  await mockMouse.click(FIELD_X, 1)
  await mockInput.typeText("archive")
  await renderOnce()
  expect(captureCharFrame()).toContain("✕")
  await mockMouse.click(WIDTH - 2, 1) // the glyph itself; the last column is its right padding
  await renderOnce()
  expect(value()).toBe("")
  expect(captureCharFrame()).toContain("Search specs")
  renderer.destroy()
})
