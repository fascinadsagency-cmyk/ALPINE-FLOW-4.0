import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Printer, Bell, Palette, Save } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [autoPrint, setAutoPrint] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const autoPrintEnabled = localStorage.getItem('auto_print_enabled') === 'true';
    setAutoPrint(autoPrintEnabled);
  }, []);

  const toggleAutoPrint = (enabled) => {
    setAutoPrint(enabled);
    localStorage.setItem('auto_print_enabled', enabled.toString());
    toast.success(`Impresión automática ${enabled ? 'activada' : 'desactivada'}`);
  };

  const saveSettings = () => {
    setLoading(true);
    setTimeout(() => {
      toast.success("Configuración guardada correctamente");
      setLoading(false);
    }, 500);
  };

  return (
    <div className="p-6 lg:p-8" data-testid="settings-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Configuración
          </h1>
          <p className="text-slate-500 mt-1">Personaliza el comportamiento de la aplicación</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Impresión */}
        <Card className="border-slate-200">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              Configuración de Impresión
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="flex items-start justify-between p-4 rounded-lg border-2 border-slate-200 hover:border-primary/50 transition-colors">
                <div className="flex-1 pr-4">
                  <Label htmlFor="auto-print" className="text-base font-semibold text-slate-900 cursor-pointer">
                    Impresión Automática de Tickets
                  </Label>
                  <p className="text-sm text-slate-600 mt-2">
                    Cuando está activada, el sistema imprimirá automáticamente los tickets al completar transacciones 
                    (alquileres, cobros, devoluciones) sin necesidad de pulsar el botón de imprimir.
                  </p>
                  <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-blue-700">
                      <strong>💡 Recomendado:</strong> Activa esta opción si tienes una impresora térmica conectada 
                      y quieres agilizar el proceso de entrega de tickets a los clientes.
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Switch 
                    id="auto-print"
                    checked={autoPrint} 
                    onCheckedChange={toggleAutoPrint}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-2">Estado actual:</h4>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${autoPrint ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                  <span className="text-sm text-slate-700">
                    {autoPrint 
                      ? 'Los tickets se imprimirán automáticamente' 
                      : 'Los tickets requieren confirmación manual'
                    }
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notificaciones (Placeholder for future) */}
        <Card className="border-slate-200 opacity-50">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-slate-400" />
              Notificaciones
              <span className="text-xs text-slate-500 font-normal">(Próximamente)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">
              Configuración de alertas y notificaciones estará disponible próximamente.
            </p>
          </CardContent>
        </Card>

        {/* Apariencia (Placeholder for future) */}
        <Card className="border-slate-200 opacity-50">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5 text-slate-400" />
              Apariencia
              <span className="text-xs text-slate-500 font-normal">(Próximamente)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">
              Personalización de tema y colores estará disponible próximamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
