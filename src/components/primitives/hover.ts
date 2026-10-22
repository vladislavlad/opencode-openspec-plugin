// Hover state shared by a list and its rows, so only one row highlights at a time.
export type HoverState = {
  hovered: () => string | null
  setHovered: (fn: (h: string | null) => string | null) => void
}

// Hover flag + mouse handlers for one row. Keys are namespaced (`spec:name`) so rows of different
// kinds never share one.
export function rowHover(state: HoverState, key: () => string) {
  return {
    active: () => state.hovered() === key(),
    onMouseOver: () => state.setHovered(() => key()),
    onMouseOut: () => state.setHovered((h) => (h === key() ? null : h)),
  }
}
