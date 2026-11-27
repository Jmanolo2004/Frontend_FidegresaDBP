import { useEffect, useState } from "react";
import { menuService } from "../services/menuService";

/**
 * Las fotos y PDFs del menú necesitan el token, así que no sirven en un <img src> directo.
 * Este hook los descarga con la sesión y devuelve una URL temporal (blob:) para mostrarlos.
 */
export function useAuthFile(url) {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (!url) {
      setObjectUrl(null);
      return undefined;
    }
    const controller = new AbortController();
    let created = null;
    menuService
      .getFile(url, { signal: controller.signal })
      .then(blob => {
        created = URL.createObjectURL(blob);
        setObjectUrl(created);
      })
      .catch(() => setObjectUrl(null));
    return () => {
      controller.abort();
      if (created) URL.revokeObjectURL(created);
    };
  }, [url]);

  return objectUrl;
}
