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
        toast.success("Bienvenido a AlpineFlow");
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
          className="gap-2 text-white lg:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Button>
      </div>
      
      <div className="flex-1 flex">
        {/* Left - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1630516749888-c65c762118f0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwxfHxzbm93eSUyMG1vdW50YWluJTIwbGFuZHNjYXBlJTIwbWluaW1hbGlzdHxlbnwwfHx8fDE3Njk1NDcyNzV8MA&ixlib=rb-4.1.0&q=85')"
        }}
      >
        <div className="absolute inset-0 bg-slate-900/40" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            AlpineFlow
          </h1>
          <p className="text-lg text-white/80">
            Sistema de gestión de alquiler de equipos de esquí
          </p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
                <Mountain className="h-6 w-6" />
              </div>
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
                className="w-full h-11 font-semibold"
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
