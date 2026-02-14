import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Zap,
  Sparkles,
  Crown,
  Check,
  ArrowRight,
  Clock,
  Users,
  BarChart3,
  Shield,
  Database,
  TrendingUp,
  ChevronDown
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

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

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
      answer: "Sí. Nuestro sistema es \"Plug & Play\". Conecta tus lectores de códigos e impresoras térmicas USB y empieza a trabajar sin necesidad de instalar drivers complejos."
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
      {/* Sticky Navbar - Con Degradado */}
      <nav className="sticky top-0 z-50 border-b border-purple-500/20" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #ec4899 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center">
              <img src="/logo-white.png" alt="SkiFlow Rental" className="h-10 w-auto object-contain" />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => navigate("/login")}
                className="text-white/90 hover:text-white font-semibold text-base transition-colors"
              >
                Iniciar Sesión
              </button>
              <Button 
                onClick={() => navigate("/register")}
                className="bg-black hover:bg-black/90 text-white font-bold px-8 py-3 rounded-full transition-all shadow-lg"
              >
                Crear Cuenta Gratis
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Estilo April Ford */}
      <section className="min-h-[90vh] flex items-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #ec4899 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-6xl">
            {/* Título Principal */}
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-white mb-8 leading-[0.95] tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Despacha a tus clientes en <span className="italic">segundos</span>, no en minutos.
            </h1>
            
            <p className="text-xl sm:text-2xl text-white/90 mb-12 max-w-3xl font-medium leading-relaxed">
              El software de alquiler que elimina las colas y recupera el control de tu stock en tiempo real. Rápido, intuitivo y diseñado para la temporada alta.
            </p>
            
            {/* Botones CTA */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button 
                size="lg"
                className="text-base px-10 py-7 bg-white text-black hover:bg-white/90 font-bold rounded-full shadow-2xl hover:shadow-white/30 transition-all"
                onClick={() => navigate("/register")}
              >
                Empezar Prueba Gratis
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="text-base px-10 py-7 bg-transparent border-2 border-white text-white hover:bg-white/10 font-bold rounded-full transition-all"
                onClick={() => navigate("/login")}
              >
                Ver Demo en Vivo
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-white/80">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-white" />
                Sin tarjeta de crédito
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-white" />
                15 días gratis
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-white" />
                Cancela cuando quieras
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 border-t border-slate-200">
        <div className="mb-20">
          <h2 className="text-5xl sm:text-6xl font-black text-black mb-6 leading-tight tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            El motor de tu rentabilidad
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl font-medium">
            Menos clics, más alquileres. Diseñado para el ritmo real de la montaña.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {/* Feature 1 */}
          <div className="group">
            <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center mb-6">
              <Database className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              Gestión de Inventario en Tiempo Real
            </h3>
            <p className="text-slate-600 text-base leading-relaxed">
              Controla cada par de esquís y cada bota con códigos internos. Visualiza estados de disponibilidad al instante para que nunca prometas material que no tienes en el taller.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group">
            <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center mb-6">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              Base de Datos de Clientes 360°
            </h3>
            <p className="text-slate-600 text-base leading-relaxed">
              Acceso total al historial de alquileres y créditos pendientes. Recupera los datos de años anteriores en milisegundos para agilizar la ficha técnica y el ajuste de fijaciones.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group">
            <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center mb-6">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              Packs Inteligentes de Alta Velocidad
            </h3>
            <p className="text-slate-600 text-base leading-relaxed">
              Configura packs de "Material + Casco + Botas". El sistema los detecta automáticamente al escanear, aplicando la tarifa correcta sin que tu staff tenga que calcular nada a mano.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="group">
            <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center mb-6">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              Proceso de Salida "Turbo"
            </h3>
            <p className="text-slate-600 text-base leading-relaxed">
              Crea alquileres en segundos combinando el uso de códigos de barras, packs automáticos y precios dinámicos según la temporada. Cierra el ticket y pasa al siguiente cliente antes de que se forme cola.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="group">
            <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center mb-6">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              Informes y Análisis de Rentabilidad
            </h3>
            <p className="text-slate-600 text-base leading-relaxed">
              Identifica qué ítems son los más alquilados y cuáles se quedan en el estante. Estadísticas completas para tomar decisiones basadas en datos reales, no en intuiciones.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="group">
            <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center mb-6">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              Acceso Multiusuario por Tienda
            </h3>
            <p className="text-slate-600 text-base leading-relaxed">
              Gestiona tu local desde varios ordenadores simultáneamente. Crea perfiles de empleado independientes para que cada miembro del equipo tenga su propio acceso bajo una misma licencia.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-black py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-6xl font-black text-white mb-3">3X</div>
              <div className="text-lg text-slate-400 font-medium">Más rápido que sistemas tradicionales</div>
            </div>
            <div>
              <div className="text-6xl font-black text-white mb-3">100%</div>
              <div className="text-lg text-slate-400 font-medium">Control de tu inventario en tiempo real</div>
            </div>
            <div>
              <div className="text-6xl font-black text-white mb-3">0</div>
              <div className="text-lg text-slate-400 font-medium">Colas en temporada alta</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="mb-20 text-center">
          <h2 className="text-5xl sm:text-6xl font-black text-black mb-6 leading-tight tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Planes que escalan con tu inventario
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium">
            Sin letras pequeñas. Todos los planes incluyen TODAS las funciones.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Trial Plan */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
            <div className="relative bg-white rounded-2xl border-2 border-slate-200 p-8 hover:border-transparent transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center shadow-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black">Trial</h3>
                  <p className="text-xs text-slate-500">Prueba gratuita</p>
                </div>
              </div>
              
              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-black">0 €</span>
                </div>
                <p className="text-sm text-slate-600 mt-2 font-medium">15 días gratis</p>
              </div>

              <Button 
                onClick={() => navigate("/register")} 
                variant="outline" 
                className="w-full mb-8 font-bold border-2 border-black text-black hover:bg-black hover:text-white rounded-full py-6"
              >
                PROBAR GRATIS
              </Button>

              <div className="space-y-4">
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Artículos ilimitados</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Clientes ilimitados</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Usuarios ilimitados</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Todas las funciones</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Soporte incluido</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Modo Offline</span>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Plan */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
            <div className="relative bg-white rounded-2xl border-2 border-slate-200 p-8 hover:border-transparent transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center shadow-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black">Basic</h3>
                  <p className="text-xs text-slate-500">Para empezar</p>
                </div>
              </div>
              
              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-black">950 €</span>
                </div>
                <p className="text-sm text-slate-600 mt-2 font-medium">Pago anual</p>
              </div>

              <Button 
                onClick={() => navigate("/register")} 
                variant="outline" 
                className="w-full mb-8 font-bold border-2 border-black text-black hover:bg-black hover:text-white rounded-full py-6"
              >
                CONTRATAR
              </Button>

              <div className="space-y-4">
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Hasta 1.000 artículos</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Hasta 5.000 clientes</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Hasta 5 usuarios</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Todas las funciones</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Soporte incluido</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Modo Offline</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pro Plan - DESTACADO */}
          <div className="relative group lg:scale-105">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl opacity-100 blur-sm"></div>
            <div className="relative bg-black rounded-2xl p-8 shadow-2xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-white text-black font-black px-4 py-1.5 shadow-lg text-xs uppercase tracking-wider">
                  Popular
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 mb-6 mt-2">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-xl">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Pro</h3>
                  <p className="text-xs text-slate-400">Más vendido</p>
                </div>
              </div>
              
              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">1.450 €</span>
                </div>
                <p className="text-sm text-slate-400 mt-2 font-medium">Pago anual</p>
              </div>

              <Button 
                onClick={() => navigate("/register")} 
                className="w-full mb-8 bg-white text-black hover:bg-slate-100 font-black rounded-full py-6 shadow-lg hover:shadow-xl transition-all"
              >
                CONTRATAR AHORA
              </Button>

              <div className="space-y-4">
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-white font-semibold">Hasta 3.000 artículos</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-white font-semibold">Hasta 40.000 clientes</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-white font-semibold">Hasta 10 usuarios</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-white font-semibold">Todas las funciones</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-white font-semibold">Soporte incluido</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-white font-semibold">Modo Offline</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
            <div className="relative bg-white rounded-2xl border-2 border-slate-200 p-8 hover:border-transparent transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center shadow-lg">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black">Enterprise</h3>
                  <p className="text-xs text-slate-500">Sin límites</p>
                </div>
              </div>
              
              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-black">1.950 €</span>
                </div>
                <p className="text-sm text-slate-600 mt-2 font-medium">Pago anual</p>
              </div>

              <Button 
                onClick={() => navigate("/register")} 
                variant="outline" 
                className="w-full mb-8 font-bold border-2 border-black text-black hover:bg-black hover:text-white rounded-full py-6"
              >
                CONTACTAR
              </Button>

              <div className="space-y-4">
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Artículos ilimitados</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Clientes ilimitados</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Hasta 15 usuarios</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Todas las funciones</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Soporte incluido</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Modo Offline</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl sm:text-6xl font-black text-white mb-6 leading-tight tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            ¿Listo para eliminar las colas de una vez por todas?
          </h2>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
            Únete a los profesionales que ya han recuperado el "Flow" de su negocio con SkiFlow Rental.
          </p>
          <Button 
            size="lg"
            className="bg-white text-black hover:bg-slate-100 text-base px-12 py-7 font-bold rounded-full shadow-2xl hover:shadow-white/20 transition-all"
            onClick={() => navigate("/register")}
          >
            EMPEZAR PRUEBA ILIMITADA GRATIS
          </Button>
        </div>
      </section>

      {/* Footer - MINIMAL */}
      <footer className="bg-white border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Logo */}
            <div className="col-span-2">
              <img src="/logo.png" alt="SkiFlow Rental" className="h-10 w-auto object-contain mb-6" />
              <p className="text-slate-600 max-w-md leading-relaxed">
                Software de gestión de alquiler de equipos de esquí. Rápido, intuitivo y diseñado para la temporada alta.
              </p>
            </div>

            {/* Producto */}
            <div>
              <h3 className="font-bold mb-4 text-black">Producto</h3>
              <ul className="space-y-3 text-slate-600">
                <li><button onClick={() => navigate("/register")} className="hover:text-black transition-colors">Funcionalidades</button></li>
                <li><button onClick={() => navigate("/landing#pricing")} className="hover:text-black transition-colors">Precios</button></li>
                <li><button onClick={() => navigate("/login")} className="hover:text-black transition-colors">Demo</button></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-bold mb-4 text-black">Legal</h3>
              <ul className="space-y-3 text-slate-600">
                <li><a href="#" className="hover:text-black transition-colors">Privacidad</a></li>
                <li><a href="#" className="hover:text-black transition-colors">Términos</a></li>
                <li><a href="#" className="hover:text-black transition-colors">Contacto</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8 text-center text-slate-500 text-sm">
            <p>&copy; 2026 SkiFlow Rental. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
