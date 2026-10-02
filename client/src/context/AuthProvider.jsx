import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import { api } from "@/lib/api";

// Keeps the logged-in user + access token for the whole app (useAuth()).
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("accessToken"));
  const [loading, setLoading] = useState(true); // true until the first session check ends

  // Store (or clear, when called with no arguments) the session in state + localStorage.
  const setSession = useCallback((nextUser = null, token = null) => {
    setUser(nextUser);
    setAccessToken(token);
    if (token) localStorage.setItem("accessToken", token);
    else localStorage.removeItem("accessToken");
  }, []);

  // On first load, restore the session:
  //  1) try the refresh cookie, 2) fall back to the saved access token.
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await api("/auth/refresh", { method: "POST" });
        if (!data?.accessToken || !data?.user) throw new Error("Invalid refresh response");
        if (mounted) setSession(data.user, data.accessToken);
      } catch {
        const saved = localStorage.getItem("accessToken");
        try {
          if (!saved) throw new Error("No saved token");
          const me = await api("/auth/me", { accessToken: saved });
          const restored = me?.user || me;
          if (!restored) throw new Error("Unable to restore user");
          if (mounted) setSession(restored, saved);
        } catch {
          if (mounted) setSession(); // not logged in
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [setSession]);

  // Called by the login/register pages after a successful response.
  const login = useCallback(
    (userData, token) => (userData && token ? setSession(userData, token) : setSession()),
    [setSession]
  );

  // Tell the server to revoke the refresh token, but clear local state either way.
  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // ignore: we still clear the local session below
    }
    setSession();
  }, [setSession]);

  const deleteAccount = useCallback(
    async (password) => {
      if (!accessToken) throw new Error("You are not authenticated.");
      await api("/auth/me", { method: "DELETE", accessToken, body: { password } });
      setSession();
    },
    [accessToken, setSession]
  );

  // Merge profile edits into the user without refetching.
  const updateUser = useCallback((partial) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, accessToken, loading, login, logout, deleteAccount, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
