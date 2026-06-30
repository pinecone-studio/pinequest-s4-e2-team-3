import "../global.css";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { WaypointLoader } from "@/components/WaypointLoader";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Minimum ms to show the loader so the animation is always visible.
// Clerk resolves instantly when the token is cached, so without this
// the loader would flash for < 16ms and never be seen.
const MIN_LOADER_MS = 1500;

// Keeps the user in the right place: signed-in users land in the tabs, and
// everyone else is sent to the auth screens. Runs once Clerk has loaded.
function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Hide the native splash immediately so our WaypointLoader is visible.
    SplashScreen.hideAsync();
    const t = setTimeout(() => setMinTimeElapsed(true), MIN_LOADER_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isLoaded || !minTimeElapsed) return;

    const inAuthGroup = segments[0] === "(auth)";
    if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/login");
    }
  }, [isLoaded, isSignedIn, segments, minTimeElapsed]);

  const showLoader = !isLoaded || !minTimeElapsed;

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
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <InitialLayout />
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
});
