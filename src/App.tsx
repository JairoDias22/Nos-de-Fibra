import { Route, Routes } from "react-router-dom";
import { configurado } from "./lib/supabase";
import ConfigFaltando from "./components/ConfigFaltando";
import Layout from "./components/Layout";
import RotaProtegida from "./components/RotaProtegida";
import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import Vender from "./pages/Vender";
import Estoque from "./pages/Estoque";
import Dinheiro from "./pages/Dinheiro";
import Resumo from "./pages/Resumo";

export default function App() {
  if (!configurado) return <ConfigFaltando />;

  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<RotaProtegida />}>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="vender" element={<Vender />} />
          <Route path="estoque" element={<Estoque />} />
          <Route path="dinheiro" element={<Dinheiro />} />
          <Route path="resumo" element={<Resumo />} />
        </Route>
      </Route>
    </Routes>
  );
}
