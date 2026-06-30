// Canonical source is packages/shared/src/featureAvailability.ts — keep in sync.
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
