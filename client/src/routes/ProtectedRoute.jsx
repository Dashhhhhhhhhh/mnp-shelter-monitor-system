import { Navigate } from "react-router-dom";
import useAuth from "../features/auth/hooks/useAuth";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/staff/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
