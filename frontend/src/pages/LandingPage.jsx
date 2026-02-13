import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
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
  Menu,
  ChevronDown,
  Wifi,
  Database,
  X,
  Sparkles,
  Crown
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Database,
      title: "Gestión de Inventario en Tiempo Real",
      description: "Controla cada par de esquís y cada bota con códigos internos. Visualiza estados de disponibilidad al instante para que nunca prometas material que no tienes en el taller."
    },
    {
      icon: Users,
      title: "Base de Datos de Clientes 360°",
      description: "Acceso total al historial de alquileres y créditos pendientes. Recupera los datos de años anteriores en milisegundos para agilizar la ficha técnica y el ajuste de fijaciones."
    },
    {
      icon: Zap,
      title: "Packs Inteligentes de Alta Velocidad",
      description: "Configura packs de 'Material + Casco + Botas'. El sistema los detecta automáticamente al escanear, aplicando la tarifa correcta sin que tu staff tenga que calcular nada a mano."
    },
    {
      icon: Clock,
      title: "Proceso de Salida 'Turbo'",
      description: "Crea alquileres en segundos combinando el uso de códigos de barras, packs automáticos y precios dinámicos según la temporada. Cierra el ticket y pasa al siguiente cliente antes de que se forme cola."
    },
    {
      icon: BarChart3,
      title: "Informes y Análisis de Rentabilidad",
      description: "Identifica qué ítems son los más alquilados y cuáles se quedan en el estante. Estadísticas completas para tomar decisiones basadas en datos reales, no en intuiciones."
    },
    {
      icon: Shield,
      title: "Acceso Multiusuario por Tienda",
      description: "Gestiona tu local desde varios ordenadores simultáneamente. Crea perfiles de empleado independientes para que cada miembro del equipo tenga su propio acceso bajo una misma licencia."
    }
  ];

  const pricingFeatures = [
    { name: "Artículos", trial: "Ilimitados", basic: "Hasta 1.000", pro: "Hasta 3.000", enterprise: "Ilimitados" },
    { name: "Clientes", trial: "Ilimitados", basic: "Hasta 5.000", pro: "Hasta 40.000", enterprise: "Ilimitados" },
    { name: "Usuarios", trial: "Ilimitados", basic: "Hasta 5", pro: "Hasta 10", enterprise: "Hasta 15" },
    { name: "Todas las funciones", trial: "✓", basic: "✓", pro: "✓", enterprise: "✓" },
    { name: "Soporte Incluido", trial: "✓", basic: "✓", pro: "✓", enterprise: "✓" },
    { name: "Modo Offline", trial: "✓", basic: "✓", pro: "✓", enterprise: "✓" }
  ];

  const faqs = [
    {
      question: "¿Por qué el periodo de prueba es ilimitado?",
      answer: "Queremos que pongas a prueba a SkiFlow Rental al máximo nivel. Durante los 15 días de Trial, no tendrás límites de artículos, clientes ni usuarios. Al finalizar, te asesoraremos para elegir el plan que mejor se adapte al volumen real de datos que has gestionado."
    },
    {
      question: "¿Qué ocurre si necesito subir de plan a mitad de temporada?",
      answer: "Puedes hacer un upgrade de forma instantánea. Solo se te cobrará la diferencia proporcional entre tu plan actual y el nuevo, para que tu inversión sea siempre justa y eficiente."
    },
    {
      question: "¿Qué pasa si me quedo sin internet en la tienda?",
      answer: "SkiFlow Rental incluye un Modo Offline en todos sus planes. Puedes seguir emitiendo tickets y gestionando alquileres sin interrupciones; en cuanto el sistema detecte conexión, los datos se sincronizarán automáticamente."
    },
    {
      question: "¿Realmente funciona con mi hardware actual?",
      answer: "Sí. Nuestro sistema es 'Plug & Play'. Conecta tus lectores de códigos e impresoras térmicas USB y empieza a trabajar sin necesidad de instalar drivers complejos."
    },
    {
      question: "¿El soporte técnico tiene coste extra?",
      answer: "No. En SkiFlow Rental el soporte está incluido en todos los planes anuales. Tu tranquilidad y el correcto funcionamiento de tu tienda son nuestra prioridad."
    },
    {
      question: "¿Mis datos están seguros?",
      answer: "Totalmente. Realizamos copias de seguridad diarias en la nube y utilizamos bases de datos optimizadas para ofrecerte una respuesta en milisegundos, sin importar cuántos miles de clientes tengas."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center">
              <img src="/logo.png" alt="SkiFlow Rental" className="h-10 w-auto object-contain" />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/login")}
                className="text-slate-700 hover:text-slate-900 font-semibold"
              >
                Iniciar Sesión
              </Button>
              <Button 
                onClick={() => navigate("/register")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-xl transition-all font-bold text-white px-6"
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
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight" style={{ fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.02em' }}>
            Despacha a tus clientes
            <span className="block mt-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> en segundos, no en minutos</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            El software de alquiler que elimina las colas y recupera el control de tu stock en tiempo real. 
            Rápido, intuitivo y diseñado para la temporada alta.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="text-lg px-10 py-7 bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-2xl transition-all font-bold rounded-xl"
              onClick={() => navigate("/register")}
            >
              Empezar Prueba Gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="text-lg px-10 py-7 border-2 border-slate-300 hover:border-purple-600 hover:text-purple-600 font-semibold rounded-xl"
              onClick={() => navigate("/login")}
            >
              Ver Demo en Vivo
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-8 font-medium">
            ✓ Sin tarjeta de crédito · ✓ 15 días gratis · ✓ Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center mb-16">
          <Badge className="mb-6 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200 font-semibold text-sm">
            El motor de tu rentabilidad
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.02em' }}>
            Menos clics, más alquileres
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Diseñado para el ritmo real de la montaña
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="card-modern group cursor-pointer">
              <CardHeader>
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-all">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed text-slate-600">
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
          <Badge className="mb-6 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200 font-semibold text-sm">
            Precios
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.02em' }}>
            Planes que escalan con tu inventario
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Sin letras pequeñas. Todos los planes incluyen TODAS las funciones.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {/* Trial Plan */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
            <div className="relative bg-white rounded-2xl border-2 border-slate-200 p-8 hover:border-transparent transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Trial
                  </h3>
                  <p className="text-xs text-slate-500">Prueba gratuita</p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">0 €</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">15 días gratis</p>
              </div>

              <Button 
                onClick={() => navigate("/register")} 
                variant="outline" 
                className="w-full mb-6 font-semibold border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
              >
                Probar Gratis
              </Button>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-emerald-600" />
                  </div>
                  <span className="text-slate-700">50 productos</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-emerald-600" />
                  </div>
                  <span className="text-slate-700">100 clientes</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-emerald-600" />
                  </div>
                  <span className="text-slate-700">1 tienda</span>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Plan */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-600 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
            <div className="relative bg-white rounded-2xl border-2 border-slate-200 p-8 hover:border-transparent transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                    Basic
                  </h3>
                  <p className="text-xs text-slate-500">Para empezar</p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">950 €</span>
                  <span className="text-slate-500">/año</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">79 €/mes facturado anualmente</p>
              </div>

              <Button 
                onClick={() => navigate("/register")} 
                variant="outline" 
                className="w-full mb-6 font-semibold border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                Contratar
              </Button>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-blue-600" />
                  </div>
                  <span className="text-slate-700">200 productos</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-blue-600" />
                  </div>
                  <span className="text-slate-700">500 clientes</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-blue-600" />
                  </div>
                  <span className="text-slate-700">1 tienda</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pro Plan - Popular */}
          <div className="relative group lg:scale-105 lg:-mt-4">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl opacity-75 group-hover:opacity-100 blur transition duration-500"></div>
            <div className="relative bg-white rounded-2xl border-2 border-transparent p-8 shadow-2xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold px-4 py-1.5 shadow-lg">
                  ⭐ Popular
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 mb-4 mt-2">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-xl">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Pro
                  </h3>
                  <p className="text-xs text-slate-500">Más vendido</p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">1.450 €</span>
                  <span className="text-slate-500">/año</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">121 €/mes facturado anualmente</p>
              </div>

              <Button 
                onClick={() => navigate("/register")} 
                className="w-full mb-6 bg-gradient-to-r from-blue-600 to-purple-600 font-bold hover:shadow-2xl hover:scale-105 transition-all"
              >
                Contratar Ahora
              </Button>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-slate-700 font-semibold">500 productos</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-slate-700 font-semibold">2.000 clientes</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-slate-700 font-semibold">3 tiendas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
            <div className="relative bg-white rounded-2xl border-2 border-slate-200 p-8 hover:border-transparent transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Enterprise
                  </h3>
                  <p className="text-xs text-slate-500">Sin límites</p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">1.950 €</span>
                  <span className="text-slate-500">/año</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">163 €/mes facturado anualmente</p>
              </div>

              <Button 
                onClick={() => navigate("/register")} 
                variant="outline" 
                className="w-full mb-6 font-semibold border-2 border-purple-600 text-purple-600 hover:bg-purple-50"
              >
                Contactar
              </Button>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-purple-600" />
                  </div>
                  <span className="text-slate-700">Productos ilimitados</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-purple-600" />
                  </div>
                  <span className="text-slate-700">Clientes ilimitados</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-purple-600" />
                  </div>
                  <span className="text-slate-700">Tiendas ilimitadas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <Badge className="mb-6 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200 font-semibold text-sm">
            FAQ
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.02em' }}>
            Preguntas Frecuentes
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card 
              key={index} 
              className="card-modern cursor-pointer"
              onClick={() => setOpenFaq(openFaq === index ? null : index)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold pr-8">
                  {faq.question}
                </CardTitle>
                <ChevronDown 
                  className={`h-5 w-5 text-slate-400 transition-transform flex-shrink-0 ${
                    openFaq === index ? 'rotate-180' : ''
                  }`} 
                />
              </CardHeader>
              {openFaq === index && (
                <CardContent className="text-slate-600 leading-relaxed text-base">
                  {faq.answer}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            ¿Listo para eliminar las colas de una vez por todas?
          </h2>
          <p className="text-xl text-white/95 mb-10 leading-relaxed">
            Únete a los profesionales que ya han recuperado el "Flow" de su negocio con SkiFlow Rental
          </p>
          <Button 
            size="lg"
            className="bg-white text-blue-600 hover:bg-slate-100 text-lg px-10 py-7 font-bold rounded-xl shadow-2xl hover:shadow-white/20 transition-all"
            onClick={() => navigate("/register")}
          >
            EMPEZAR PRUEBA ILIMITADA GRATIS
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Logo & Description */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-6">
                <img src="/logo.png" alt="SkiFlow Rental" className="h-10 w-auto object-contain" />
              </div>
              <p className="text-slate-400 max-w-md leading-relaxed">
                El software de alquiler que elimina las colas y recupera el control de tu stock en tiempo real. 
                Diseñado para la temporada alta.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h3 className="font-bold mb-4 text-white">Producto</h3>
              <ul className="space-y-3 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Funcionalidades</a></li>
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
            <p>&copy; 2026 SkiFlow Rental. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
