import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

const PERSIST_KEY = 'dead_switch_v1'

// How often we text the emergency contact a fresh location while armed
export const DEFAULT_PING_INTERVAL_MS = 15 * 60 * 1000

interface PersistedState {
  isArmed: boolean
  intervalMs: number
  lastSentAt: number | null
}

interface DeadSwitchState extends PersistedState {
  loaded: boolean
}

interface DeadSwitchActions {
  load: () => Promise<void>
  arm: (intervalMs?: number) => Promise<void>
  disarm: () => Promise<void>
  markSent: (timestamp: number) => Promise<void>
}

async function save(state: PersistedState) {
  await SecureStore.setItemAsync(PERSIST_KEY, JSON.stringify(state))
}

export const useDeadSwitchStore = create<DeadSwitchState & DeadSwitchActions>(
  (set, get) => ({
    isArmed: false,
    intervalMs: DEFAULT_PING_INTERVAL_MS,
    lastSentAt: null,
    loaded: false,

    load: async () => {
      try {
        const raw = await SecureStore.getItemAsync(PERSIST_KEY)
        if (raw) {
          const saved: PersistedState = JSON.parse(raw)
          set({ ...saved, loaded: true })
        } else {
          set({ loaded: true })
        }
      } catch {
        set({ loaded: true })
      }
    },

    arm: async (intervalMs) => {
      const next: PersistedState = {
        isArmed: true,
        intervalMs: intervalMs ?? get().intervalMs,
        lastSentAt: null,
      }
      await save(next)
      set(next)
    },

    disarm: async () => {
      const next: PersistedState = {
        isArmed: false,
        intervalMs: get().intervalMs,
        lastSentAt: get().lastSentAt,
      }
      await save(next)
      set(next)
    },

    markSent: async (timestamp) => {
      const next: PersistedState = {
        isArmed: get().isArmed,
        intervalMs: get().intervalMs,
        lastSentAt: timestamp,
      }
      await save(next)
      set({ lastSentAt: timestamp })
    },
  }),
)
