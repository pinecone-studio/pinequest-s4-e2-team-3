import { useEffect, useRef } from 'react'
import * as Location from 'expo-location'
import { AppState } from 'react-native'
import { useDeadSwitchStore } from '@/stores/deadSwitchStore'
import { useAuthStore, getEmergencyContact } from '@/stores/authStore'
import { api } from '@/services/api'

// How often we check whether a ping is due; the actual send only happens
// once `intervalMs` has elapsed since the last one.
const CHECK_INTERVAL_MS = 30_000

// While the Dead Man's Switch is armed, periodically sends the traveller's
// current coordinates to their emergency contact via SMS. Runs at the app
// root so it keeps working across every screen.
export function useDeadSwitchPing() {
  const isArmed = useDeadSwitchStore((s) => s.isArmed)
  const intervalMs = useDeadSwitchStore((s) => s.intervalMs)
  const lastSentAt = useDeadSwitchStore((s) => s.lastSentAt)
  const markSent = useDeadSwitchStore((s) => s.markSent)
  const user = useAuthStore((s) => s.user)
  const session = useAuthStore((s) => s.session)
  const sendingRef = useRef(false)

  useEffect(() => {
    async function sendPingIfDue() {
      if (!isArmed || sendingRef.current) return
      const due = lastSentAt === null || Date.now() - lastSentAt >= intervalMs
      if (!due) return

      const contact = getEmergencyContact(user)
      const token = session?.access_token
      if (!contact || !token) return

      sendingRef.current = true
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') return

        const loc = await Location.getCurrentPositionAsync({})
        await api.post(
          '/api/sms/dead-switch',
          {
            contactName: contact.name,
            contactPhone: contact.phone,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          },
          token,
        )
        await markSent(Date.now())
      } catch {
        // Offline or send failed — the next tick will retry.
      } finally {
        sendingRef.current = false
      }
    }

    sendPingIfDue()
    const timer = setInterval(sendPingIfDue, CHECK_INTERVAL_MS)
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') sendPingIfDue()
    })

    return () => {
      clearInterval(timer)
      sub.remove()
    }
  }, [isArmed, intervalMs, lastSentAt, user, session, markSent])
}
