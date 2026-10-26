export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type WorkMode = 'main' | 'branch' | 'worktree'
export type ContextFill = { percent?: number; tokens?: number; window: number }
export type LastUsed = { model: string; effort?: string }

declare module 'claude-code' {
  interface PluginState {
    'session-control': {
      model: string | null
      effort: Effort | null
      mode: WorkMode
      context: ContextFill | null
      lastUsed: LastUsed | null
    }
  }
}
