import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Inicio from "./pages/Inicio";
import Vender from "./pages/Vender";
import Estoque from "./pages/Estoque";
import Dinheiro from "./pages/Dinheiro";
import Resumo from "./pages/Resumo";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="vender" element={<Vender />} />
        <Route path="estoque" element={<Estoque />} />
        <Route path="dinheiro" element={<Dinheiro />} />
        <Route path="resumo" element={<Resumo />} />
      </Route>
    </Routes>
  );
}
