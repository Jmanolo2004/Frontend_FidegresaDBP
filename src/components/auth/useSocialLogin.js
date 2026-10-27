import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";

const PROVIDER_NAMES = { google: "Google", apple: "Apple" };

/** Lógica compartida por login y registro para "Continuar con Google / Apple". */
export function useSocialLogin(redirectTo) {
  const { loginWithProvider } = useAuth();
  const { showToast, showError } = useToast();
  const navigate = useNavigate();
  const [loadingProvider, setLoadingProvider] = useState(null);

  const continueWith = async provider => {
    setLoadingProvider(provider);
    try {
      const profile = await loginWithProvider(provider);
      showToast(`Bienvenido, ${profile.fullName}. Ingresaste con ${PROVIDER_NAMES[provider]}.`);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error.isNetworkError) navigate("/sin-conexion");
      else showError(error.message);
    } finally {
      setLoadingProvider(null);
    }
  };

  return { loadingProvider, continueWith };
}
