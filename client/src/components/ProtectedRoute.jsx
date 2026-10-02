import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// Wraps pages that need a login. `allowedRoles` (e.g. ["admin"]) limits who may enter:
// not logged in -> /login, wrong role -> home page.
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}
