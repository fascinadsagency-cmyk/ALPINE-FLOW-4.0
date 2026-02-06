import { createContext, useContext, useState, useEffect } from "react";

const SettingsContext = createContext();

// Traducciones completas
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
    
    // Brand Identity section
    "settings.brandIdentity": "Identidad de Marca",
    "settings.brandIdentity.desc": "Logo e idioma de la aplicación",
    "settings.logo": "Logo de la Empresa",
    "settings.logo.desc": "Aparecerá en la cabecera y en los tickets",
    "settings.logo.upload": "Subir Logo",
    "settings.logo.change": "Cambiar Logo",
    "settings.logo.remove": "Quitar Logo",
    "settings.logo.formats": "PNG, JPG o SVG. Máx 2MB",
    "settings.language": "Idioma",
    "settings.language.desc": "Selecciona el idioma de la interfaz",
    "settings.language.es": "Español",
    "settings.language.en": "English",
    
    // Ticket Design section
    "settings.ticketDesign": "Diseño de Ticket",
    "settings.ticketDesign.desc": "Personaliza el contenido de los tickets impresos",
    "settings.ticket.header": "Encabezado del Ticket",
    "settings.ticket.header.placeholder": "Nombre de tu negocio, dirección, teléfono...",
    "settings.ticket.footer": "Pie de Página",
    "settings.ticket.footer.placeholder": "Mensaje de agradecimiento, horarios...",
    "settings.ticket.terms": "Términos Legales",
    "settings.ticket.terms.placeholder": "Condiciones de alquiler, política de devoluciones...",
    "settings.ticket.showDni": "Mostrar DNI del Cliente",
    "settings.ticket.showDni.desc": "El DNI aparecerá en el ticket impreso",
    "settings.ticket.showVat": "Mostrar Desglose de IVA",
    "settings.ticket.showVat.desc": "Muestra base imponible e IVA separados",
    "settings.ticket.preview": "Vista Previa del Ticket",
    
    // VAT section
    "settings.vat": "Configuración de IVA",
    "settings.vat.desc": "Define el IVA aplicado a los alquileres",
    "settings.vat.default": "IVA por Defecto",
    "settings.vat.default.desc": "Este porcentaje se aplicará automáticamente a nuevos alquileres",
    "settings.vat.included": "IVA Incluido en Precios",
    "settings.vat.included.desc": "Los precios de tarifa ya incluyen el IVA",
    
    // Print section
    "settings.print": "Configuración de Impresión",
    "settings.autoPrint": "Impresión Automática de Tickets",
    "settings.autoPrint.desc": "El sistema imprimirá automáticamente los tickets al completar transacciones",
    "settings.autoPrint.enabled": "Los tickets se imprimirán automáticamente",
    "settings.autoPrint.disabled": "Los tickets requieren confirmación manual",
    "settings.autoPrint.tip": "Activa esta opción si tienes una impresora térmica conectada",
    
    // Hardware section
    "settings.hardware": "Hardware",
    "settings.hardware.desc": "Configuración de escáner e impresora",
    "settings.scanner": "Escáner / Pistola de Códigos",
    "settings.scanner.quickMode": "Modo Escaneo Rápido",
    "settings.scanner.quickMode.desc": "Añade el producto automáticamente al detectar un código exacto",
    "settings.scanner.quickMode.disabled": "Solo busca el producto y espera confirmación manual",
    "settings.printer": "Impresora",
    "settings.printer.paperWidth": "Ancho de Papel",
    "settings.printer.paperWidth.desc": "Selecciona el ancho del papel de tu impresora térmica",
    "settings.printer.80mm": "80mm (Estándar)",
    "settings.printer.58mm": "58mm (Estrecho)",
    "settings.printer.autoPrint": "Auto-Imprimir",
    "settings.printer.autoPrint.desc": "Abre el diálogo de impresión automáticamente al confirmar un pago",
    "settings.printer.doubleCopy": "Imprimir Doble Copia",
    "settings.printer.doubleCopy.desc": "Imprime dos tickets seguidos (Tienda y Cliente)",
    
    // Common
    "common.cancel": "Cancelar",
    "common.save": "Guardar",
    "common.close": "Cerrar",
    "common.loading": "Cargando...",
    "common.status": "Estado actual",
    "common.recommended": "Recomendado",
    "common.preview": "Vista Previa",
    "common.enabled": "Activado",
    "common.disabled": "Desactivado",
    
    // Dashboard
    "dashboard.title": "Panel de Control",
    "dashboard.revenueToday": "Ingresos Netos Hoy",
    "dashboard.rentalsToday": "Alquileres Hoy",
    "dashboard.activeRentals": "Alquileres Activos",
    "dashboard.pendingReturns": "Devoluciones Pendientes",
    "dashboard.overdueReturns": "Devoluciones Atrasadas",
    "dashboard.returnsControl": "Control de Devoluciones",
    
    // Rentals
    "rentals.title": "Alquileres Activos",
    "rentals.new": "Nuevo Alquiler",
    "rentals.customer": "Cliente",
    "rentals.items": "Artículos",
    "rentals.days": "Días",
    "rentals.total": "Total",
    "rentals.status": "Estado",
    "rentals.actions": "Acciones",
    "rentals.changes": "CAMBIOS",
    "rentals.quickReturn": "Devolución Rápida",
    "rentals.daysRemaining": "días restantes",
    
    // Returns
    "returns.title": "Devoluciones",
    "returns.pending": "Pendientes de Devolución",
    "returns.process": "Procesar Devolución",
    "returns.manageChange": "GESTIONAR",
    
    // Ticket preview
    "ticket.rental": "TICKET DE ALQUILER",
    "ticket.date": "Fecha",
    "ticket.customer": "Cliente",
    "ticket.dni": "DNI",
    "ticket.items": "Artículos",
    "ticket.subtotal": "Subtotal",
    "ticket.vat": "IVA",
    "ticket.total": "TOTAL",
    "ticket.vatIncluded": "IVA Incluido",
    "ticket.paymentMethod": "Método de Pago",
    "ticket.cash": "Efectivo",
    "ticket.card": "Tarjeta",
    "ticket.thankYou": "¡Gracias por su confianza!",
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
    
    // Brand Identity section
    "settings.brandIdentity": "Brand Identity",
    "settings.brandIdentity.desc": "Logo and application language",
    "settings.logo": "Company Logo",
    "settings.logo.desc": "Will appear in the header and on tickets",
    "settings.logo.upload": "Upload Logo",
    "settings.logo.change": "Change Logo",
    "settings.logo.remove": "Remove Logo",
    "settings.logo.formats": "PNG, JPG or SVG. Max 2MB",
    "settings.language": "Language",
    "settings.language.desc": "Select the interface language",
    "settings.language.es": "Español",
    "settings.language.en": "English",
    
    // Ticket Design section
    "settings.ticketDesign": "Ticket Design",
    "settings.ticketDesign.desc": "Customize the content of printed tickets",
    "settings.ticket.header": "Ticket Header",
    "settings.ticket.header.placeholder": "Business name, address, phone...",
    "settings.ticket.footer": "Footer",
    "settings.ticket.footer.placeholder": "Thank you message, hours...",
    "settings.ticket.terms": "Legal Terms",
    "settings.ticket.terms.placeholder": "Rental conditions, return policy...",
    "settings.ticket.showDni": "Show Customer ID",
    "settings.ticket.showDni.desc": "ID will appear on printed ticket",
    "settings.ticket.showVat": "Show VAT Breakdown",
    "settings.ticket.showVat.desc": "Shows taxable base and VAT separately",
    "settings.ticket.preview": "Ticket Preview",
    
    // VAT section
    "settings.vat": "VAT Configuration",
    "settings.vat.desc": "Define the VAT applied to rentals",
    "settings.vat.default": "Default VAT",
    "settings.vat.default.desc": "This percentage will be automatically applied to new rentals",
    "settings.vat.included": "VAT Included in Prices",
    "settings.vat.included.desc": "Tariff prices already include VAT",
    
    // Print section
    "settings.print": "Print Settings",
    "settings.autoPrint": "Automatic Ticket Printing",
    "settings.autoPrint.desc": "The system will automatically print tickets when completing transactions",
    "settings.autoPrint.enabled": "Tickets will print automatically",
    "settings.autoPrint.disabled": "Tickets require manual confirmation",
    "settings.autoPrint.tip": "Enable this option if you have a thermal printer connected",
    
    // Hardware section
    "settings.hardware": "Hardware",
    "settings.hardware.desc": "Scanner and printer configuration",
    "settings.scanner": "Scanner / Barcode Gun",
    "settings.scanner.quickMode": "Quick Scan Mode",
    "settings.scanner.quickMode.desc": "Automatically adds the product when an exact code is detected",
    "settings.scanner.quickMode.disabled": "Only searches the product and waits for manual confirmation",
    "settings.printer": "Printer",
    "settings.printer.paperWidth": "Paper Width",
    "settings.printer.paperWidth.desc": "Select your thermal printer paper width",
    "settings.printer.80mm": "80mm (Standard)",
    "settings.printer.58mm": "58mm (Narrow)",
    "settings.printer.autoPrint": "Auto-Print",
    "settings.printer.autoPrint.desc": "Automatically opens print dialog when confirming a payment",
    "settings.printer.doubleCopy": "Print Double Copy",
    "settings.printer.doubleCopy.desc": "Prints two tickets in a row (Store and Customer)",
    
    // Common
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.close": "Close",
    "common.loading": "Loading...",
    "common.status": "Current status",
    "common.recommended": "Recommended",
    "common.preview": "Preview",
    "common.enabled": "Enabled",
    "common.disabled": "Disabled",
    
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.revenueToday": "Net Revenue Today",
    "dashboard.rentalsToday": "Rentals Today",
    "dashboard.activeRentals": "Active Rentals",
    "dashboard.pendingReturns": "Pending Returns",
    "dashboard.overdueReturns": "Overdue Returns",
    "dashboard.returnsControl": "Returns Control",
    
    // Rentals
    "rentals.title": "Active Rentals",
    "rentals.new": "New Rental",
    "rentals.customer": "Customer",
    "rentals.items": "Items",
    "rentals.days": "Days",
    "rentals.total": "Total",
    "rentals.status": "Status",
    "rentals.actions": "Actions",
    "rentals.changes": "CHANGES",
    "rentals.quickReturn": "Quick Return",
    "rentals.daysRemaining": "days remaining",
    
    // Returns
    "returns.title": "Returns",
    "returns.pending": "Pending Returns",
    "returns.process": "Process Return",
    "returns.manageChange": "MANAGE",
    
    // Ticket preview
    "ticket.rental": "RENTAL TICKET",
    "ticket.date": "Date",
    "ticket.customer": "Customer",
    "ticket.dni": "ID",
    "ticket.items": "Items",
    "ticket.subtotal": "Subtotal",
    "ticket.vat": "VAT",
    "ticket.total": "TOTAL",
    "ticket.vatIncluded": "VAT Included",
    "ticket.paymentMethod": "Payment Method",
    "ticket.cash": "Cash",
    "ticket.card": "Card",
    "ticket.thankYou": "Thank you for your trust!",
  }
};

