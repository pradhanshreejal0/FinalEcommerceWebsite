import { useState, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import { api } from "@/lib/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem("accessToken") || null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        // First try with cookie
        const data = await api("/auth/refresh", { method: "POST" });
        setUser(data.user);
        setAccessToken(data.accessToken);
        localStorage.setItem("accessToken", data.accessToken);
      } catch {
        // Cookie failed → try localStorage token (if exists)
        const savedToken = localStorage.getItem("accessToken");
        if (savedToken) {
          try {
            // Optional: you can call /auth/me here later
            setAccessToken(savedToken);
          } catch {
            localStorage.removeItem("accessToken");
            setAccessToken(null);
            setUser(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    setAccessToken(token);
    localStorage.setItem("accessToken", token);
  };

  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem("accessToken");
    }
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}