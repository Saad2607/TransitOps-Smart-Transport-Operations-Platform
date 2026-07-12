import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'transitops_token';
const USER_KEY = 'transitops_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const persistSession = useCallback((sessionToken, sessionUser) => {
    setToken(sessionToken);
    setUser(sessionUser);
    localStorage.setItem(TOKEN_KEY, sessionToken);
    localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const response = await authApi.login({ email, password });
      persistSession(response.data.token, response.data.user);
      return response.data.user;
    },
    [persistSession]
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    const response = await authApi.getMe();
    setUser(response.data);
    localStorage.setItem(USER_KEY, JSON.stringify(response.data));
    return response.data;
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    refreshProfile()
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, [token, refreshProfile, clearSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      refreshProfile,
      hasRole: (...roles) => roles.includes(user?.roleName),
    }),
    [user, token, loading, login, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