export function SettingsProvider({ children }) {
  const API = process.env.REACT_APP_BACKEND_URL;
  
  // Flag para evitar múltiples cargas
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // ========== BASIC SETTINGS ==========
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

  // ========== BRAND IDENTITY ==========
  const [companyLogo, setCompanyLogo] = useState(() => {
    try {
      const savedLogo = localStorage.getItem('company_logo');
      if (savedLogo) {
        const sizeKB = Math.round((savedLogo.length * 0.75) / 1024);
        console.log(`[Settings] Logo cargado desde localStorage (${sizeKB}KB)`);
        return savedLogo;
      }
      console.log('[Settings] No hay logo guardado en localStorage');
      return null;
    } catch (error) {
      console.error('[Settings] Error cargando logo desde localStorage:', error);
      return null;
    }
  });

  // ========== CARGAR SETTINGS DESDE BACKEND AL INICIAR ==========
  useEffect(() => {
    const loadSettingsFromBackend = async () => {
      const token = localStorage.getItem('token');
      if (!token || settingsLoaded) return;
      
      try {
        console.log('[Settings] Cargando configuración desde backend...');
        const response = await fetch(`${API}/api/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const settings = await response.json();
          console.log('[Settings] Configuración cargada desde backend');
          
          // Solo actualizar si hay datos en el backend
          if (settings.company_logo && !companyLogo) {
            console.log('[Settings] Logo encontrado en backend, actualizando...');
            setCompanyLogo(settings.company_logo);
          }
          if (settings.ticket_header) setTicketHeader(settings.ticket_header);
          if (settings.ticket_footer) setTicketFooter(settings.ticket_footer);
          if (settings.ticket_terms) setTicketTerms(settings.ticket_terms);
          if (settings.show_dni_on_ticket !== undefined) setShowDniOnTicket(settings.show_dni_on_ticket);
          if (settings.show_vat_on_ticket !== undefined) setShowVatOnTicket(settings.show_vat_on_ticket);
          if (settings.default_vat !== undefined) setDefaultVat(settings.default_vat);
          if (settings.vat_included_in_prices !== undefined) setVatIncludedInPrices(settings.vat_included_in_prices);
          
          setSettingsLoaded(true);
        }
      } catch (error) {
        console.error('[Settings] Error cargando desde backend:', error);
      }
    };
    
    // Pequeño delay para asegurar que el token existe
    setTimeout(loadSettingsFromBackend, 1000);
  }, [API]);

  // ========== TICKET DESIGN ==========
  const [ticketHeader, setTicketHeader] = useState(() => {
    return localStorage.getItem('ticket_header') || 'ALPINE SKI RENTAL\nCalle Principal 123\nTel: 612 345 678';
  });
  
  const [ticketFooter, setTicketFooter] = useState(() => {
    return localStorage.getItem('ticket_footer') || '¡Gracias por su visita!\nHorario: 9:00 - 20:00';
  });
  
  const [ticketTerms, setTicketTerms] = useState(() => {
    return localStorage.getItem('ticket_terms') || 'El cliente se compromete a devolver el material en las mismas condiciones. Cualquier daño será facturado según tarifa vigente.';
  });
  
  const [showDniOnTicket, setShowDniOnTicket] = useState(() => {
    const saved = localStorage.getItem('show_dni_on_ticket');
    return saved !== 'false'; // Default true
  });
  
  const [showVatOnTicket, setShowVatOnTicket] = useState(() => {
    const saved = localStorage.getItem('show_vat_on_ticket');
    return saved === 'true';
  });

  // ========== VAT CONFIGURATION ==========
  const [defaultVat, setDefaultVat] = useState(() => {
    const saved = localStorage.getItem('default_vat');
    return saved ? parseFloat(saved) : 21;
  });
  
  const [vatIncludedInPrices, setVatIncludedInPrices] = useState(() => {
    const saved = localStorage.getItem('vat_included_in_prices');
    return saved !== 'false'; // Default true
  });

  // ========== HARDWARE SETTINGS ==========
  // Scanner / Barcode Gun
  const [quickScanMode, setQuickScanMode] = useState(() => {
    const saved = localStorage.getItem('quick_scan_mode');
    return saved === 'true';
  });

  // Printer
  const [paperWidth, setPaperWidth] = useState(() => {
    const saved = localStorage.getItem('paper_width');
    return saved || '80mm';
  });

  const [autoPrintOnPayment, setAutoPrintOnPayment] = useState(() => {
    const saved = localStorage.getItem('auto_print_on_payment');
    return saved === 'true';
  });

  const [printDoubleCopy, setPrintDoubleCopy] = useState(() => {
    const saved = localStorage.getItem('print_double_copy');
    return saved === 'true';
  });

  // ========== EFFECTS FOR PERSISTENCE ==========
  
  // Dark mode - Global application
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    if (darkMode) {
      root.classList.add('dark');
      body.classList.add('dark');
      // Set explicit colors for better compatibility
      body.style.backgroundColor = '#121212';
      body.style.color = '#f0f0f0';
      // Add data attribute for CSS targeting
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      body.style.backgroundColor = '#f8fafc';
      body.style.color = '#0f172a';
      root.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Language
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Auto print
  useEffect(() => {
    localStorage.setItem('auto_print_enabled', autoPrint.toString());
  }, [autoPrint]);

  // Company logo - con manejo de errores para localStorage
  useEffect(() => {
    try {
      if (companyLogo) {
        // Verificar tamaño antes de guardar
        const sizeKB = (companyLogo.length * 0.75) / 1024;
        console.log(`[Settings] Guardando logo (${Math.round(sizeKB)}KB)`);
        
        if (sizeKB > 500) {
          console.warn('[Settings] Logo demasiado grande para localStorage, podría fallar');
        }
        
        localStorage.setItem('company_logo', companyLogo);
        console.log('[Settings] Logo guardado en localStorage correctamente');
      } else {
        localStorage.removeItem('company_logo');
        console.log('[Settings] Logo eliminado de localStorage');
      }
    } catch (error) {
      console.error('[Settings] Error guardando logo en localStorage:', error);
      // Si es error de cuota, intentar con una versión más comprimida podría ayudar
      if (error.name === 'QuotaExceededError') {
        console.error('[Settings] localStorage lleno - no se puede guardar el logo');
      }
    }
  }, [companyLogo]);

  // Ticket design
  useEffect(() => {
    localStorage.setItem('ticket_header', ticketHeader);
  }, [ticketHeader]);

  useEffect(() => {
    localStorage.setItem('ticket_footer', ticketFooter);
  }, [ticketFooter]);

  useEffect(() => {
    localStorage.setItem('ticket_terms', ticketTerms);
  }, [ticketTerms]);

  useEffect(() => {
    localStorage.setItem('show_dni_on_ticket', showDniOnTicket.toString());
  }, [showDniOnTicket]);

  useEffect(() => {
    localStorage.setItem('show_vat_on_ticket', showVatOnTicket.toString());
  }, [showVatOnTicket]);

  // VAT
  useEffect(() => {
    localStorage.setItem('default_vat', defaultVat.toString());
  }, [defaultVat]);

  useEffect(() => {
    localStorage.setItem('vat_included_in_prices', vatIncludedInPrices.toString());
  }, [vatIncludedInPrices]);

  // Hardware - Scanner
  useEffect(() => {
    localStorage.setItem('quick_scan_mode', quickScanMode.toString());
  }, [quickScanMode]);

  // Hardware - Printer
  useEffect(() => {
    localStorage.setItem('paper_width', paperWidth);
  }, [paperWidth]);

  useEffect(() => {
    localStorage.setItem('auto_print_on_payment', autoPrintOnPayment.toString());
  }, [autoPrintOnPayment]);

  useEffect(() => {
    localStorage.setItem('print_double_copy', printDoubleCopy.toString());
  }, [printDoubleCopy]);

  // Translation function
  const t = (key) => {
    return translations[language]?.[key] || translations['es'][key] || key;
  };

  // Calculate VAT amounts
  const calculateVat = (totalWithVat) => {
    if (vatIncludedInPrices) {
      const base = totalWithVat / (1 + defaultVat / 100);
      const vat = totalWithVat - base;
      return { base: base, vat: vat, total: totalWithVat };
    } else {
      const vat = totalWithVat * (defaultVat / 100);
      return { base: totalWithVat, vat: vat, total: totalWithVat + vat };
    }
  };

  const value = {
    // Basic
    darkMode, setDarkMode,
    language, setLanguage,
    autoPrint, setAutoPrint,
    t, translations,
    
    // Brand
    companyLogo, setCompanyLogo,
    
    // Ticket Design
    ticketHeader, setTicketHeader,
    ticketFooter, setTicketFooter,
    ticketTerms, setTicketTerms,
    showDniOnTicket, setShowDniOnTicket,
    showVatOnTicket, setShowVatOnTicket,
    
    // VAT
    defaultVat, setDefaultVat,
    vatIncludedInPrices, setVatIncludedInPrices,
    calculateVat,

    // Hardware
    quickScanMode, setQuickScanMode,
    paperWidth, setPaperWidth,
    autoPrintOnPayment, setAutoPrintOnPayment,
    printDoubleCopy, setPrintDoubleCopy,
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
