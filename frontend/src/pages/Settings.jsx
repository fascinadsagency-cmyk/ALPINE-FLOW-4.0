import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Settings as SettingsIcon, 
  Printer, 
  Save,
  Globe,
  Receipt,
  Percent,
  Building2,
  Loader2,
  Check,
  Upload,
  X,
  Eye,
  Image as ImageIcon,
  Moon,
  Sun,
  ScanBarcode,
  MonitorSmartphone,
  Copy,
  CreditCard,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    darkMode, setDarkMode,
    language, setLanguage, 
    autoPrint, setAutoPrint, 
    t,
    companyLogo, setCompanyLogo,
    ticketHeader, setTicketHeader,
    ticketFooter, setTicketFooter,
    ticketTerms, setTicketTerms,
    showDniOnTicket, setShowDniOnTicket,
    showVatOnTicket, setShowVatOnTicket,
    defaultVat, setDefaultVat,
    vatIncludedInPrices, setVatIncludedInPrices,
    calculateVat,
    // Hardware
    quickScanMode, setQuickScanMode,
    paperWidth, setPaperWidth,
    autoPrintOnPayment, setAutoPrintOnPayment,
    printDoubleCopy, setPrintDoubleCopy
  } = useSettings();
  
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef(null);
  const [storeInfo, setStoreInfo] = useState(null);

  // Load store info
  useEffect(() => {
    const loadStoreInfo = async () => {
      if (user?.role === "super_admin") {
        setStoreInfo({ name: "SUPER ADMIN", id: "N/A", status: "global" });
        return;
      }
      
      // Decode JWT to get store_id
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.store_id) {
            const response = await axios.get(`${API}/api/stores/${payload.store_id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            setStoreInfo(response.data);
          }
        }
      } catch (error) {
        console.error("Error loading store info:", error);
      }
    };
    
    loadStoreInfo();
  }, [user]);

  // Sample data for ticket preview
  const sampleTicket = {
    date: new Date().toLocaleDateString('es-ES'),
    customer: "Juan García López",
    dni: "12345678A",
    items: [
      { name: "Esquís Salomon X-Max 170", price: 35.00 },
      { name: "Botas Esquí 42", price: 15.00 },
      { name: "Casco Adulto", price: 8.00 }
    ],
    paymentMethod: "cash",
    total: 58.00
  };

  const vatCalc = calculateVat(sampleTicket.total);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setHasChanges(true);
    toast.success(lang === 'es' ? 'Idioma cambiado a Español' : 'Language changed to English');
  };

  const handleDarkModeChange = (enabled) => {
    setDarkMode(enabled);
    setHasChanges(true);
    toast.success(enabled 
      ? (language === 'es' ? 'Modo Oscuro activado' : 'Dark Mode enabled')
      : (language === 'es' ? 'Modo Claro activado' : 'Light Mode enabled')
    );
  };

  const handleAutoPrintChange = (enabled) => {
    setAutoPrint(enabled);
    setHasChanges(true);
  };

  // Función para comprimir imagen a Base64 con tamaño máximo
  const compressImage = (file, maxWidth = 500, maxHeight = 500, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calcular dimensiones manteniendo proporción
          let { width, height } = img;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
          
          // Crear canvas y dibujar imagen redimensionada
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convertir a Base64 con compresión
          const base64 = canvas.toDataURL('image/jpeg', quality);
          
          // Verificar tamaño final (máximo 200KB para tickets)
          const sizeKB = (base64.length * 0.75) / 1024;
          if (sizeKB > 200) {
            // Reducir calidad si es muy grande
            const reducedBase64 = canvas.toDataURL('image/jpeg', 0.5);
            resolve(reducedBase64);
          } else {
            resolve(base64);
          }
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecciona un archivo de imagen válido");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande. Máximo 5MB.");
      return;
    }

    try {
      toast.loading("Procesando imagen...", { id: 'logo-upload' });
      
      // Comprimir la imagen antes de guardar
      const compressedBase64 = await compressImage(file, 500, 500, 0.8);
      
      // Guardar en el estado (se sincronizará con localStorage vía useEffect)
      setCompanyLogo(compressedBase64);
      setHasChanges(true);
      
      const sizeKB = Math.round((compressedBase64.length * 0.75) / 1024);
      toast.success(`Logo actualizado (${sizeKB}KB)`, { id: 'logo-upload' });
      
    } catch (error) {
      console.error("Error procesando imagen:", error);
      toast.error("Error al procesar la imagen", { id: 'logo-upload' });
    }
  };

  const handleRemoveLogo = () => {
    setCompanyLogo(null);
    setHasChanges(true);
    toast.success("Logo eliminado");
  };

  const handleTicketFieldChange = (setter) => (e) => {
    setter(e.target.value);
    setHasChanges(true);
  };

  const handleToggleChange = (setter) => (value) => {
    setter(value);
    setHasChanges(true);
  };

  const handleVatChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setDefaultVat(Math.max(0, Math.min(100, value)));
    setHasChanges(true);
  };

  const saveAllSettings = () => {
    setSaving(true);
    setTimeout(() => {
      toast.success(t('settings.saved'));
      setSaving(false);
      setHasChanges(false);
    }, 500);
  };

  return (
    <div className={`min-h-screen p-6 lg:p-8 transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`} data-testid="settings-page">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between mb-8 sticky top-0 z-10 py-4 -mt-4 -mx-6 px-6 lg:-mx-8 lg:px-8 backdrop-blur-sm" style={{ backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(248, 250, 252, 0.9)' }}>
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Plus Jakarta Sans' }}>
            <SettingsIcon className="inline-block h-8 w-8 mr-3 text-primary" />
            {t('settings.title')}
          </h1>
          <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('settings.subtitle')}
          </p>
        </div>
        <Button 
          onClick={saveAllSettings} 
          disabled={saving || !hasChanges}
          className={`min-w-[180px] ${hasChanges ? 'bg-primary hover:bg-primary/90' : ''}`}
          size="lg"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : hasChanges ? (
            <Save className="h-4 w-4 mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          {saving ? t('common.loading') : hasChanges ? t('settings.saveChanges') : 'Guardado'}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Access - Billing (Admin Only) */}
        {(user?.role === "admin" || user?.role === "super_admin") && (
          <div className="lg:col-span-2">
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                darkMode 
                  ? 'bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border-emerald-500/50 hover:border-emerald-400' 
                  : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-400'
              }`}
              onClick={() => navigate("/facturacion")}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-emerald-500/20' : 'bg-emerald-500/20'}`}>
                      <CreditCard className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Facturación
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Gestiona tus datos fiscales y descarga tus facturas
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`h-6 w-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Store Identifier Card */}
        {storeInfo && (
          <div className="lg:col-span-2">
            <Card className={`border-2 ${darkMode ? 'bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/50' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-purple-500/20' : 'bg-purple-500/15 border border-purple-500/20'}`}>
                      <Building2 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {storeInfo.name}
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        ID de Tienda: <span className="font-mono font-semibold">{storeInfo.store_id}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {storeInfo.status === "global" ? (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                        🔑 SUPER ADMIN
                      </Badge>
                    ) : (
                      <>
                        <Badge className="bg-emerald-600 text-white border-0">
                          {storeInfo.status === "active" ? "✓ Activa" : "✗ Inactiva"}
                        </Badge>
                        {storeInfo.plan && (
                          <Badge className="bg-purple-600 text-white border-0">
                            Plan: {storeInfo.plan.toUpperCase()}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Left Column - Settings */}
        <div className="space-y-6">
          
          {/* ============ IDENTIDAD DE MARCA ============ */}
          <Card className={`border-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <CardHeader className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gradient-to-r from-purple-50 to-indigo-50 border-slate-200'}`}>
              <CardTitle className={`text-lg flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Building2 className="h-5 w-5 text-purple-500" />
                {t('settings.brandIdentity')}
              </CardTitle>
              <CardDescription className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                {t('settings.brandIdentity.desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {/* Logo Upload */}
              <div className={`p-4 rounded-xl border-2 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-purple-500/15 border border-purple-500/20'}`}>
                    <ImageIcon className={`h-6 w-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div className="flex-1">
                    <Label className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {t('settings.logo')}
                    </Label>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {t('settings.logo.desc')}
                    </p>
                    
                    {companyLogo ? (
                      <div className="mt-4 flex items-center gap-4">
                        <div className={`w-24 h-24 rounded-lg overflow-hidden border-2 ${darkMode ? 'border-slate-600 bg-slate-700' : 'border-slate-200 bg-white'}`}>
                          <img src={companyLogo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            {t('settings.logo.change')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleRemoveLogo} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <X className="h-4 w-4 mr-1" />
                            {t('settings.logo.remove')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={`mt-4 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                          darkMode 
                            ? 'border-slate-600 hover:border-purple-500 hover:bg-slate-700/50' 
                            : 'border-slate-300 hover:border-purple-400 hover:bg-purple-500/10'
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="text-center">
                          <Upload className={`h-8 w-8 mx-auto mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                          <p className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            {t('settings.logo.upload')}
                          </p>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {t('settings.logo.formats')}
                          </p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </div>
                </div>
              </div>

              {/* Language Selector */}
              <div className={`flex items-start justify-between p-4 rounded-xl border-2 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-blue-500/15 border border-blue-500/20'}`}>
                    <Globe className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1">
                    <Label className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {t('settings.language')}
                    </Label>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {t('settings.language.desc')}
                    </p>
                  </div>
                </div>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className={`w-[160px] ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}`} data-testid="language-selector">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                    <SelectItem value="es" className={darkMode ? 'text-white hover:bg-slate-700' : ''}>
                      🇪🇸 {t('settings.language.es')}
                    </SelectItem>
                    <SelectItem value="en" className={darkMode ? 'text-white hover:bg-slate-700' : ''}>
                      🇬🇧 {t('settings.language.en')}
                    </SelectItem>
                    <SelectItem value="ca" className={darkMode ? 'text-white hover:bg-slate-700' : ''}>
                      🏴󠁥󠁳󠁣󠁴󠁿 {t('settings.language.ca')}
                    </SelectItem>
                    <SelectItem value="fr" className={darkMode ? 'text-white hover:bg-slate-700' : ''}>
                      🇫🇷 {t('settings.language.fr')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dark Mode Toggle */}
              <div className={`flex items-start justify-between p-4 rounded-xl border-2 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-indigo-500/20'}`}>
                    {darkMode ? (
                      <Moon className="h-6 w-6 text-indigo-400" />
                    ) : (
                      <Sun className="h-6 w-6 text-indigo-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Label className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {language === 'es' ? 'Modo Oscuro' : 'Dark Mode'}
                    </Label>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {language === 'es' 
                        ? 'Alterna entre el tema claro y oscuro de la aplicación' 
                        : 'Toggle between light and dark application theme'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {darkMode 
                      ? (language === 'es' ? 'Oscuro' : 'Dark')
                      : (language === 'es' ? 'Claro' : 'Light')
                    }
                  </span>
                  <Switch
                    checked={darkMode}
                    onCheckedChange={handleDarkModeChange}
                    data-testid="dark-mode-switch"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ============ DISEÑO DE TICKET ============ */}
          <Card className={`border-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <CardHeader className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-slate-200'}`}>
              <CardTitle className={`text-lg flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Receipt className="h-5 w-5 text-amber-500" />
                {t('settings.ticketDesign')}
              </CardTitle>
              <CardDescription className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                {t('settings.ticketDesign.desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              
              {/* Ticket Header */}
              <div>
                <Label className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  {t('settings.ticket.header')}
                </Label>
                <Textarea
                  value={ticketHeader}
                  onChange={handleTicketFieldChange(setTicketHeader)}
                  placeholder={t('settings.ticket.header.placeholder')}
                  className={`mt-2 min-h-[80px] ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}`}
                />
              </div>

              {/* Ticket Footer */}
              <div>
                <Label className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  {t('settings.ticket.footer')}
                </Label>
                <Textarea
                  value={ticketFooter}
                  onChange={handleTicketFieldChange(setTicketFooter)}
                  placeholder={t('settings.ticket.footer.placeholder')}
                  className={`mt-2 min-h-[60px] ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}`}
                />
              </div>

              {/* Legal Terms */}
              <div>
                <Label className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  {t('settings.ticket.terms')}
                </Label>
                <Textarea
                  value={ticketTerms}
                  onChange={handleTicketFieldChange(setTicketTerms)}
                  placeholder={t('settings.ticket.terms.placeholder')}
                  className={`mt-2 min-h-[80px] ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}`}
                />
              </div>

              {/* Toggles */}
              <div className="grid gap-4 pt-2">
                <div className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <div>
                    <Label className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {t('settings.ticket.showDni')}
                    </Label>
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t('settings.ticket.showDni.desc')}
                    </p>
                  </div>
                  <Switch 
                    checked={showDniOnTicket} 
                    onCheckedChange={handleToggleChange(setShowDniOnTicket)}
                  />
                </div>

                <div className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <div>
                    <Label className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {t('settings.ticket.showVat')}
                    </Label>
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t('settings.ticket.showVat.desc')}
                    </p>
                  </div>
                  <Switch 
                    checked={showVatOnTicket} 
                    onCheckedChange={handleToggleChange(setShowVatOnTicket)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ============ CONFIGURACIÓN DE IVA ============ */}
          <Card className={`border-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <CardHeader className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-slate-200'}`}>
              <CardTitle className={`text-lg flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Percent className="h-5 w-5 text-emerald-500" />
                {t('settings.vat')}
              </CardTitle>
              <CardDescription className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                {t('settings.vat.desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              
              {/* Default VAT */}
              <div className={`p-4 rounded-xl border-2 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {t('settings.vat.default')}
                    </Label>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {t('settings.vat.default.desc')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={defaultVat}
                      onChange={handleVatChange}
                      min="0"
                      max="100"
                      step="0.5"
                      className={`w-24 text-center text-lg font-bold ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}`}
                    />
                    <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-700'}`}>%</span>
                  </div>
                </div>
                
                {/* Quick VAT buttons */}
                <div className="flex gap-2 mt-4">
                  {[4, 10, 21].map((rate) => (
                    <Button
                      key={rate}
                      variant={defaultVat === rate ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setDefaultVat(rate); setHasChanges(true); }}
                      className={defaultVat === rate ? '' : (darkMode ? 'border-slate-600 text-slate-300' : '')}
                    >
                      {rate}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* VAT Included Toggle */}
              <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div>
                  <Label className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t('settings.vat.included')}
                  </Label>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('settings.vat.included.desc')}
                  </p>
                </div>
                <Switch 
                  checked={vatIncludedInPrices} 
                  onCheckedChange={handleToggleChange(setVatIncludedInPrices)}
                />
              </div>
            </CardContent>
          </Card>

          {/* ============ IMPRESIÓN ============ */}
          <Card className={`border-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <CardHeader className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gradient-to-r from-cyan-50 to-sky-50 border-slate-200'}`}>
              <CardTitle className={`text-lg flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Printer className="h-5 w-5 text-cyan-500" />
                {t('settings.print')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                autoPrint 
                  ? (darkMode ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-cyan-300 bg-cyan-500/10')
                  : (darkMode ? 'border-slate-700' : 'border-slate-200')
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${autoPrint ? 'bg-cyan-500/20' : (darkMode ? 'bg-slate-700' : 'bg-slate-100')}`}>
                    <Printer className={`h-6 w-6 ${autoPrint ? 'text-cyan-500' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`} />
                  </div>
                  <div className="flex-1 pr-4">
                    <Label className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {t('settings.autoPrint')}
                    </Label>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {t('settings.autoPrint.desc')}
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={autoPrint} 
                  onCheckedChange={handleAutoPrintChange}
                  className="data-[state=checked]:bg-cyan-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* ============ HARDWARE ============ */}
          <Card className={`border-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} data-testid="hardware-settings">
            <CardHeader className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gradient-to-r from-violet-50 to-purple-50 border-slate-200'}`}>
              <CardTitle className={`text-lg flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <MonitorSmartphone className="h-5 w-5 text-violet-500" />
                {t('settings.hardware')}
              </CardTitle>
              <CardDescription className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                {t('settings.hardware.desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {/* ===== SECCIÓN A: ESCÁNER / PISTOLA ===== */}
              <div className={`p-4 rounded-xl border-2 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
                    <ScanBarcode className={`h-5 w-5 ${darkMode ? 'text-violet-400' : 'text-violet-600'}`} />
                  </div>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t('settings.scanner')}
                  </h3>
                </div>
                
                {/* Modo Escaneo Rápido */}
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  quickScanMode 
                    ? (darkMode ? 'bg-violet-500/10 border border-violet-500/30' : 'bg-violet-50 border border-violet-200')
                    : (darkMode ? 'bg-slate-700/50' : 'bg-slate-50')
                }`}>
                  <div className="flex-1 pr-4">
                    <Label className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {t('settings.scanner.quickMode')}
                    </Label>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {quickScanMode 
                        ? t('settings.scanner.quickMode.desc')
                        : t('settings.scanner.quickMode.disabled')
                      }
                    </p>
                  </div>
                  <Switch 
                    checked={quickScanMode} 
                    onCheckedChange={(value) => { setQuickScanMode(value); setHasChanges(true); }}
                    className="data-[state=checked]:bg-violet-500"
                    data-testid="quick-scan-mode-switch"
                  />
                </div>
              </div>

              {/* ===== SECCIÓN B: IMPRESORA ===== */}
              <div className={`p-4 rounded-xl border-2 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-cyan-500/20' : 'bg-cyan-500/20'}`}>
                    <Printer className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  </div>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t('settings.printer')}
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Ancho de Papel */}
                  <div className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <div className="flex-1 pr-4">
                      <Label className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {t('settings.printer.paperWidth')}
                      </Label>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t('settings.printer.paperWidth.desc')}
                      </p>
                    </div>
                    <Select 
                      value={paperWidth} 
                      onValueChange={(value) => { setPaperWidth(value); setHasChanges(true); }}
                    >
                      <SelectTrigger className={`w-[160px] ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}`} data-testid="paper-width-selector">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                        <SelectItem value="80mm" className={darkMode ? 'text-white hover:bg-slate-700' : ''}>
                          {t('settings.printer.80mm')}
                        </SelectItem>
                        <SelectItem value="58mm" className={darkMode ? 'text-white hover:bg-slate-700' : ''}>
                          {t('settings.printer.58mm')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Auto-Imprimir */}
                  <div className={`flex items-center justify-between p-3 rounded-lg ${
                    autoPrintOnPayment 
                      ? (darkMode ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-cyan-500/10 border border-cyan-200')
                      : (darkMode ? 'bg-slate-700/50' : 'bg-slate-50')
                  }`}>
                    <div className="flex-1 pr-4">
                      <Label className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {t('settings.printer.autoPrint')}
                      </Label>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t('settings.printer.autoPrint.desc')}
                      </p>
                    </div>
                    <Switch 
                      checked={autoPrintOnPayment} 
                      onCheckedChange={(value) => { setAutoPrintOnPayment(value); setHasChanges(true); }}
                      className="data-[state=checked]:bg-cyan-500"
                      data-testid="auto-print-on-payment-switch"
                    />
                  </div>

                  {/* Imprimir Doble Copia */}
                  <div className={`flex items-center justify-between p-3 rounded-lg ${
                    printDoubleCopy 
                      ? (darkMode ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-500/10 border border-amber-200')
                      : (darkMode ? 'bg-slate-700/50' : 'bg-slate-50')
                  }`}>
                    <div className="flex items-start gap-3 flex-1 pr-4">
                      <Copy className={`h-4 w-4 mt-0.5 ${printDoubleCopy ? 'text-amber-500' : (darkMode ? 'text-slate-500' : 'text-slate-400')}`} />
                      <div>
                        <Label className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {t('settings.printer.doubleCopy')}
                        </Label>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {t('settings.printer.doubleCopy.desc')}
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={printDoubleCopy} 
                      onCheckedChange={(value) => { setPrintDoubleCopy(value); setHasChanges(true); }}
                      className="data-[state=checked]:bg-amber-500"
                      data-testid="print-double-copy-switch"
                    />
                  </div>

                  {/* Instrucciones de Configuración */}
                  <div className={`p-4 rounded-lg border-2 border-dashed ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-blue-500/10 border-blue-200'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-full ${darkMode ? 'bg-blue-500/20' : 'bg-blue-500/15'}`}>
                        <AlertCircle className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <p className={`font-medium text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                          {t('settings.printer.setupInstructions.title')}
                        </p>
                        <ul className={`mt-2 space-y-1.5 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">1.</span>
                            <span>{t('settings.printer.setupInstructions.step1')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">2.</span>
                            <span>{t('settings.printer.setupInstructions.step2')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">3.</span>
                            <span>{t('settings.printer.setupInstructions.step3')}</span>
                          </li>
                        </ul>
                        <p className={`mt-3 text-xs italic ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                          {t('settings.printer.setupInstructions.note')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Ticket Preview */}
        <div className="lg:sticky lg:top-24 h-fit">
          <Card className={`border-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <CardHeader className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gradient-to-r from-slate-100 to-slate-50 border-slate-200'}`}>
              <CardTitle className={`text-lg flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Eye className="h-5 w-5 text-slate-500" />
                {t('settings.ticket.preview')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Ticket Preview */}
              <div className="bg-white text-black rounded-lg shadow-lg p-4 mx-auto max-w-[300px] font-mono text-xs leading-relaxed border border-slate-300">
                
                {/* Logo */}
                {companyLogo && (
                  <div className="flex justify-center mb-3 pb-3 border-b border-dashed border-slate-300">
                    <img src={companyLogo} alt="Logo" className="h-12 object-contain" />
                  </div>
                )}
                
                {/* Header */}
                <div className="text-center whitespace-pre-wrap mb-3 pb-3 border-b border-dashed border-slate-300">
                  {ticketHeader || 'NOMBRE DE TU NEGOCIO'}
                </div>
                
                {/* Ticket Title */}
                <div className="text-center font-bold text-sm mb-3">
                  {t('ticket.rental')}
                </div>
                
                {/* Date */}
                <div className="flex justify-between mb-1">
                  <span>{t('ticket.date')}:</span>
                  <span>{sampleTicket.date}</span>
                </div>
                
                {/* Customer */}
                <div className="flex justify-between mb-1">
                  <span>{t('ticket.customer')}:</span>
                  <span className="text-right max-w-[150px] truncate">{sampleTicket.customer}</span>
                </div>
                
                {/* DNI - Conditional */}
                {showDniOnTicket && (
                  <div className="flex justify-between mb-1">
                    <span>{t('ticket.dni')}:</span>
                    <span>{sampleTicket.dni}</span>
                  </div>
                )}
                
                {/* Items */}
                <div className="my-3 py-3 border-t border-b border-dashed border-slate-300">
                  <div className="font-bold mb-2">{t('ticket.items')}:</div>
                  {sampleTicket.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="max-w-[180px] truncate">{item.name}</span>
                      <span>€{item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                {/* VAT Breakdown - Conditional */}
                {showVatOnTicket ? (
                  <div className="mb-3 space-y-1">
                    <div className="flex justify-between">
                      <span>{t('ticket.subtotal')}:</span>
                      <span>€{vatCalc.base.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('ticket.vat')} ({defaultVat}%):</span>
                      <span>€{vatCalc.vat.toFixed(2)}</span>
                    </div>
                  </div>
                ) : null}
                
                {/* Total */}
                <div className="flex justify-between font-bold text-base border-t border-double border-slate-400 pt-2 mt-2">
                  <span>{t('ticket.total')}:</span>
                  <span>€{showVatOnTicket ? vatCalc.total.toFixed(2) : sampleTicket.total.toFixed(2)}</span>
                </div>
                
                {/* VAT Included Note */}
                {!showVatOnTicket && vatIncludedInPrices && (
                  <div className="text-center text-[10px] text-slate-500 mt-1">
                    ({t('ticket.vatIncluded')})
                  </div>
                )}
                
                {/* Payment Method */}
                <div className="flex justify-between mt-3 pt-2 border-t border-dashed border-slate-300">
                  <span>{t('ticket.paymentMethod')}:</span>
                  <span>{t('ticket.cash')}</span>
                </div>
                
                {/* Footer */}
                <div className="text-center whitespace-pre-wrap mt-4 pt-3 border-t border-dashed border-slate-300">
                  {ticketFooter || t('ticket.thankYou')}
                </div>
                
                {/* Legal Terms */}
                {ticketTerms && (
                  <div className="mt-3 pt-3 border-t border-dashed border-slate-300 text-[9px] text-slate-500 text-center">
                    {ticketTerms}
                  </div>
                )}
              </div>
              
              {/* Preview Legend */}
              <div className={`mt-4 text-center text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Los cambios se reflejan automáticamente
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
