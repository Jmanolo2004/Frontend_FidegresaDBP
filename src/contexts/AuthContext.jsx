import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { authService } from "../services/authService";
import { onSessionExpired } from "../api/apiClient";
import { tokenStorage } from "../api/tokenStorage";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (tokenStorage.getAccessToken() ? "checking" : "anonymous"));
  const [expired, setExpired] = useState(false);

  const startSession = useCallback(async session => {
    tokenStorage.set(session);
    const profile = await authService.getCurrentUser();
    setUser(profile);
    setExpired(false);
    setStatus("authenticated");
    return profile;
  }, []);

  useEffect(() => {
    if (!tokenStorage.getAccessToken()) return undefined;
    const controller = new AbortController();
    authService
      .getCurrentUser({ signal: controller.signal })
      .then(profile => {
        setUser(profile);
        setStatus("authenticated");
      })
      .catch(error => {
        if (error?.code === "CANCELED") return;
        tokenStorage.clear();
        setStatus("anonymous");
      });
    return () => controller.abort();
  }, []);

  useEffect(
    () =>
      onSessionExpired(() => {
        setUser(null);
        setExpired(true);
        setStatus("anonymous");
      }),
    []
  );

  const login = useCallback(async credentials => startSession(await authService.login(credentials)), [startSession]);
  const register = useCallback(async payload => startSession(await authService.register(payload)), [startSession]);
  const loginWithProvider = useCallback(async provider => startSession(await authService.loginWithProvider(provider)), [startSession]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Aunque el servidor no responda, la sesión local se cierra igual.
    }
    tokenStorage.clear();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const updateUser = useCallback(changes => setUser(previous => (previous ? { ...previous, ...changes } : previous)), []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      sessionExpired: expired,
      login,
      register,
      loginWithProvider,
      logout,
      updateUser
    }),
    [user, status, expired, login, register, loginWithProvider, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = { children: PropTypes.node.isRequired };
