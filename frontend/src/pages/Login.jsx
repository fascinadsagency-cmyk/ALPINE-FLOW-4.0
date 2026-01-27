import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mountain, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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

    setLoading(true);
    try {
      if (isRegister) {
        await register(username, password);
        toast.success("Cuenta creada correctamente");
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
    <div className="min-h-screen flex">
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
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Tu nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11"
                  data-testid="username-input"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  data-testid="password-input"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 font-semibold"
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isRegister ? "Crear cuenta" : "Iniciar sesión"}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-sm text-primary hover:underline"
                data-testid="toggle-auth-mode"
              >
                {isRegister 
                  ? "¿Ya tienes cuenta? Inicia sesión" 
                  : "¿No tienes cuenta? Regístrate"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
