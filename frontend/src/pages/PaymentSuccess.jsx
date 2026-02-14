import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading, success, error
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [attempts, setAttempts] = useState(0);
  
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    pollPaymentStatus();
  }, [sessionId]);

  const pollPaymentStatus = async () => {
    const maxAttempts = 10;
    const pollInterval = 2000; // 2 seconds

    if (attempts >= maxAttempts) {
      setStatus("error");
      toast.error("Tiempo de espera agotado. Por favor, contacta con soporte.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API}/plan/checkout/status/${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data;

      if (data.payment_status === "paid") {
        setStatus("success");
        setPaymentInfo(data);
        toast.success("¡Pago procesado correctamente!");
        return;
      } else if (data.status === "expired") {
        setStatus("error");
        toast.error("La sesión de pago ha expirado");
        return;
      }

      // Continue polling
      setAttempts(prev => prev + 1);
      setTimeout(pollPaymentStatus, pollInterval);
    } catch (error) {
      console.error("Error checking payment status:", error);
      setAttempts(prev => prev + 1);
      setTimeout(pollPaymentStatus, pollInterval);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardContent className="pt-8 pb-8 text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Procesando tu pago
              </h2>
              <p className="text-slate-600 mb-4">
                Por favor, espera mientras verificamos tu pago con Stripe...
              </p>
              <div className="flex justify-center gap-1 mt-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                ¡Pago exitoso!
              </h2>
              <p className="text-slate-600 mb-4">
                Tu plan <strong>{paymentInfo?.plan_name}</strong> ha sido activado correctamente.
              </p>
              <div className="bg-emerald-500/10 border border-emerald-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-emerald-700">
                  Tu suscripción está activa por 1 año. Recibirás un email con los detalles de tu factura.
                </p>
              </div>
              <Button 
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => navigate("/")}
              >
                Ir al Dashboard
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Error al procesar el pago
              </h2>
              <p className="text-slate-600 mb-4">
                No pudimos verificar tu pago. Si crees que esto es un error, 
                por favor contacta con nuestro equipo de soporte.
              </p>
              <div className="space-y-3">
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/seleccionar-plan")}
                >
                  Volver a intentar
                </Button>
                <Button 
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate("/")}
                >
                  Ir al Dashboard
                </Button>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                <a href="mailto:soporte@alpineflow.es" className="text-blue-600 hover:underline">
                  Contactar soporte
                </a>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
