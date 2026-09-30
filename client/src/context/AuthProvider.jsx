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
        // 1) Prefer refresh-token cookie (httpOnly)
        const data = await api("/auth/refresh", {
          method: "POST",
        });

        if (!mounted) return;

        if (!data?.accessToken || !data?.user) {
          throw new Error("Invalid refresh response");
        }

        setUser(data.user);
        setAccessToken(data.accessToken);
        localStorage.setItem("accessToken", data.accessToken);
      } catch {
        // 2) Fallback: access token in localStorage
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

          // Backend may return { user } or the user object directly
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
        if (mounted) {
          setLoading(false);
        }
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
      await api("/auth/logout", {
        method: "POST",
      });
    } catch {
      // Still clear local session if the request fails
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

  /** Merge fields into the current user (e.g. after profile update). */
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
