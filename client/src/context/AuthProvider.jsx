import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import { api } from "@/lib/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem("accessToken") || null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        // 1) Refresh cookie (cross-site: needs SameSite=None + Secure on backend)
        const data = await api("/auth/refresh", { method: "POST" });

        if (!mounted) return;

        if (!data?.accessToken || !data?.user) {
          throw new Error("Invalid refresh response");
        }

        setUser(data.user);
        setAccessToken(data.accessToken);
        localStorage.setItem("accessToken", data.accessToken);
      } catch {
        // 2) Fallback: stored access token
        const savedToken = localStorage.getItem("accessToken");

        if (!savedToken) {
          if (mounted) {
            setUser(null);
            setAccessToken(null);
          }
          return;
        }

        try {
          const currentUser = await api("/auth/me", {
            accessToken: savedToken,
          });

          if (!mounted) return;

          const restoredUser = currentUser?.user || currentUser;

          if (!restoredUser) {
            throw new Error("Unable to restore user");
          }

          setUser(restoredUser);
          setAccessToken(savedToken);
        } catch {
          localStorage.removeItem("accessToken");
          if (mounted) {
            setUser(null);
            setAccessToken(null);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback((userData, token) => {
    if (!userData || !token) {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem("accessToken");
      return;
    }
    setUser(userData);
    setAccessToken(token);
    localStorage.setItem("accessToken", token);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // still clear local session
    } finally {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem("accessToken");
    }
  }, []);

  const deleteAccount = useCallback(
    async (password) => {
      if (!accessToken) {
        throw new Error("You are not authenticated.");
      }

      await api("/auth/me", {
        method: "DELETE",
        accessToken,
        body: { password },
      });

      setUser(null);
      setAccessToken(null);
      localStorage.removeItem("accessToken");
    },
    [accessToken]
  );

  const updateUser = useCallback((partial) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        logout,
        deleteAccount,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
