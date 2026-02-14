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
        return <Rocket className="h-8 w-8" />;
      case "pro":
        return <Crown className="h-8 w-8" />;
      case "enterprise":
        return <Building2 className="h-8 w-8" />;
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
              ? "Selecciona un plan para continuar gestionando tu tienda de alquiler de esquí"
              : "Todos los planes incluyen soporte técnico, actualizaciones y acceso completo a la aplicación"}
          </p>
        </div>

        {/* Current Usage Alert */}
        {planStatus && (
          <div className="mb-8 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-2">Tu uso actual:</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-900">{planStatus.current_items.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Artículos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{planStatus.current_customers.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Clientes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{planStatus.current_users}</p>
                <p className="text-sm text-slate-500">Usuarios</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{error.message}</strong>
              {error.errors && (
                <ul className="mt-2 list-disc list-inside">
                  {error.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
              {error.suggestion && (
                <p className="mt-2 text-sm">{error.suggestion}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isCurrentPlan = planStatus?.plan_type === plan.id;
            const exceedsItems = plan.max_items !== -1 && planStatus?.current_items > plan.max_items;
            const exceedsCustomers = plan.max_customers !== -1 && planStatus?.current_customers > plan.max_customers;
            const canSelect = !exceedsItems && !exceedsCustomers;

            return (
              <Card 
                key={plan.id}
                className={`relative transition-all duration-200 ${getPlanColor(plan.id)} ${
                  isCurrentPlan ? "ring-2 ring-green-500" : ""
                }`}
              >
                {plan.recommended && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600">
                    Recomendado
                  </Badge>
                )}
                
                {isCurrentPlan && (
                  <Badge className="absolute -top-3 right-4 bg-green-600">
                    Plan Actual
                  </Badge>
                )}

                <CardHeader className="text-center pb-2">
                  <div className={`mx-auto p-3 rounded-full ${
                    plan.id === "basic" ? "bg-blue-100 text-blue-600" :
                    plan.id === "pro" ? "bg-purple-100 text-purple-600" :
                    "bg-amber-100 text-amber-600"
                  } mb-4`}>
                    {getPlanIcon(plan.id)}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-slate-900">{plan.price}€</span>
                    <span className="text-slate-500">/año</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className={`flex items-center gap-2 ${
                      exceedsItems ? "text-red-600" : "text-slate-700"
                    }`}>
                      {exceedsItems ? (
                        <X className="h-5 w-5 text-red-500" />
                      ) : (
                        <Check className="h-5 w-5 text-green-500" />
                      )}
                      <span>
                        <strong>{formatLimit(plan.max_items)}</strong> artículos
                      </span>
                    </div>
                    
                    <div className={`flex items-center gap-2 ${
                      exceedsCustomers ? "text-red-600" : "text-slate-700"
                    }`}>
                      {exceedsCustomers ? (
                        <X className="h-5 w-5 text-red-500" />
                      ) : (
                        <Check className="h-5 w-5 text-green-500" />
                      )}
                      <span>
                        <strong>{formatLimit(plan.max_customers)}</strong> clientes
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="h-5 w-5 text-green-500" />
                      <span>
                        <strong>{plan.max_users}</strong> usuarios
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="h-5 w-5 text-green-500" />
                      <span>Soporte técnico</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-700">
                      <Check className="h-5 w-5 text-green-500" />
                      <span>Actualizaciones incluidas</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex-col gap-2">
                  <Button
                    className={`w-full ${getPlanButtonColor(plan.id)} text-white`}
                    disabled={isCurrentPlan || selecting === plan.id || !canSelect}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    {selecting === plan.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Procesando...
                      </>
                    ) : isCurrentPlan ? (
                      "Plan Actual"
                    ) : !canSelect ? (
                      "Supera tus datos"
                    ) : (
                      "Seleccionar Plan"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-slate-500 text-sm">
          <p>¿Tienes dudas? Contacta con nuestro equipo de soporte</p>
          <p className="mt-2">
            <a href="mailto:soporte@alpineflow.es" className="text-blue-600 hover:underline">
              soporte@alpineflow.es
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
