import "../global.css";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useDeadSwitchStore } from "@/stores/deadSwitchStore";
import { useDeadSwitchPing } from "@/hooks/useDeadSwitchPing";
import { WaypointLoader } from "@/components/WaypointLoader";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

SplashScreen.preventAutoHideAsync();

const MIN_LOADER_MS = 1500;

function InitialLayout() {
  const { session, loading, setSession, setLoading } = useAuthStore();
  const loadSwitch = useDeadSwitchStore((s) => s.load);

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useDeadSwitchPing();

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
