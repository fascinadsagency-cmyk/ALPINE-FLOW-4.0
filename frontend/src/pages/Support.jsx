import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Mail, 
  Headphones,
  Clock,
  CheckCircle2
} from "lucide-react";

export default function Support() {
  const handleWhatsAppClick = () => {
    // Reemplaza este número con el número real de soporte
    const phoneNumber = "34600000000"; // Formato: código país + número sin espacios
    window.open(`https://wa.me/${phoneNumber}`, '_blank');
  };

  const handleEmailClick = () => {
    window.location.href = "mailto:soporte@alpineflow.es";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Headphones className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">Soporte Técnico</h1>
          </div>
          <p className="text-xl text-slate-600">
            Estamos aquí para ayudarte con cualquier problema o duda
          </p>
        </div>

        {/* Main CTA Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* WhatsApp Card */}
          <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-emerald-200 hover:border-emerald-400 group">
            <CardContent className="p-8 text-center">
              <div className="mb-6 flex justify-center">
                <div className="p-6 bg-emerald-500/20 rounded-full group-hover:bg-emerald-200 transition-colors">
                  <MessageSquare className="h-12 w-12 text-emerald-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Chat con Soporte
              </h2>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Chatea directamente con nuestro equipo de soporte técnico por WhatsApp. 
                Respuesta rápida y personalizada.
              </p>
              <Button 
                onClick={handleWhatsAppClick}
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg py-6 group-hover:scale-105 transition-transform"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Abrir WhatsApp
              </Button>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Clock className="h-4 w-4" />
                <span>Respuesta típica: 5-10 minutos</span>
              </div>
            </CardContent>
          </Card>

          {/* Email Card */}
          <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-blue-200 hover:border-blue-400 group">
            <CardContent className="p-8 text-center">
              <div className="mb-6 flex justify-center">
                <div className="p-6 bg-blue-500/20 rounded-full group-hover:bg-blue-200 transition-colors">
                  <Mail className="h-12 w-12 text-blue-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Enviar por Email
              </h2>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Envíanos un correo con los detalles de tu consulta o incidencia. 
                Te responderemos lo antes posible.
              </p>
              <Button 
                onClick={handleEmailClick}
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6 group-hover:scale-105 transition-transform"
              >
                <Mail className="h-5 w-5 mr-2" />
                Enviar Email
              </Button>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Clock className="h-4 w-4" />
                <span>Respuesta típica: 2-4 horas</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ¿Qué incluye nuestro soporte?
            </h3>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Asistencia técnica para cualquier problema o error</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Ayuda con la configuración y personalización del sistema</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Guía para resolver dudas sobre funcionalidades</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Sugerencias de mejora y optimización de tu operativa</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Help Center Link */}
        <div className="text-center mt-8">
          <p className="text-slate-600 mb-3">
            ¿Prefieres buscar por tu cuenta primero?
          </p>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/ayuda'}
            className="border-slate-300 hover:bg-slate-100"
          >
            Ver Centro de Ayuda
          </Button>
        </div>
      </div>
    </div>
  );
}
