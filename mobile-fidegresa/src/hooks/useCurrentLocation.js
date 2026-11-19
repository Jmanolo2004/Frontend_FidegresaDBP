import { useCallback, useState } from "react";
import { Linking } from "react-native";
import * as Location from "expo-location";
import { reverseGeocode } from "../services/geocodingService";

/**
 * Sensor GPS: pide permiso, obtiene la posición y la traduce a una dirección con la API externa.
 * Si el GPS falla o no hay permiso, devuelve un estado claro para mostrar la elección manual.
 */
export function useCurrentLocation() {
  const [state, setState] = useState({ status: "idle", position: null, address: null, message: null, canAskAgain: true });

  const locate = useCallback(async () => {
    setState(previous => ({ ...previous, status: "locating", message: null }));
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setState({ status: "unavailable", position: null, address: null, canAskAgain: true, message: "Activa la ubicación del celular para detectar tu local." });
        return null;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setState({
          status: "denied",
          position: null,
          address: null,
          canAskAgain: permission.canAskAgain,
          message: permission.canAskAgain
            ? "Sin permiso de ubicación. Puedes elegir tu local a mano."
            : "La ubicación está bloqueada para Fidegresa. Actívala en Ajustes o elige tu local a mano."
        });
        return null;
      }

      const current =
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null)) ??
        (await Location.getLastKnownPositionAsync());
      if (!current) {
        setState({ status: "unavailable", position: null, address: null, canAskAgain: true, message: "No pudimos leer el GPS. Elige tu local a mano." });
        return null;
      }

      const position = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setState({ status: "located", position, address: null, canAskAgain: true, message: null });

      // La dirección es un dato de apoyo: si la API externa falla, la ubicación sigue sirviendo.
      reverseGeocode(position)
        .then(address => setState(previous => (previous.position === position ? { ...previous, address } : previous)))
        .catch(() => {});
      return position;
    } catch {
      setState({ status: "unavailable", position: null, address: null, canAskAgain: true, message: "No pudimos obtener tu ubicación. Elige tu local a mano." });
      return null;
    }
  }, []);

  const openSettings = useCallback(() => Linking.openSettings(), []);

  return { ...state, locate, openSettings };
}
