import { useEffect } from "react";

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Fidegresa` : "Fidegresa | Software de fidelización a tus clientes";
  }, [title]);
}
