import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PaywallOverlay({ children }) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkTrialStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API}/plan/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const { is_trial, trial_expired } = response.data;
        setIsBlocked(is_trial && trial_expired);
      } catch (error) {
        console.error("Error checking trial status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkTrialStatus();

    // Re-check every minute
    const interval = setInterval(checkTrialStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return children;
  }

  if (isBlocked) {
    return (
      <div className="relative min-h-screen">
        {/* Blurred background with content */}
        <div className="blur-sm pointer-events-none">
          {children}
        </div>

        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          data-testid="paywall-overlay"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <Lock className="h-8 w-8 text-red-600" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Tu período de prueba ha terminado
            </h2>

            {/* Description */}
            <p className="text-slate-600 mb-6">
              Han pasado 15 días desde que empezaste a usar AlpineFlow. 
              Para continuar gestionando tu tienda de alquiler, selecciona un plan de pago.
            </p>

            {/* Alert */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 text-left">
                  <strong>Tus datos están seguros.</strong> No perderás ninguna información. 
                  Una vez que actives un plan, podrás continuar exactamente donde lo dejaste.
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <Button 
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => navigate("/seleccionar-plan")}
            >
              Ver Planes y Precios
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>

            {/* Support link */}
            <p className="mt-4 text-sm text-slate-500">
              ¿Necesitas ayuda? {" "}
              <a href="mailto:soporte@alpineflow.es" className="text-blue-600 hover:underline">
                Contacta con soporte
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
