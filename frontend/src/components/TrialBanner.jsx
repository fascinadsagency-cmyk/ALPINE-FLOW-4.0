import { useState, useEffect } from "react";
import { Clock, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TrialBanner() {
  const [planStatus, setPlanStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlanStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axios.get(`${API}/plan/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPlanStatus(response.data);
      } catch (error) {
        console.error("Error fetching plan status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanStatus();
  }, []);

  if (loading || !planStatus || !planStatus.is_trial) {
    return null;
  }

  const { trial_days_remaining, trial_expired } = planStatus;

  if (trial_expired) {
    return (
      <div className="bg-red-500 text-white px-4 py-3 flex items-center justify-between shadow-lg" data-testid="trial-expired-banner">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">
            Tu período de prueba ha expirado. Selecciona un plan para continuar usando SkiFlow Rental.
          </span>
        </div>
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => navigate("/seleccionar-plan")}
          className="bg-white text-red-600 hover:bg-red-50"
        >
          Ver Planes
        </Button>
      </div>
    );
  }

  // Warning style when less than 5 days remaining
  const isUrgent = trial_days_remaining <= 5;

  return (
    <div 
      className={`${isUrgent ? 'bg-amber-500' : 'bg-blue-500'} text-white px-4 py-2 flex items-center justify-between`}
      data-testid="trial-banner"
    >
      <div className="flex items-center gap-3">
        {isUrgent ? (
          <AlertTriangle className="h-5 w-5" />
        ) : (
          <Clock className="h-5 w-5" />
        )}
        <span className="font-medium">
          {isUrgent ? (
            <>¡Solo te quedan <strong>{trial_days_remaining} días</strong> de prueba gratuita!</>
          ) : (
            <>Te quedan <strong>{trial_days_remaining} días</strong> de prueba gratuita</>
          )}
        </span>
      </div>
      <Button 
        variant="secondary" 
        size="sm"
        onClick={() => navigate("/seleccionar-plan")}
        className={`${isUrgent ? 'bg-white text-amber-600 hover:bg-amber-50' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
      >
        <Sparkles className="h-4 w-4 mr-1" />
        Ver Planes
      </Button>
    </div>
  );
}
