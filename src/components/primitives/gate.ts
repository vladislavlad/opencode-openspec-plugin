// Greys a button out and diverts the click – spread onto every action that must wait for the agent.
export type Gate = { disabled?: () => boolean; onDisabledClick?: () => void }
