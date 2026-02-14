import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
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
  TrendingUp
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
            <div className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => navigate("/login")}
                className="text-white/90 hover:text-white font-semibold text-sm uppercase tracking-wide transition-colors"
              >
                Iniciar Sesión
              </button>
              <Button 
                onClick={() => navigate("/register")}
                className="bg-black hover:bg-black/80 text-white font-bold px-8 py-2 rounded-full transition-all uppercase tracking-wide text-sm"
              >
                Contacto
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Estilo April Ford */}
      <section className="min-h-[90vh] flex items-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #ec4899 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-6xl">
            {/* Subtítulo */}
            <p className="text-white/80 text-sm sm:text-base uppercase tracking-[0.3em] mb-8 font-semibold">
              EL SOFTWARE #1 PARA ALQUILER DE ESQUÍS
            </p>
            
            {/* Título Principal - Estilo April Ford */}
            <h1 className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-black text-white mb-12 leading-[0.95] tracking-tight uppercase" style={{ fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.02em' }}>
              DEJA DE BUSCAR.<br/>
              EMPIEZA A<br/>
              <span className="inline-block">CRECER.</span>
            </h1>
            
            {/* Botón CTA */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg"
                className="text-base px-10 py-7 bg-white text-black hover:bg-white/90 font-bold rounded-full shadow-2xl hover:shadow-white/30 transition-all uppercase tracking-wide"
                onClick={() => navigate("/register")}
              >
                EMPEZAR AHORA
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - MINIMAL GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 border-t border-slate-200">
        <div className="mb-20">
          <h2 className="text-5xl sm:text-6xl font-black text-black mb-6 leading-tight uppercase tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Todo lo que necesitas.<br/>
            <span className="text-slate-400">Nada que no.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {/* Feature 1 */}
          <div className="group">
            <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center mb-6">
              <Database className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              Control Total de Inventario
            </h3>
            <p className="text-slate-600 text-lg leading-relaxed">
              Cada par de esquís, cada bota. Códigos internos y estados en tiempo real.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group">
            <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center mb-6">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              Base de Datos 360°
            </h3>
            <p className="text-slate-600 text-lg leading-relaxed">
              Historial completo de cada cliente. Recupera datos de años anteriores al instante.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group">
            <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center mb-6">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              Packs Inteligentes
            </h3>
            <p className="text-slate-600 text-lg leading-relaxed">
              Configura packs de material. El sistema los detecta y aplica tarifas automáticamente.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="group">
            <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center mb-6">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              Proceso Turbo
            </h3>
            <p className="text-slate-600 text-lg leading-relaxed">
              Crea alquileres en segundos. Cierra el ticket antes de que se forme cola.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="group">
            <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center mb-6">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              Análisis de Rentabilidad
            </h3>
            <p className="text-slate-600 text-lg leading-relaxed">
              Identifica qué ítems generan más ingresos. Decisiones basadas en datos reales.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="group">
            <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center mb-6">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              Acceso Multiusuario
            </h3>
            <p className="text-slate-600 text-lg leading-relaxed">
              Gestiona tu local desde varios ordenadores. Cada empleado con su propio acceso.
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

      {/* Pricing Section - MODERN CARDS */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="mb-20">
          <h2 className="text-5xl sm:text-6xl font-black text-black mb-6 leading-tight uppercase tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Planes que<br/>
            <span className="text-slate-400">escalan contigo</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl font-medium">
            Sin letras pequeñas. Todas las funciones en todos los planes.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Trial Plan */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
            <div className="relative bg-white rounded-2xl border-2 border-slate-200 p-8 hover:border-transparent transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
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
                className="w-full mb-8 font-bold border-2 border-slate-900 text-black hover:bg-slate-900 hover:text-white rounded-full py-6"
              >
                PROBAR GRATIS
              </Button>

              <div className="space-y-4">
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">50 productos</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">100 clientes</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">1 tienda</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Todas las funciones</span>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Plan */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
            <div className="relative bg-white rounded-2xl border-2 border-slate-200 p-8 hover:border-transparent transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
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
                <p className="text-sm text-slate-600 mt-2 font-medium">79 €/mes · anual</p>
              </div>

              <Button 
                onClick={() => navigate("/register")} 
                variant="outline" 
                className="w-full mb-8 font-bold border-2 border-slate-900 text-black hover:bg-slate-900 hover:text-white rounded-full py-6"
              >
                CONTRATAR
              </Button>

              <div className="space-y-4">
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">200 productos</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">500 clientes</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">1 tienda</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Todas las funciones</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pro Plan - DESTACADO */}
          <div className="relative group lg:scale-105">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl opacity-100 blur-sm"></div>
            <div className="relative bg-slate-900 rounded-2xl p-8 shadow-2xl">
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
                <p className="text-sm text-slate-400 mt-2 font-medium">121 €/mes · anual</p>
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
                  <span className="text-white font-semibold">500 productos</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-white font-semibold">2.000 clientes</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-white font-semibold">3 tiendas</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-white font-semibold">Todas las funciones</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
            <div className="relative bg-white rounded-2xl border-2 border-slate-200 p-8 hover:border-transparent transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
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
                <p className="text-sm text-slate-600 mt-2 font-medium">163 €/mes · anual</p>
              </div>

              <Button 
                onClick={() => navigate("/register")} 
                variant="outline" 
                className="w-full mb-8 font-bold border-2 border-slate-900 text-black hover:bg-slate-900 hover:text-white rounded-full py-6"
              >
                CONTACTAR
              </Button>

              <div className="space-y-4">
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Productos ilimitados</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Clientes ilimitados</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Tiendas ilimitadas</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Todas las funciones</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - BOLD */}
      <section className="bg-slate-900 py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-6xl sm:text-7xl font-black text-white mb-8 leading-tight uppercase tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Recupera el<br/>
            control de tu<br/>
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">temporada alta</span>
          </h2>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
            Únete a los profesionales que ya eliminaron las colas de sus tiendas.
          </p>
          <Button 
            size="lg"
            className="bg-white text-black hover:bg-slate-100 text-lg px-12 py-8 font-black rounded-full shadow-2xl hover:shadow-white/20 transition-all uppercase"
            onClick={() => navigate("/register")}
          >
            Empezar Ahora
            <ArrowRight className="ml-2 h-5 w-5" />
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
