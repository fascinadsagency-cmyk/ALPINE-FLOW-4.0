import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
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
  Palette, 
  Save,
  Moon,
  Sun,
  Globe,
  Receipt,
  Percent,
  Building2,
  Loader2,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";

export default function Settings() {
  const { darkMode, setDarkMode, language, setLanguage, autoPrint, setAutoPrint, t } = useSettings();
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleDarkModeChange = (enabled) => {
    setDarkMode(enabled);
    setHasChanges(true);
    toast.success(enabled ? t('settings.darkMode.enabled') : t('settings.darkMode.disabled'));
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setHasChanges(true);
    toast.success(lang === 'es' ? 'Idioma cambiado a Español' : 'Language changed to English');
  };

  const handleAutoPrintChange = (enabled) => {
    setAutoPrint(enabled);
    setHasChanges(true);
    toast.success(enabled ? t('settings.autoPrint.enabled') : t('settings.autoPrint.disabled'));
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

      <div className="grid gap-6 max-w-4xl">
        
        {/* ============ AJUSTES DE INTERFAZ ============ */}
        <Card className={`border-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <CardHeader className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-slate-200'}`}>
            <CardTitle className={`text-lg flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <Palette className="h-5 w-5 text-indigo-500" />
              {t('settings.interface')}
            </CardTitle>
            <CardDescription className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
              {t('settings.interface.desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            
            {/* Dark Mode Toggle */}
            <div className={`flex items-start justify-between p-4 rounded-xl border-2 transition-all ${
              darkMode 
                ? 'border-indigo-500/50 bg-indigo-500/10' 
                : 'border-slate-200 hover:border-indigo-300'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                  {darkMode ? (
                    <Moon className="h-6 w-6 text-indigo-400" />
                  ) : (
                    <Sun className="h-6 w-6 text-amber-500" />
                  )}
                </div>
                <div className="flex-1">
                  <Label htmlFor="dark-mode" className={`text-base font-semibold cursor-pointer ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t('settings.darkMode')}
                  </Label>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('settings.darkMode.desc')}
                  </p>
                  <div className={`mt-3 p-2 rounded-lg inline-flex items-center gap-2 ${
                    darkMode ? 'bg-indigo-500/20' : 'bg-slate-100'
                  }`}>
                    <div className={`h-2 w-2 rounded-full ${darkMode ? 'bg-indigo-400' : 'bg-amber-500'}`}></div>
                    <span className={`text-xs font-medium ${darkMode ? 'text-indigo-300' : 'text-slate-600'}`}>
                      {darkMode ? t('settings.darkMode.enabled') : t('settings.darkMode.disabled')}
                    </span>
                  </div>
                </div>
              </div>
              <Switch 
                id="dark-mode"
                checked={darkMode} 
                onCheckedChange={handleDarkModeChange}
                className="data-[state=checked]:bg-indigo-500"
              />
            </div>

            {/* Language Selector */}
            <div className={`flex items-start justify-between p-4 rounded-xl border-2 transition-all ${
              darkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-indigo-300'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-blue-100'}`}>
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
                <SelectTrigger className={`w-[180px] ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <SelectItem value="es" className={darkMode ? 'text-white hover:bg-slate-700' : ''}>
                    🇪🇸 {t('settings.language.es')}
                  </SelectItem>
                  <SelectItem value="en" className={darkMode ? 'text-white hover:bg-slate-700' : ''}>
                    🇬🇧 {t('settings.language.en')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ============ IMPRESIÓN ============ */}
        <Card className={`border-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <CardHeader className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-slate-200'}`}>
            <CardTitle className={`text-lg flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <Printer className="h-5 w-5 text-emerald-500" />
              {t('settings.print')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className={`flex items-start justify-between p-4 rounded-xl border-2 transition-all ${
              autoPrint 
                ? (darkMode ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-emerald-300 bg-emerald-50')
                : (darkMode ? 'border-slate-700' : 'border-slate-200')
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${autoPrint ? 'bg-emerald-500/20' : (darkMode ? 'bg-slate-700' : 'bg-slate-100')}`}>
                  <Printer className={`h-6 w-6 ${autoPrint ? 'text-emerald-500' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`} />
                </div>
                <div className="flex-1 pr-4">
                  <Label htmlFor="auto-print" className={`text-base font-semibold cursor-pointer ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t('settings.autoPrint')}
                  </Label>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('settings.autoPrint.desc')}
                  </p>
                  <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                    <p className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      <strong>💡 {t('common.recommended')}:</strong> {t('settings.autoPrint.tip')}
                    </p>
                  </div>
                  <div className={`mt-3 p-2 rounded-lg inline-flex items-center gap-2 ${
                    autoPrint ? 'bg-emerald-500/20' : (darkMode ? 'bg-slate-700' : 'bg-slate-100')
                  }`}>
                    <div className={`h-2 w-2 rounded-full ${autoPrint ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                    <span className={`text-xs font-medium ${autoPrint ? 'text-emerald-500' : (darkMode ? 'text-slate-400' : 'text-slate-600')}`}>
                      {autoPrint ? t('settings.autoPrint.enabled') : t('settings.autoPrint.disabled')}
                    </span>
                  </div>
                </div>
              </div>
              <Switch 
                id="auto-print"
                checked={autoPrint} 
                onCheckedChange={handleAutoPrintChange}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* ============ PLACEHOLDERS PARA FUTURAS SECCIONES ============ */}
        
        {/* Personalización de Ticket */}
        <Card className={`border-2 opacity-60 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <CardHeader className={`border-b ${darkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <CardTitle className={`text-lg flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <Receipt className={`h-5 w-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              {t('settings.ticketCustomization')}
              <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                {t('settings.comingSoon')}
              </span>
            </CardTitle>
            <CardDescription className={darkMode ? 'text-slate-500' : 'text-slate-500'}>
              {t('settings.ticketCustomization.desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className={`p-8 rounded-xl border-2 border-dashed text-center ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <Receipt className={`h-12 w-12 mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
              <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Aquí podrás personalizar el diseño de tus tickets: logo, texto del pie de página, formato de fecha, etc.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Gestión de IVA */}
        <Card className={`border-2 opacity-60 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <CardHeader className={`border-b ${darkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <CardTitle className={`text-lg flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <Percent className={`h-5 w-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              {t('settings.taxManagement')}
              <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                {t('settings.comingSoon')}
              </span>
            </CardTitle>
            <CardDescription className={darkMode ? 'text-slate-500' : 'text-slate-500'}>
              {t('settings.taxManagement.desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className={`p-8 rounded-xl border-2 border-dashed text-center ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <Percent className={`h-12 w-12 mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
              <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Configura los tipos de IVA (21%, 10%, 4%) y cómo se aplican a cada tipo de servicio o producto.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Identidad Visual */}
        <Card className={`border-2 opacity-60 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <CardHeader className={`border-b ${darkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <CardTitle className={`text-lg flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <Building2 className={`h-5 w-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              {t('settings.visualIdentity')}
              <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                {t('settings.comingSoon')}
              </span>
            </CardTitle>
            <CardDescription className={darkMode ? 'text-slate-500' : 'text-slate-500'}>
              {t('settings.visualIdentity.desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className={`p-8 rounded-xl border-2 border-dashed text-center ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <Building2 className={`h-12 w-12 mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
              <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Sube el logo de tu empresa, personaliza los colores corporativos y configura los datos fiscales.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
