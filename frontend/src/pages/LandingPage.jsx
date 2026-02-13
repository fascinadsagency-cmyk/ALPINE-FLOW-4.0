import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Users,
  TrendingUp,
  BarChart3,
  Shield,
  Zap,
  Clock,
  DollarSign,
  Check,
  ArrowRight,
  Menu
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Package,
      title: "Gestión de Inventario",
      description: "Control total de tus artículos con códigos internos, estados y disponibilidad en tiempo real."
    },
    {
      icon: Users,
      title: "Gestión de Clientes",
      description: "Base de datos completa de clientes, historial de alquileres y créditos pendientes."
    },
    {
      icon: TrendingUp,
      title: "Packs Inteligentes",
      description: "Crea packs personalizados y el sistema los detectará automáticamente para agilizar el proceso."
    },
    {
      icon: BarChart3,
      title: "Informes y Reportes",
      description: "Análisis de rentabilidad, items más alquilados y estadísticas completas de tu negocio."
    },
    {
      icon: Clock,
      title: "Proceso Rápido",
      description: "Crea alquileres en segundos con códigos de barras, packs automáticos y precios dinámicos."
    },
    {
      icon: Shield,
      title: "Multi-tienda",
      description: "Gestiona múltiples tiendas con datos aislados y estadísticas independientes."
    }
  ];

  const plans = [
    {
      name: "Trial",
      price: "Gratis",
      duration: "15 días",
      description: "Prueba todas las funciones sin compromiso",
      features: [
        "Hasta 10,000 artículos",
        "Hasta 10,000 clientes",
        "Hasta 10 usuarios",
        "Todas las funciones incluidas",
        "Soporte por email"
      ],
      cta: "Empezar prueba gratis",
      highlighted: false
    },
    {
      name: "Basic",
      price: "950€",
      duration: "al año",
      description: "Perfecto para negocios pequeños",
      features: [
        "Hasta 1,000 artículos",
        "Hasta 5,000 clientes",
        "Hasta 5 usuarios",
        "Informes básicos",
        "Soporte por email"
      ],
      cta: "Contratar ahora",
      highlighted: false
    },
    {
      name: "Pro",
      price: "1,450€",
      duration: "al año",
      description: "Para negocios en crecimiento",
      features: [
        "Hasta 3,000 artículos",
        "Hasta 40,000 clientes",
        "Hasta 10 usuarios",
        "Informes avanzados",
        "Soporte prioritario",
        "Integraciones premium"
      ],
      cta: "Contratar ahora",
      highlighted: true
    },
    {
      name: "Enterprise",
      price: "1,950€",
      duration: "al año",
      description: "Sin límites para tu negocio",
      features: [
        "Artículos ilimitados",
        "Clientes ilimitados",
        "Hasta 15 usuarios",
        "API personalizada",
        "Soporte 24/7",
        "Asesor dedicado"
      ],
      cta: "Contactar ventas",
      highlighted: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-slate-900">AlpineFlow</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/login")}
                className="text-slate-700 hover:text-slate-900"
              >
                Iniciar Sesión
              </Button>
              <Button 
                onClick={() => navigate("/register")}
                className="bg-primary hover:bg-primary/90"
              >
                Crear Cuenta Gratis
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              className="md:hidden"
              onClick={() => navigate("/login")}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            Software de Gestión de Alquileres
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Gestiona tu negocio de alquiler
            <span className="text-primary"> como nunca antes</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Sistema completo para gestionar inventario, clientes, alquileres y finanzas. 
            Todo en una plataforma intuitiva y potente.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="text-lg px-8 py-6 bg-primary hover:bg-primary/90"
              onClick={() => navigate("/register")}
            >
              Empezar Prueba Gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => navigate("/login")}
            >
              Ver Demo
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-4">
            ✓ Sin tarjeta de crédito · ✓ 15 días gratis · ✓ Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-white">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-50 text-blue-700 border-blue-200">
            Funcionalidades
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Todo lo que necesitas para tu negocio
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Desde la gestión de inventario hasta reportes avanzados, 
            tenemos todas las herramientas que necesitas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-green-50 text-green-700 border-green-200">
            Precios
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Planes que se adaptan a tu negocio
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Empieza gratis y escala cuando tu negocio crezca. Sin sorpresas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${
                plan.highlighted 
                  ? 'border-2 border-primary shadow-xl scale-105' 
                  : 'border-2'
              }`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                  Más Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  {plan.duration && (
                    <span className="text-slate-600 ml-2">/ {plan.duration}</span>
                  )}
                </div>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className={`w-full mb-6 ${
                    plan.highlighted 
                      ? 'bg-primary hover:bg-primary/90' 
                      : ''
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={() => navigate("/register")}
                >
                  {plan.cta}
                </Button>
                <ul className="space-y-3">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            ¿Listo para transformar tu negocio?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Únete a cientos de negocios que ya confían en AlpineFlow
          </p>
          <Button 
            size="lg"
            className="bg-white text-primary hover:bg-slate-100 text-lg px-8 py-6"
            onClick={() => navigate("/register")}
          >
            Empezar Gratis Ahora
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo & Description */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">AlpineFlow</span>
              </div>
              <p className="text-slate-400 max-w-md">
                Software profesional de gestión de alquileres. 
                Simplifica tu negocio y aumenta tu productividad.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h3 className="font-semibold mb-4">Producto</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white">Funcionalidades</a></li>
                <li><a href="#" className="hover:text-white">Precios</a></li>
                <li><a href="#" className="hover:text-white">Casos de Uso</a></li>
                <li><a href="#" className="hover:text-white">Demo</a></li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white">Privacidad</a></li>
                <li><a href="#" className="hover:text-white">Términos</a></li>
                <li><a href="#" className="hover:text-white">Cookies</a></li>
                <li><a href="#" className="hover:text-white">Contacto</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2026 AlpineFlow. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
