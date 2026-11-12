
import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute() {
  const token = localStorage.getItem("fittrack_token");

  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
