import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mountain, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    if (isRegister && password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(username, password, storeName || null);
        toast.success("¡Cuenta creada! Bienvenido a tu período de prueba de 15 días.");
      } else {
        await login(username, password);
        toast.success("Bienvenido a SkiFlow Rental");
      }
      navigate("/");
    } catch (error) {
      const message = error.response?.data?.detail || "Error de autenticación";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Back button */}
      <div className="p-4 absolute top-0 left-0 z-10">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/landing")}
          className="gap-2 text-white hover:bg-white/10 lg:text-slate-700 lg:hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Button>
      </div>
      
      <div className="flex-1 flex">
        {/* Left - Gradient con Logo */}
        <div 
          className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #ec4899 100%)'
          }}
        >
          <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
            {/* Logo y título arriba */}
            <div>
              <img src="/logo-white.png" alt="SkiFlow Rental" className="h-16 w-auto object-contain mb-8" />
              <h1 className="text-5xl font-black mb-4 leading-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                Despacha en<br/>
                <span className="italic">segundos</span>,<br/>
                no en minutos.
              </h1>
              <p className="text-xl text-white/90 leading-relaxed max-w-md">
                El software de alquiler que elimina las colas y recupera el control de tu stock en tiempo real.
              </p>
            </div>
            
            {/* Features abajo */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/90">15 días de prueba gratis</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/90">Sin tarjeta de crédito</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/90">Cancela cuando quieras</span>
              </div>
            </div>
          </div>
        </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4 lg:hidden">
              <img src="/logo.png" alt="SkiFlow Rental" className="h-12 w-auto object-contain" />
            </div>
            <CardTitle className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              {isRegister ? "Crear cuenta" : "Iniciar sesión"}
            </CardTitle>
            <CardDescription>
              {isRegister 
                ? "Crea tu cuenta para acceder al sistema" 
                : "Ingresa tus credenciales para continuar"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{isRegister ? "Email" : "Usuario"}</Label>
                <Input
                  id="username"
                  type={isRegister ? "email" : "text"}
                  placeholder={isRegister ? "tu@email.com" : "Tu nombre de usuario"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11"
                  data-testid="username-input"
                  tabIndex={1}
                  autoFocus
                />
              </div>
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="storeName">Nombre de tu tienda (opcional)</Label>
                  <Input
                    id="storeName"
                    type="text"
                    placeholder="Ej: Ski Rental Madrid"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="h-11"
                    tabIndex={2}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={isRegister ? "Mínimo 6 caracteres" : "Tu contraseña"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  data-testid="password-input"
                  tabIndex={3}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 font-semibold bg-black hover:bg-black/90 text-white"
                disabled={loading}
                data-testid="login-submit-btn"
                tabIndex={4}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isRegister ? "Crear cuenta" : "Iniciar sesión"}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <Link
                to="/register"
                className="text-sm text-primary hover:underline"
                data-testid="toggle-auth-mode"
              >
                ¿No tienes cuenta? Regístrate gratis
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}
