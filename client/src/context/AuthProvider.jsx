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
    let mounted = true;

    const restoreSession = async () => {
      try {
        /*
         * First try the refresh-token cookie.
         *
         * The refresh endpoint should return:
         * {
         *   user,
         *   accessToken
         * }
         */
        const data = await api("/auth/refresh", {
          method: "POST",
        });

        if (!mounted) return;

        if (!data?.accessToken || !data?.user) {
          throw new Error("Invalid refresh response");
        }

        setUser(data.user);
        setAccessToken(data.accessToken);

        localStorage.setItem(
          "accessToken",
          data.accessToken
        );
      } catch {
        /*
         * Refresh cookie failed.
         *
         * Try the access token stored in localStorage.
         */
        const savedToken =
          localStorage.getItem("accessToken");

        if (!savedToken) {
          if (mounted) {
            setUser(null);
            setAccessToken(null);
          }

          return;
        }

        try {
          /*
           * Validate the saved access token and
           * retrieve the current user.
           */
          const currentUser = await api("/auth/me", {
            accessToken: savedToken,
          });

          if (!mounted) return;

          /*
           * Depending on your backend, /auth/me may return:
           *
           * user
           *
           * or
           *
           * { user }
           */
          const restoredUser =
            currentUser?.user || currentUser;

          if (!restoredUser) {
            throw new Error(
              "Unable to restore user"
            );
          }

          setUser(restoredUser);
          setAccessToken(savedToken);
        } catch {
          /*
           * Token is invalid/expired.
           */
          localStorage.removeItem(
            "accessToken"
          );

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

  const login = (userData, token) => {
    setUser(userData);
    setAccessToken(token);

    if (token) {
      localStorage.setItem(
        "accessToken",
        token
      );
    } else {
      localStorage.removeItem(
        "accessToken"
      );
    }
  };

  const logout = async () => {
    try {
      await api("/auth/logout", {
        method: "POST",
      });
    } catch {
      // Logout should still clear local state
      // even if the server request fails.
    } finally {
      setUser(null);
      setAccessToken(null);

      localStorage.removeItem(
        "accessToken"
      );
    }
  };

  const deleteAccount = async (password) => {
    if (!accessToken) {
      throw new Error(
        "You are not authenticated."
      );
    }

    await api("/auth/me", {
      method: "DELETE",
      accessToken,
      body: {
        password,
      },
    });

    setUser(null);
    setAccessToken(null);

    localStorage.removeItem(
      "accessToken"
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
