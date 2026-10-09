import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function RotaProtegida() {
  const { session, carregando } = useAuth();

  if (carregando) {
    return <div className="p-10 text-center text-xl font-bold">Carregando...</div>;
  }
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}
