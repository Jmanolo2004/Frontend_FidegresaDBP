import { createContext, useCallback, useEffect, useMemo, useReducer } from "react";
import * as authService from "../services/authService";
import { setUnauthorizedHandler } from "../services/apiClient";
import { clearSession, loadSession, saveSession } from "../services/tokenStorage";

export const AuthContext = createContext(null);

const initialState = { status: "loading", user: null, sessionExpired: false };

function authReducer(state, action) {
  switch (action.type) {
    case "restored":
      return { status: action.user ? "authenticated" : "anonymous", user: action.user, sessionExpired: false };
    case "signedIn":
      return { status: "authenticated", user: action.user, sessionExpired: false };
    case "signedOut":
      return { status: "anonymous", user: null, sessionExpired: Boolean(action.expired) };
    default:
      return state;
  }
}

/** Sesión del cajero: el JWT vive en SecureStore y se valida contra /auth/me al abrir la app. */
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const signOut = useCallback(async ({ expired = false } = {}) => {
    await clearSession();
    dispatch({ type: "signedOut", expired });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => signOut({ expired: true }));
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  useEffect(() => {
    let active = true;
    (async () => {
      const session = await loadSession();
      if (!session?.token) {
        if (active) dispatch({ type: "restored", user: null });
        return;
      }
      try {
        await authService.verifySession();
        if (active) dispatch({ type: "restored", user: { email: session.email } });
      } catch (error) {
        // Sin red no cerramos la sesión: el cajero puede seguir cuando vuelva la conexión.
        if (error?.status === 401 || error?.status === 403) {
          await clearSession();
          if (active) dispatch({ type: "signedOut", expired: true });
        } else if (active) {
          dispatch({ type: "restored", user: { email: session.email } });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async credentials => {
    const session = await authService.login(credentials);
    await saveSession(session);
    dispatch({ type: "signedIn", user: { email: session.email } });
  }, []);

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
