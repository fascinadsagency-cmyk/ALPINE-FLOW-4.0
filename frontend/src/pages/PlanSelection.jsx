import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, Crown, Rocket, Building2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PlanSelection() {
  const [plans, setPlans] = useState([]);
  const [planStatus, setPlanStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const [plansRes, statusRes] = await Promise.all([
          axios.get(`${API}/plan/available`),
          axios.get(`${API}/plan/status`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setPlans(plansRes.data.plans);
        setPlanStatus(statusRes.data);
      } catch (error) {
        console.error("Error fetching plans:", error);
        toast.error("Error al cargar los planes");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleSelectPlan = async (planId) => {
    setSelecting(planId);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      
      // Create Stripe checkout session
      const response = await axios.post(
        `${API}/plan/checkout`,
        { 
          plan_type: planId,
          origin_url: window.location.origin
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Redirect to Stripe Checkout
      if (response.data.checkout_url) {
        toast.info("Redirigiendo a la pasarela de pago...");
        window.location.href = response.data.checkout_url;
      } else {
        throw new Error("No se recibió URL de checkout");
      }
    } catch (err) {
      const errorData = err.response?.data?.detail;
      if (typeof errorData === "object" && errorData.errors) {
        setError({
          message: errorData.message,
          errors: errorData.errors,
          suggestion: errorData.suggestion
        });
      } else {
        setError({ message: errorData || "Error al procesar el pago" });
      }
      toast.error("No se pudo procesar el pago");
      setSelecting(null);
    }
  };

  // Alternative: Direct activation for testing (bypasses Stripe)
  const handleDirectActivation = async (planId) => {
    setSelecting(planId);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/plan/simulate-payment`,
        { plan_type: planId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`¡Plan ${planId.toUpperCase()} activado correctamente!`);
      
      // Refresh plan status
      const statusRes = await axios.get(`${API}/plan/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlanStatus(statusRes.data);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      const errorData = err.response?.data?.detail;
      if (typeof errorData === "object" && errorData.errors) {
        setError({
          message: errorData.message,
          errors: errorData.errors,
          suggestion: errorData.suggestion
        });
      } else {
        setError({ message: errorData || "Error al activar el plan" });
      }
      toast.error("No se pudo activar el plan");
    } finally {
      setSelecting(null);
    }
  };

  const getPlanIcon = (planId) => {
    switch (planId) {
      case "basic":
        return <Rocket className="h-8 w-8 text-white" />;
      case "pro":
        return <Crown className="h-8 w-8 text-white" />;
      case "enterprise":
        return <Building2 className="h-8 w-8 text-white" />;
      default:
        return null;
    }
  };

  const getPlanColor = (planId) => {
    switch (planId) {
      case "basic":
        return "border-blue-200 hover:border-blue-400";
      case "pro":
        return "border-purple-200 hover:border-purple-400 ring-2 ring-purple-100";
      case "enterprise":
        return "border-amber-200 hover:border-amber-400";
      default:
        return "";
    }
  };

  const getPlanButtonColor = (planId) => {
    switch (planId) {
      case "basic":
        return "bg-blue-600 hover:bg-blue-700";
      case "pro":
        return "bg-purple-600 hover:bg-purple-700";
      case "enterprise":
        return "bg-amber-600 hover:bg-amber-700";
      default:
        return "";
    }
  };

  const formatLimit = (value) => {
    if (value === -1) return "Ilimitado";
    return value.toLocaleString("es-ES");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Cargando planes...</p>
        </div>
      </div>
    );
  }

  const isTrialExpired = planStatus?.is_trial && planStatus?.trial_expired;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #ec4899 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <img src="/logo-white.png" alt="SkiFlow Rental" className="h-16 w-auto object-contain mx-auto mb-8" />
          <h1 className="text-5xl sm:text-6xl font-black text-white mb-6 leading-tight tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            {isTrialExpired 
              ? "Tu período de prueba ha terminado" 
              : "Planes que escalan con tu inventario"}
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto font-medium">
            {isTrialExpired
              ? "Selecciona un plan para continuar usando SkiFlow Rental"
              : "Sin letras pequeñas. Todos los planes incluyen TODAS las funciones."}
          </p>
        </div>

        {/* Current Usage Alert */}
        {planStatus && (
          <div className="mb-8 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <h3 className="font-bold text-white mb-4 text-lg text-center uppercase">Tu uso actual:</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-black text-white">{planStatus.current_items.toLocaleString()}</p>
                <p className="text-sm text-white/70">Artículos</p>
              </div>
              <div>
                <p className="text-3xl font-black text-white">{planStatus.current_customers.toLocaleString()}</p>
                <p className="text-sm text-white/70">Clientes</p>
              </div>
              <div>
                <p className="text-3xl font-black text-white">{planStatus.current_users}</p>
                <p className="text-sm text-white/70">Usuarios</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-8 p-6 bg-red-500/20 backdrop-blur-md rounded-2xl border border-red-500/50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
              <div className="text-white">
                <strong className="block mb-2">{error.message}</strong>
                {error.errors && (
                  <ul className="list-disc list-inside space-y-1">
                    {error.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
                {error.suggestion && (
                  <p className="mt-2 text-sm text-white/80">{error.suggestion}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isCurrentPlan = planStatus?.plan_type === plan.id;
            const exceedsItems = plan.max_items !== -1 && planStatus?.current_items > plan.max_items;
            const exceedsCustomers = plan.max_customers !== -1 && planStatus?.current_customers > plan.max_customers;
            const canSelect = !exceedsItems && !exceedsCustomers;
            const isPro = plan.id === "pro";

            return (
              <div key={plan.id} className="relative">
                {/* Badge para plan recomendado o actual */}
                {plan.recommended && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-white text-black font-bold px-4 py-1">POPULAR</Badge>
                  </div>
                )}
                
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4 z-10">
                    <Badge className="bg-emerald-500/100/100 text-white font-bold px-4 py-1">Plan Actual</Badge>
                  </div>
                )}

                {/* Card con estilo landing */}
                <div className={`relative rounded-2xl overflow-hidden transition-all duration-300 h-full ${
                  isPro ? 'transform scale-105' : ''
                }`}>
                  {/* Fondo según plan */}
                  <div className={`absolute inset-0 ${
                    isPro ? 'bg-gradient-to-br from-black via-slate-900 to-black' : 'bg-white'
                  }`}></div>
                  
                  {/* Contenido */}
                  <div className={`relative p-8 h-full flex flex-col ${
                    isPro ? 'border-4 border-purple-500/50' : 'border-2 border-slate-200'
                  }`}>
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg ${
                        isPro ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-black'
                      }`}>
                        {getPlanIcon(plan.id) || <Rocket className="h-6 w-6 text-white" />}
                      </div>
                      <div>
                        <h3 className={`text-xl font-bold ${isPro ? 'text-white' : 'text-black'}`}>
                          {plan.name}
                        </h3>
                        <p className={`text-xs ${isPro ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isPro ? 'Más vendido' : 'Para empezar'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Precio */}
                    <div className="mb-8">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-5xl font-black ${isPro ? 'text-white' : 'text-black'}`}>
                          {plan.price} €
                        </span>
                      </div>
                      <p className={`text-sm mt-2 font-medium ${isPro ? 'text-slate-400' : 'text-slate-600'}`}>
                        Pago anual
                      </p>
                    </div>

                    {/* Botón */}
                    <Button
                      className={`w-full mb-8 font-bold rounded-full py-6 ${
                        isPro 
                          ? 'bg-white text-black hover:bg-slate-100' 
                          : 'bg-black text-white hover:bg-black/90'
                      }`}
                      disabled={isCurrentPlan || selecting === plan.id || !canSelect}
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      {selecting === plan.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Procesando...
                        </>
                      ) : isCurrentPlan ? (
                        "PLAN ACTUAL"
                      ) : !canSelect ? (
                        "SUPERA TUS DATOS"
                      ) : (
                        isPro ? "CONTRATAR AHORA" : "CONTRATAR"
                      )}
                    </Button>

                    {/* Features */}
                    <div className="space-y-4 flex-grow">
                      <div className={`flex items-start gap-3 text-sm ${
                        exceedsItems ? 'opacity-50' : ''
                      }`}>
                        {exceedsItems ? (
                          <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isPro ? 'text-white' : 'text-black'}`} />
                        )}
                        <span className={`font-medium ${isPro ? 'text-white' : 'text-slate-700'}`}>
                          {formatLimit(plan.max_items)} artículos
                        </span>
                      </div>
                      
                      <div className={`flex items-start gap-3 text-sm ${
                        exceedsCustomers ? 'opacity-50' : ''
                      }`}>
                        {exceedsCustomers ? (
                          <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isPro ? 'text-white' : 'text-black'}`} />
                        )}
                        <span className={`font-medium ${isPro ? 'text-white' : 'text-slate-700'}`}>
                          {formatLimit(plan.max_customers)} clientes
                        </span>
                      </div>
                      
                      <div className="flex items-start gap-3 text-sm">
                        <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isPro ? 'text-white' : 'text-black'}`} />
                        <span className={`font-medium ${isPro ? 'text-white' : 'text-slate-700'}`}>
                          Hasta {plan.max_users} usuarios
                        </span>
                      </div>
                      
                      <div className="flex items-start gap-3 text-sm">
                        <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isPro ? 'text-white' : 'text-black'}`} />
                        <span className={`font-medium ${isPro ? 'text-white' : 'text-slate-700'}`}>
                          Todas las funciones
                        </span>
                      </div>
                      
                      <div className="flex items-start gap-3 text-sm">
                        <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isPro ? 'text-white' : 'text-black'}`} />
                        <span className={`font-medium ${isPro ? 'text-white' : 'text-slate-700'}`}>
                          Soporte incluido
                        </span>
                      </div>
                      
                      <div className="flex items-start gap-3 text-sm">
                        <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isPro ? 'text-white' : 'text-black'}`} />
                        <span className={`font-medium ${isPro ? 'text-white' : 'text-slate-700'}`}>
                          Modo Offline
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-white/80 text-lg">¿Tienes dudas? Contacta con nuestro equipo de soporte</p>
          <a href="mailto:hola@skiflowrental.com" className="text-white hover:underline font-semibold mt-2 inline-block">
            hola@skiflowrental.com
          </a>
        </div>
      </div>
    </div>
  );
}
