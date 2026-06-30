import "../global.css";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useDeadSwitchStore } from "@/stores/deadSwitchStore";
import { DeadSwitchOverlay } from "@/components/DeadSwitchOverlay";
import { WaypointLoader } from "@/components/WaypointLoader";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";

SplashScreen.preventAutoHideAsync();

const MIN_LOADER_MS = 1500;
// Poll every 30 s to see if a check-in is overdue (works offline)
const CHECK_INTERVAL_MS = 30_000;

function InitialLayout() {
  const { session, loading, setSession, setLoading } = useAuthStore();
  const { load: loadSwitch, isCheckInOverdue, triggerOverlay, showOverlay } =
    useDeadSwitchStore();

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  // ── Splash / loader ────────────────────────────────────────────────────────
  useEffect(() => {
    SplashScreen.hideAsync();
    const t = setTimeout(() => setMinTimeElapsed(true), MIN_LOADER_MS);
    return () => clearTimeout(t);
  }, []);

  // ── Supabase auth listener ─────────────────────────────────────────────────
  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Listen for future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Dead switch initialisation ─────────────────────────────────────────────
  useEffect(() => {
    loadSwitch();
  }, []);

  // ── Dead switch timer (polls every 30 s; also fires on foreground) ─────────
  useEffect(() => {
    function check() {
      if (isCheckInOverdue()) triggerOverlay();
    }

    const timer = setInterval(check, CHECK_INTERVAL_MS);

    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        check();
      }
      appState.current = nextState;
    });

    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [isCheckInOverdue, triggerOverlay]);

  // ── Route guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !minTimeElapsed) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isSignedIn = session !== null;

    if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/login");
    }
  }, [loading, session, segments, minTimeElapsed]);

  const showLoader = loading || !minTimeElapsed;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>

      {showLoader && (
        <View style={styles.overlay}>
          <WaypointLoader variant="fullscreen" />
        </View>
      )}

      {/* Dead man's switch full-screen overlay — rendered at root so it
          appears above all tabs and screens */}
      <DeadSwitchOverlay />
    </View>
  );
}

export default function RootLayout() {
  return <InitialLayout />;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
});
