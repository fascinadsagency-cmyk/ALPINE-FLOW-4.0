import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    storeName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validations
    if (formData.password !== formData.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        store_name: formData.storeName,
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      toast.success("¡Cuenta creada exitosamente!");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear la cuenta");
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Back button */}
      <div className="p-4 absolute top-0 left-0 z-50">
        <Button 
          variant="ghost" 
          onClick={() => {
            console.log('Navigating to landing...');
            navigate("/landing");
          }}
          className="gap-2 text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Button>
      </div>
      
      <div className="flex-1 flex">
        {/* Left - Degradado con copy y features */}
        <div 
          className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #ec4899 100%)'
          }}
        >
          <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full pt-24">
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
                Crear Cuenta Gratis
              </CardTitle>
              <CardDescription>
                Empieza tu prueba gratis de 15 días. Sin tarjeta de crédito.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Nombre de tu Tienda *</Label>
                  <Input
                    id="storeName"
                    name="storeName"
                    type="text"
                    placeholder="Ej: Ski Rental Madrid"
                    value={formData.storeName}
                    onChange={handleChange}
                    className="h-11"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Usuario *</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Tu nombre de usuario"
                    value={formData.username}
                    onChange={handleChange}
                    className="h-11"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="h-11"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={handleChange}
                    className="h-11"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Repite tu contraseña"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="h-11"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 font-semibold bg-black hover:bg-black/90 text-white" 
                  disabled={loading}
                >
                  {loading ? "Creando cuenta..." : "Crear Cuenta Gratis"}
                </Button>

                <p className="text-sm text-center text-slate-600">
                  ¿Ya tienes cuenta?{" "}
                  <Link to="/login" className="text-black hover:underline font-medium">
                    Iniciar Sesión
                  </Link>
                </p>

                <p className="text-xs text-center text-slate-500 mt-4">
                  Al crear una cuenta, aceptas nuestros{" "}
                  <a href="#" className="text-black hover:underline">Términos de Servicio</a>
                  {" "}y{" "}
                  <a href="#" className="text-black hover:underline">Política de Privacidad</a>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
