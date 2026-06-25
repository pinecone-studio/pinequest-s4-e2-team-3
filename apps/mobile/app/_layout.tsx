import "../global.css";
import { Slot, SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialized, session } = useAuthStore();

  useEffect(() => {
    if (initialized) SplashScreen.hideAsync();
  }, [initialized]);

  if (!initialized) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
