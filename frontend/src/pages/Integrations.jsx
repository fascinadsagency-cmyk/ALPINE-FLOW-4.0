import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  CreditCard, 
  Mail, 
  Calendar,
  Check,
  X,
  Loader2,
  Settings,
  RefreshCw,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULT_WHATSAPP_TEMPLATES = {
  reminder_start: "Hola {nombre}, tu alquiler de equipos de esquí comienza mañana {fecha_inicio}. ¡Te esperamos!",
  reminder_end: "Hola {nombre}, recuerda devolver tu equipo hoy antes de las 20:00h. Fecha fin: {fecha_fin}",
  overdue: "Hola {nombre}, tu equipo debía devolverse el {fecha_fin}. Por favor contacta con nosotros.",
  confirmation: "Reserva confirmada para {nombre}. {articulos} desde {fecha_inicio} hasta {fecha_fin}. Total: {total}€"
};

export default function Integrations() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whatsappConfig, setWhatsappConfig] = useState({
    enabled: false,
    phone_number: "",
    api_key: "",
    auto_reminders: false,
    send_confirmations: false,
    send_overdue_alerts: false,
    templates: DEFAULT_WHATSAPP_TEMPLATES
  });
  const [tpvConfig, setTpvConfig] = useState({
    enabled: false,
    bank: "",
    terminal_model: "",
    terminal_number: "",
    api_key: "",
    auto_sync: true,
    save_receipts: true,
    reprint_enabled: false
  });
  const [verifactuConfig, setVerifactuConfig] = useState({
    enabled: false,
    nif_emisor: "",
    nombre_emisor: "",
    software_id: "",
    software_version: "1.0",
    test_mode: true,
    auto_send: false,
    save_xml: true
  });
  const [emailConfig, setEmailConfig] = useState({
    enabled: false,
    smtp_server: "",
    smtp_port: "587",
    email_from: "",
    email_password: "",
    use_tls: true,
    send_confirmations: false,
    send_reminders: false,
    send_invoices: false,
    company_logo_url: "",
    email_signature: ""
  });
  const [calendarConfig, setCalendarConfig] = useState({
    enabled: false,
    google_client_id: "",
    google_client_secret: "",
    calendar_id: "",
    sync_interval: "15",
    auto_create_events: true,
    color_code_by_status: true,
    send_notifications: true,
    default_duration: "60"
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const [whatsappRes, tpvRes, verifactuRes, emailRes, calendarRes] = await Promise.all([
        axios.get(`${API}/integrations/config/whatsapp`),
        axios.get(`${API}/integrations/config/tpv`),
        axios.get(`${API}/integrations/config/verifactu`),
        axios.get(`${API}/integrations/config/email`),
        axios.get(`${API}/integrations/config/calendar`)
      ]);
      
      if (whatsappRes.data.config) {
        setWhatsappConfig({ ...whatsappConfig, ...whatsappRes.data.config, enabled: whatsappRes.data.enabled });
      }
      if (tpvRes.data.config) {
        setTpvConfig({ ...tpvConfig, ...tpvRes.data.config, enabled: tpvRes.data.enabled });
      }
      if (verifactuRes.data.config) {
        setVerifactuConfig({ ...verifactuConfig, ...verifactuRes.data.config, enabled: verifactuRes.data.enabled });
      }
      if (emailRes.data.config) {
        setEmailConfig({ ...emailConfig, ...emailRes.data.config, enabled: emailRes.data.enabled });
      }
      if (calendarRes.data.config) {
        setCalendarConfig({ ...calendarConfig, ...calendarRes.data.config, enabled: calendarRes.data.enabled });
      }
    } catch (error) {
      console.log("Configs not loaded yet");
    } finally {
      setLoading(false);
    }
  };

  const saveWhatsappConfig = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/integrations/config`, {
        integration_type: "whatsapp",
        enabled: whatsappConfig.enabled,
        config: whatsappConfig
      });
      toast.success("Configuración de WhatsApp guardada");
    } catch (error) {
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const saveTpvConfig = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/integrations/config`, {
        integration_type: "tpv",
        enabled: tpvConfig.enabled,
        config: tpvConfig
      });
      toast.success("Configuración de TPV guardada");
    } catch (error) {
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const saveVerifactuConfig = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/integrations/config`, {
        integration_type: "verifactu",
        enabled: verifactuConfig.enabled,
        config: verifactuConfig
      });
      toast.success("Configuración de VeriFactu guardada");
    } catch (error) {
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const saveEmailConfig = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/integrations/config`, {
        integration_type: "email",
        enabled: emailConfig.enabled,
        config: emailConfig
      });
      toast.success("Configuración de Email guardada");
    } catch (error) {
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const saveCalendarConfig = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/integrations/config`, {
        integration_type: "calendar",
        enabled: calendarConfig.enabled,
        config: calendarConfig
      });
      toast.success("Configuración de Calendario guardada");
    } catch (error) {
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (type) => {
    toast.info(`Probando conexión con ${type}...`);
    // Simulated test - in real implementation would call actual API
    setTimeout(() => {
      toast.success(`Conexión con ${type} simulada correctamente`);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8" data-testid="integrations-page">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Integraciones
        </h1>
        <p className="text-slate-500 mt-1">Configura conexiones con servicios externos</p>
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="tpv" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">TPV</span>
          </TabsTrigger>
          <TabsTrigger value="verifactu" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">VeriFactu</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendario</span>
          </TabsTrigger>
        </TabsList>

        {/* WhatsApp Integration */}
        <TabsContent value="whatsapp">
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle>WhatsApp Business</CardTitle>
                    <CardDescription>Envía avisos automáticos a tus clientes</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={whatsappConfig.enabled ? "default" : "secondary"}>
                    {whatsappConfig.enabled ? (
                      <><Check className="h-3 w-3 mr-1" /> Conectado</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" /> No conectado</>
                    )}
                  </Badge>
                  <Switch
                    checked={whatsappConfig.enabled}
                    onCheckedChange={(v) => setWhatsappConfig({ ...whatsappConfig, enabled: v })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Número de empresa</Label>
                  <Input
                    value={whatsappConfig.phone_number}
                    onChange={(e) => setWhatsappConfig({ ...whatsappConfig, phone_number: e.target.value })}
                    placeholder="+34 600 000 000"
                    className="h-11 mt-1"
                  />
                </div>
                <div>
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={whatsappConfig.api_key}
                    onChange={(e) => setWhatsappConfig({ ...whatsappConfig, api_key: e.target.value })}
                    placeholder="••••••••••••••••"
                    className="h-11 mt-1"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Opciones de envío automático</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <span className="text-sm">Recordatorios antes del inicio</span>
                    <Switch
                      checked={whatsappConfig.auto_reminders}
                      onCheckedChange={(v) => setWhatsappConfig({ ...whatsappConfig, auto_reminders: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <span className="text-sm">Confirmaciones de reserva</span>
                    <Switch
                      checked={whatsappConfig.send_confirmations}
                      onCheckedChange={(v) => setWhatsappConfig({ ...whatsappConfig, send_confirmations: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <span className="text-sm">Avisos de devolución pendiente</span>
                    <Switch
                      checked={whatsappConfig.send_overdue_alerts}
                      onCheckedChange={(v) => setWhatsappConfig({ ...whatsappConfig, send_overdue_alerts: v })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">Plantilla de recordatorio</Label>
                <Textarea
                  value={whatsappConfig.templates?.reminder_start || ""}
                  onChange={(e) => setWhatsappConfig({ 
                    ...whatsappConfig, 
                    templates: { ...whatsappConfig.templates, reminder_start: e.target.value }
                  })}
                  className="font-mono text-sm"
                  rows={3}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Variables: {'{nombre}'}, {'{fecha_inicio}'}, {'{fecha_fin}'}, {'{articulos}'}, {'{total}'}
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => testConnection('WhatsApp')}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Probar conexión
                </Button>
                <Button onClick={saveWhatsappConfig} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Guardar configuración
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TPV Integration */}
        <TabsContent value="tpv">
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>TPV / Datáfono</CardTitle>
                    <CardDescription>Sincroniza pagos con tarjeta automáticamente</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={tpvConfig.enabled ? "default" : "secondary"}>
                    {tpvConfig.enabled ? (
                      <><Check className="h-3 w-3 mr-1" /> Conectado</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" /> No conectado</>
                    )}
                  </Badge>
                  <Switch
                    checked={tpvConfig.enabled}
                    onCheckedChange={(v) => setTpvConfig({ ...tpvConfig, enabled: v })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Banco</Label>
                  <Input
                    value={tpvConfig.bank}
                    onChange={(e) => setTpvConfig({ ...tpvConfig, bank: e.target.value })}
                    placeholder="Ej: CaixaBank, Santander..."
                    className="h-11 mt-1"
                  />
                </div>
                <div>
                  <Label>Modelo TPV</Label>
                  <Input
                    value={tpvConfig.terminal_model}
                    onChange={(e) => setTpvConfig({ ...tpvConfig, terminal_model: e.target.value })}
                    placeholder="Ej: Ingenico Move 5000"
                    className="h-11 mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Número de terminal</Label>
                  <Input
                    value={tpvConfig.terminal_number}
                    onChange={(e) => setTpvConfig({ ...tpvConfig, terminal_number: e.target.value })}
                    placeholder="00000000"
                    className="h-11 mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label>API Key / Token</Label>
                  <Input
                    type="password"
                    value={tpvConfig.api_key}
                    onChange={(e) => setTpvConfig({ ...tpvConfig, api_key: e.target.value })}
                    placeholder="••••••••••••••••"
                    className="h-11 mt-1"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Opciones</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <span className="text-sm">Sincronización automática de pagos</span>
                    <Switch
                      checked={tpvConfig.auto_sync}
                      onCheckedChange={(v) => setTpvConfig({ ...tpvConfig, auto_sync: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <span className="text-sm">Guardar copias digitales de tickets</span>
                    <Switch
                      checked={tpvConfig.save_receipts}
                      onCheckedChange={(v) => setTpvConfig({ ...tpvConfig, save_receipts: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <span className="text-sm">Reimprimir desde el sistema</span>
                    <Switch
                      checked={tpvConfig.reprint_enabled}
                      onCheckedChange={(v) => setTpvConfig({ ...tpvConfig, reprint_enabled: v })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => testConnection('TPV')}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Probar conexión
                </Button>
                <Button onClick={saveTpvConfig} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Guardar configuración
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VeriFactu Integration */}
        <TabsContent value="verifactu">
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle>VeriFactu (AEAT)</CardTitle>
                    <CardDescription>Sistema de facturación electrónica español</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={verifactuConfig.enabled ? "default" : "secondary"}>
                    {verifactuConfig.enabled ? (
                      <><Check className="h-3 w-3 mr-1" /> Activo</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" /> Inactivo</>
                    )}
                  </Badge>
                  <Switch
                    checked={verifactuConfig.enabled}
                    onCheckedChange={(v) => setVerifactuConfig({ ...verifactuConfig, enabled: v })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>Nota:</strong> VeriFactu es obligatorio para ciertas empresas según normativa AEAT. 
                  Consulta con tu asesor fiscal para determinar si aplica a tu negocio.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>NIF Emisor *</Label>
                  <Input
                    value={verifactuConfig.nif_emisor}
                    onChange={(e) => setVerifactuConfig({ ...verifactuConfig, nif_emisor: e.target.value })}
                    placeholder="A12345678"
                    className="h-11 mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label>Nombre / Razón Social *</Label>
                  <Input
                    value={verifactuConfig.nombre_emisor}
                    onChange={(e) => setVerifactuConfig({ ...verifactuConfig, nombre_emisor: e.target.value })}
                    placeholder="Tu empresa S.L."
                    className="h-11 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>ID Software</Label>
                  <Input
                    value={verifactuConfig.software_id}
                    onChange={(e) => setVerifactuConfig({ ...verifactuConfig, software_id: e.target.value })}
                    placeholder="SW-XXXXX-XXXX"
                    className="h-11 mt-1 font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    ID proporcionado por AEAT tras el registro del software
                  </p>
                </div>
                <div>
                  <Label>Versión Software</Label>
                  <Input
                    value={verifactuConfig.software_version}
                    onChange={(e) => setVerifactuConfig({ ...verifactuConfig, software_version: e.target.value })}
                    placeholder="1.0"
                    className="h-11 mt-1"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Opciones</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div>
                      <span className="text-sm font-medium block">Modo pruebas</span>
                      <span className="text-xs text-slate-500">Usa el entorno de pre-producción de AEAT</span>
                    </div>
                    <Switch
                      checked={verifactuConfig.test_mode}
                      onCheckedChange={(v) => setVerifactuConfig({ ...verifactuConfig, test_mode: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div>
                      <span className="text-sm font-medium block">Envío automático</span>
                      <span className="text-xs text-slate-500">Envía facturas a AEAT al completar alquiler</span>
                    </div>
                    <Switch
                      checked={verifactuConfig.auto_send}
                      onCheckedChange={(v) => setVerifactuConfig({ ...verifactuConfig, auto_send: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div>
                      <span className="text-sm font-medium block">Guardar archivos XML</span>
                      <span className="text-xs text-slate-500">Almacena copias locales de facturas firmadas</span>
                    </div>
                    <Switch
                      checked={verifactuConfig.save_xml}
                      onCheckedChange={(v) => setVerifactuConfig({ ...verifactuConfig, save_xml: v })}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Estado de la integración</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Estructura de configuración preparada</li>
                  <li>✓ UI de configuración completa</li>
                  <li className="text-blue-600">⏳ API de firma digital - Pendiente</li>
                  <li className="text-blue-600">⏳ Conexión AEAT - Pendiente</li>
                  <li className="text-blue-600">⏳ Generación de XML - Pendiente</li>
                </ul>
                <p className="text-xs text-blue-700 mt-3">
                  La implementación completa requiere certificados digitales y homologación con AEAT
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => testConnection('VeriFactu')} disabled>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Probar conexión
                </Button>
                <Button onClick={saveVerifactuConfig} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Guardar configuración
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Integration - Coming Soon */}
        <TabsContent value="email">
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center">
              <Mail className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">Email (Próximamente)</h3>
              <p className="text-slate-500 mt-2">
                Envía confirmaciones y facturas por correo electrónico
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Integration - Coming Soon */}
        <TabsContent value="calendar">
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">Google Calendar (Próximamente)</h3>
              <p className="text-slate-500 mt-2">
                Sincroniza reservas con tu calendario de Google
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
