import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

const PERSIST_KEY = 'dead_switch_v1'

// How long the overlay stays visible before auto-triggering the alert
export const OVERLAY_COUNTDOWN_SECS = 60

// Default check-in interval: 4 hours
const DEFAULT_INTERVAL_MS = 4 * 60 * 60 * 1000

export interface PendingAlert {
  id: string
  triggeredAt: number
  contactName: string
  contactPhone: string
}

interface PersistedState {
  isArmed: boolean
  intervalMs: number
  lastCheckIn: number | null
  pendingAlerts: PendingAlert[]
}

interface DeadSwitchState extends PersistedState {
  loaded: boolean
  showOverlay: boolean
  countdownSecs: number
}

interface DeadSwitchActions {
  load: () => Promise<void>
  arm: (intervalMs?: number) => Promise<void>
  disarm: () => Promise<void>
  triggerOverlay: () => void
  setCountdown: (secs: number) => void
  approve: () => Promise<void>
  decline: (contactName: string, contactPhone: string) => Promise<void>
  isCheckInOverdue: () => boolean
}

async function save(state: PersistedState) {
  await SecureStore.setItemAsync(PERSIST_KEY, JSON.stringify(state))
}

export const useDeadSwitchStore = create<DeadSwitchState & DeadSwitchActions>(
  (set, get) => ({
    isArmed: false,
    intervalMs: DEFAULT_INTERVAL_MS,
    lastCheckIn: null,
    pendingAlerts: [],
    loaded: false,
    showOverlay: false,
    countdownSecs: OVERLAY_COUNTDOWN_SECS,

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
      const now = Date.now()
      const next: PersistedState = {
        isArmed: true,
        intervalMs: intervalMs ?? get().intervalMs,
        lastCheckIn: now,
        pendingAlerts: get().pendingAlerts,
      }
      await save(next)
      set(next)
    },

    disarm: async () => {
      const next: PersistedState = {
        isArmed: false,
        intervalMs: get().intervalMs,
        lastCheckIn: null,
        pendingAlerts: get().pendingAlerts,
      }
      await save(next)
      set({ ...next, showOverlay: false })
    },

    triggerOverlay: () =>
      set({ showOverlay: true, countdownSecs: OVERLAY_COUNTDOWN_SECS }),

    setCountdown: (secs) => set({ countdownSecs: secs }),

    approve: async () => {
      const now = Date.now()
      const next: PersistedState = {
        isArmed: get().isArmed,
        intervalMs: get().intervalMs,
        lastCheckIn: now,
        pendingAlerts: get().pendingAlerts,
      }
      await save(next)
      set({ showOverlay: false, lastCheckIn: now })
    },

    decline: async (contactName, contactPhone) => {
      const alert: PendingAlert = {
        id: String(Date.now()),
        triggeredAt: Date.now(),
        contactName,
        contactPhone,
      }
      const pendingAlerts = [...get().pendingAlerts, alert]
      const next: PersistedState = {
        isArmed: get().isArmed,
        intervalMs: get().intervalMs,
        lastCheckIn: get().lastCheckIn,
        pendingAlerts,
      }
      await save(next)
      set({ showOverlay: false, pendingAlerts })
      // TODO: flush to backend/edge function when online
    },

    isCheckInOverdue: () => {
      const { isArmed, lastCheckIn, intervalMs, showOverlay } = get()
      if (!isArmed || showOverlay) return false
      if (lastCheckIn === null) return true
      return Date.now() - lastCheckIn > intervalMs
    },
  }),
)
