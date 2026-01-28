import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import NewRental from "@/pages/NewRental";
import Returns from "@/pages/Returns";
import Customers from "@/pages/Customers";
import Inventory from "@/pages/Inventory";
import Tariffs from "@/pages/Tariffs";
import Reports from "@/pages/Reports";
import Maintenance from "@/pages/Maintenance";
import CashRegister from "@/pages/CashRegister";
import Integrations from "@/pages/Integrations";
import ActiveRentals from "@/pages/ActiveRentals";
import Providers from "@/pages/Providers";
import Layout from "@/components/Layout";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-500">Cargando...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="nuevo-alquiler" element={<NewRental />} />
        <Route path="alquileres-activos" element={<ActiveRentals />} />
        <Route path="devoluciones" element={<Returns />} />
        <Route path="clientes" element={<Customers />} />
        <Route path="inventario" element={<Inventory />} />
        <Route path="tarifas" element={<Tariffs />} />
        <Route path="reportes" element={<Reports />} />
        <Route path="mantenimiento" element={<Maintenance />} />
        <Route path="caja" element={<CashRegister />} />
        <Route path="integraciones" element={<Integrations />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
