import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

/** true mientras el equipo tenga conexión; null mientras aún no se sabe. */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
    });
    return unsubscribe;
  }, []);

  return isOnline;
}
