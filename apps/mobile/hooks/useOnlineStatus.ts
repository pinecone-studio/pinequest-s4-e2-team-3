import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

/**
 * Returns true only when the device has both a network connection AND confirmed
 * internet reachability. Uses isInternetReachable rather than isConnected so
 * captive portals and airplane-mode-with-wifi edge cases are handled correctly.
 *
 * Requires: expo install @react-native-community/netinfo
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Resolve initial state.
    NetInfo.fetch().then((state) => {
      setOnline(state.isConnected === true && state.isInternetReachable === true);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected === true && state.isInternetReachable === true);
    });

    return () => unsubscribe();
  }, []);

  return online;
}
