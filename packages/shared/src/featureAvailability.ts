export type FeatureTier = 'offline' | 'degraded' | 'online-only' | 'always';

export type FeatureKey =
  | 'exploreMap'
  | 'savedPlaces'
  | 'downloadedAudio'
  | 'journeyPlanning'
  | 'aiChat'
  | 'liveTTS'
  | 'liveSTT'
  | 'phoneCallTwilio'
  | 'translation'
  | 'sos';

// Canonical tier manifest. Add every new feature here before shipping.
//
// offline      — works fully with no network (cached tiles, saved data)
// degraded     — works but with stale/local data; show an inline note
// online-only  — not usable offline; dim the UI and label it upfront
// always       — SOS: never dim, never restrict, regardless of connectivity
export const featureAvailability: Record<FeatureKey, FeatureTier> = {
  exploreMap: 'offline',
  savedPlaces: 'offline',
  downloadedAudio: 'offline',
  journeyPlanning: 'degraded',
  aiChat: 'online-only',
  liveTTS: 'online-only',
  liveSTT: 'online-only',
  phoneCallTwilio: 'online-only',
  translation: 'online-only',
  sos: 'always',
};
