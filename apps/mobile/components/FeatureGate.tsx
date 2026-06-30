import type { ReactNode } from "react";
import { View, Text } from "react-native";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { featureAvailability, type FeatureKey } from "@/lib/featureAvailability";

interface FeatureGateProps {
  feature: FeatureKey;
  degradedNote?: string;
  children: ReactNode;
}

/**
 * React Native equivalent of the web FeatureGate.
 * Same tier logic — offline/always pass through, degraded adds a note,
 * online-only dims the content and shows a "Needs connection" label.
 */
export function FeatureGate({ feature, degradedNote, children }: FeatureGateProps) {
  const online = useOnlineStatus();
  const tier = featureAvailability[feature];

  if (tier === "always" || tier === "offline") return <>{children}</>;
  if (online) return <>{children}</>;

  if (tier === "degraded") {
    return (
      <View>
        {children}
        <Text className="mt-2 text-xs font-semibold text-gray-400">
          {degradedNote ?? "Using saved data — live updates need a connection"}
        </Text>
      </View>
    );
  }

  // online-only
  return (
    <View>
      <View className="mb-2 flex-row items-center gap-1 self-start rounded-full bg-gray-100 px-3 py-1.5">
        <Text className="text-xs font-semibold text-gray-500">Needs connection</Text>
      </View>
      {/* pointerEvents="none" disables touches on the dimmed content */}
      <View style={{ opacity: 0.4 }} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}
