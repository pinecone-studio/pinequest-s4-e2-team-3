import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface EmergencyContact {
  name: string
  phone: string
}

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  setSession: (session: Session | null) => void
  setLoading: (v: boolean) => void
  signOut: () => Promise<void>
  updateEmergencyContact: (contact: EmergencyContact) => Promise<{ error: string | null }>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,

  setSession: (session) =>
    set({ session, user: session?.user ?? null, loading: false }),

  setLoading: (loading) => set({ loading }),

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null })
  },

  updateEmergencyContact: async (contact) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { emergencyContact: contact },
    })
    if (error) return { error: error.message }
    const current = get().user
    if (current && data.user) {
      set({ user: data.user })
    }
    return { error: null }
  },
}))

export function getEmergencyContact(user: User | null): EmergencyContact | null {
  return (user?.user_metadata?.emergencyContact as EmergencyContact | undefined) ?? null
}
