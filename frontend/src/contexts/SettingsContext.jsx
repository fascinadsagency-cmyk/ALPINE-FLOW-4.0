import { createContext, useContext, useState, useEffect } from "react";

const SettingsContext = createContext();

// Traducciones básicas
const translations = {
  es: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.newRental": "Nuevo Alquiler",
    "nav.activeRentals": "Alquileres Activos",
    "nav.returns": "Devoluciones",
    "nav.customers": "Clientes",
    "nav.providers": "Proveedores",
    "nav.inventory": "Inventario",
    "nav.tariffs": "Tarifas",
    "nav.reports": "Reportes",
    "nav.maintenance": "Mantenimiento",
    "nav.cashRegister": "Caja",
    "nav.integrations": "Integraciones",
    "nav.settings": "Configuración",
    
    // Settings page
    "settings.title": "Configuración",
    "settings.subtitle": "Personaliza el comportamiento de la aplicación",
    "settings.saveChanges": "Guardar Cambios",
    "settings.saved": "Configuración guardada correctamente",
    
    // Interface section
    "settings.interface": "Ajustes de Interfaz",
    "settings.interface.desc": "Personaliza la apariencia y el idioma de la aplicación",
    "settings.darkMode": "Modo Oscuro",
    "settings.darkMode.desc": "Activa el tema oscuro para reducir la fatiga visual en ambientes con poca luz",
    "settings.darkMode.enabled": "Tema oscuro activado",
    "settings.darkMode.disabled": "Tema claro activado",
    "settings.language": "Idioma",
    "settings.language.desc": "Selecciona el idioma de la interfaz",
    "settings.language.es": "Español",
    "settings.language.en": "English",
    
    // Print section
    "settings.print": "Configuración de Impresión",
    "settings.autoPrint": "Impresión Automática de Tickets",
    "settings.autoPrint.desc": "El sistema imprimirá automáticamente los tickets al completar transacciones",
    "settings.autoPrint.enabled": "Los tickets se imprimirán automáticamente",
    "settings.autoPrint.disabled": "Los tickets requieren confirmación manual",
    "settings.autoPrint.tip": "Activa esta opción si tienes una impresora térmica conectada",
    
    // Placeholders
    "settings.ticketCustomization": "Personalización de Ticket",
    "settings.ticketCustomization.desc": "Configura el diseño y contenido de los tickets",
    "settings.taxManagement": "Gestión de IVA",
    "settings.taxManagement.desc": "Configura los tipos de IVA y su aplicación",
    "settings.visualIdentity": "Identidad Visual",
    "settings.visualIdentity.desc": "Personaliza el logo y colores de la empresa",
    "settings.comingSoon": "Próximamente",
    
    // Common
    "common.cancel": "Cancelar",
    "common.save": "Guardar",
    "common.close": "Cerrar",
    "common.loading": "Cargando...",
    "common.status": "Estado actual",
    "common.recommended": "Recomendado",
    
    // Dashboard
    "dashboard.revenueToday": "Ingresos Netos Hoy",
    "dashboard.rentalsToday": "Alquileres Hoy",
    "dashboard.activeRentals": "Alquileres Activos",
    "dashboard.pendingReturns": "Devoluciones Pendientes",
  },
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.newRental": "New Rental",
    "nav.activeRentals": "Active Rentals",
    "nav.returns": "Returns",
    "nav.customers": "Customers",
    "nav.providers": "Providers",
    "nav.inventory": "Inventory",
    "nav.tariffs": "Tariffs",
    "nav.reports": "Reports",
    "nav.maintenance": "Maintenance",
    "nav.cashRegister": "Cash Register",
    "nav.integrations": "Integrations",
    "nav.settings": "Settings",
    
    // Settings page
    "settings.title": "Settings",
    "settings.subtitle": "Customize the application behavior",
    "settings.saveChanges": "Save Changes",
    "settings.saved": "Settings saved successfully",
    
    // Interface section
    "settings.interface": "Interface Settings",
    "settings.interface.desc": "Customize the appearance and language of the application",
    "settings.darkMode": "Dark Mode",
    "settings.darkMode.desc": "Enable dark theme to reduce eye strain in low-light environments",
    "settings.darkMode.enabled": "Dark theme enabled",
    "settings.darkMode.disabled": "Light theme enabled",
    "settings.language": "Language",
    "settings.language.desc": "Select the interface language",
    "settings.language.es": "Español",
    "settings.language.en": "English",
    
    // Print section
    "settings.print": "Print Settings",
    "settings.autoPrint": "Automatic Ticket Printing",
    "settings.autoPrint.desc": "The system will automatically print tickets when completing transactions",
    "settings.autoPrint.enabled": "Tickets will print automatically",
    "settings.autoPrint.disabled": "Tickets require manual confirmation",
    "settings.autoPrint.tip": "Enable this option if you have a thermal printer connected",
    
    // Placeholders
    "settings.ticketCustomization": "Ticket Customization",
    "settings.ticketCustomization.desc": "Configure ticket design and content",
    "settings.taxManagement": "Tax Management",
    "settings.taxManagement.desc": "Configure tax rates and their application",
    "settings.visualIdentity": "Visual Identity",
    "settings.visualIdentity.desc": "Customize company logo and colors",
    "settings.comingSoon": "Coming Soon",
    
    // Common
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.close": "Close",
    "common.loading": "Loading...",
    "common.status": "Current status",
    "common.recommended": "Recommended",
    
    // Dashboard
    "dashboard.revenueToday": "Net Revenue Today",
    "dashboard.rentalsToday": "Rentals Today",
    "dashboard.activeRentals": "Active Rentals",
    "dashboard.pendingReturns": "Pending Returns",
  }
};

export function SettingsProvider({ children }) {
  // Initialize from localStorage or defaults
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });
  
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'es';
  });
  
  const [autoPrint, setAutoPrint] = useState(() => {
    const saved = localStorage.getItem('auto_print_enabled');
    return saved === 'true';
  });

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#0f172a';
      document.body.style.color = '#f1f5f9';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Persist language
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Persist autoPrint
  useEffect(() => {
    localStorage.setItem('auto_print_enabled', autoPrint.toString());
  }, [autoPrint]);

  // Translation function
  const t = (key) => {
    return translations[language]?.[key] || translations['es'][key] || key;
  };

  const value = {
    darkMode,
    setDarkMode,
    language,
    setLanguage,
    autoPrint,
    setAutoPrint,
    t,
    translations
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export default SettingsContext;
