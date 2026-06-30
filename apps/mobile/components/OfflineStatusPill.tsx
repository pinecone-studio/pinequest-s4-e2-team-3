import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

type PillState = "offline" | "reconnected" | "hidden";

/**
 * Floating pill that appears on connectivity change.
 * Stays visible while offline; auto-dismisses 3 s after reconnecting.
 * Rendered above the tab bar — position absolutely from the bottom.
 */
export function OfflineStatusPill() {
  const online = useOnlineStatus();
  const [pillState, setPillState] = useState<PillState>("hidden");
  const opacity = useRef(new Animated.Value(0)).current;
  const initialized = useRef(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fadeIn() {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }

  function fadeOut(onDone?: () => void) {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onDone?.());
  }

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (!online) {
        setPillState("offline");
        fadeIn();
      }
      return;
    }

    if (dismissTimer.current) clearTimeout(dismissTimer.current);

    if (!online) {
      setPillState("offline");
      fadeIn();
    } else {
      setPillState("reconnected");
      fadeIn();
      dismissTimer.current = setTimeout(() => {
        fadeOut(() => setPillState("hidden"));
      }, 3000);
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  if (pillState === "hidden") return null;

  const isOffline = pillState === "offline";

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 84,
        alignSelf: "center",
        opacity,
        zIndex: 50,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 999,
          backgroundColor: isOffline ? "#1b2640" : "#1F9D6B",
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: isOffline ? "rgba(255,255,255,0.5)" : "#fff",
          }}
        />
        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
          {isOffline ? "Offline — some features limited" : "Back online"}
        </Text>
      </View>
    </Animated.View>
  );
}
