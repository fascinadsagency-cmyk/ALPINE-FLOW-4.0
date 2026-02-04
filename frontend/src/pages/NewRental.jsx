import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { customerApi, itemApi, tariffApi, rentalApi } from "@/lib/api";
import { printTicket, getStoredSettings } from "@/lib/ticketGenerator";
import { PrintService } from "@/lib/printService";
import { useSettings } from "@/contexts/SettingsContext";
import { useScannerListener } from "@/hooks/useScannerListener";
import { useCartPersistence } from "@/hooks/useCartPersistence";
import { FocusTrap } from "@/components/FocusTrap";
import { 
  Search, 
  User, 
  Package, 
  Trash2, 
  Plus,
  Check,
  Loader2,
  History,
  Barcode,
  RotateCcw,
  Calendar,
  Clock,
  ArrowRight,
  Edit2,
  X,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  CheckCircle,
  Printer,
  Eye,
  EyeOff,
  ChevronDown,
  Ruler,
  Scale,
  Mountain,
  Radio
} from "lucide-react";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "pending", label: "Pendiente" },
  { value: "online", label: "Reserva Online" },
  { value: "pago_online", label: "Pago Online" },
  { value: "other", label: "Otros" },
];

// Item types will be loaded from API
// Helper: Get smart start date based on time
const getSmartStartDate = () => {
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 15) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  return now.toISOString().split('T')[0];
};

const addDays = (dateStr, days) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days - 1);
  return date.toISOString().split('T')[0];
};

const calculateDaysBetween = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = endDate - startDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
};

const formatDateDisplay = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
};

export default function NewRental() {
  // Settings context for ticket configuration
  const settings = useSettings();
  
  // ============ PERSISTENT CART STATE ============
  // Este hook persiste el carrito en localStorage para que no se pierda al navegar
  const {
    isInitialized: cartInitialized,
    customer,
    customerHistory,
    items,
    detectedPacks,
    numDays,
    startDate,
    endDate,
    notes,
    discountType,
    discountValue,
    discountReason,
    setCustomer,
    setCustomerHistory,
    setItems,
    setDetectedPacks,
    setNumDays,
    setStartDate,
    setEndDate,
    setNotes,
    setDiscountType,
    setDiscountValue,
    setDiscountReason,
    clearCart,
    hasCartData
  } = useCartPersistence();
  
  // ============ NON-PERSISTENT STATE (UI/Transient) ============
  const [searchTerm, setSearchTerm] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [packs, setPacks] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  
  // Smart date system (showTimeHint is transient)
  const [showTimeHint, setShowTimeHint] = useState(true);
  
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [deposit, setDeposit] = useState("");
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ dni: "", name: "", phone: "", address: "", city: "", source: "" });
  
  // Item search modal
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [itemSearchType, setItemSearchType] = useState("all");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingItems, setSearchingItems] = useState(false);
  const [searchFilter, setSearchFilter] = useState(null); // For upselling suggestion filter
  const [packSuggestions, setPackSuggestions] = useState([]); // Smart upselling suggestions
  
  // Success dialog and printing
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [completedRental, setCompletedRental] = useState(null);
  
  // Payment modal (NEW)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethodSelected, setPaymentMethodSelected] = useState("cash");
  const [cashGiven, setCashGiven] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Auto cash opening modal (NEW)
  const [showAutoOpenCashDialog, setShowAutoOpenCashDialog] = useState(false);
  const [openingCashBalance, setOpeningCashBalance] = useState("");
  const [pendingPaymentData, setPendingPaymentData] = useState(null);
  
  // Price editing (transient UI state)
  const [editingItemPrice, setEditingItemPrice] = useState(null);
  const [editingItemDays, setEditingItemDays] = useState(null);
  const [editingPackPrice, setEditingPackPrice] = useState(null); // Moved here for scanner disable check
  
  // Customer technical data visibility toggle
  const [showCustomerTechData, setShowCustomerTechData] = useState(false);
  
  // Sources
  const [sources, setSources] = useState([]);
  
  // Item types from API
  const [itemTypes, setItemTypes] = useState([]);
  
  // ============ REFS PARA NAVEGACIÓN POR TECLADO ============
  const barcodeRef = useRef(null);      // Campo de código de barras
  const searchRef = useRef(null);       // Buscador de cliente
  const daysRef = useRef(null);         // Selector de días
  const customerSearchRef = useRef(null); // Input de búsqueda de cliente
  const submitRef = useRef(null);       // Botón de cobrar

  // Check if any cart item is being edited (to disable global scanner and Tab navigation)
  const isEditingCartItem = editingItemDays !== null || editingItemPrice !== null || editingPackPrice !== null;

  // Secuencia de navegación: Código -> Cliente -> Días -> Cobrar
  const focusNextField = useCallback((currentField) => {
    const sequence = {
      'barcode': customerSearchRef,
      'customer': daysRef,
      'days': submitRef,
      'submit': barcodeRef
    };
    const nextRef = sequence[currentField];
    if (nextRef?.current) {
      nextRef.current.focus();
      if (nextRef.current.select) nextRef.current.select();
    }
  }, []);

  const focusPrevField = useCallback((currentField) => {
    const sequence = {
      'customer': barcodeRef,
      'days': customerSearchRef,
      'submit': daysRef,
      'barcode': submitRef
    };
    const prevRef = sequence[currentField];
    if (prevRef?.current) {
      prevRef.current.focus();
      if (prevRef.current.select) prevRef.current.select();
    }
  }, []);

  // ============ GLOBAL SCANNER LISTENER (HID BARCODE READER) ============
  // Captura entrada de lectores HID como Netum NT-1698W cuando el cursor no está en un input
  const handleGlobalScan = useCallback(async (scannedCode) => {
    console.log('[SCANNER] Global scan detected in NewRental:', scannedCode);
    
    // Set the barcode input for visual feedback
    setBarcodeInput(scannedCode);
    
    // Process the scanned code (add item to rental)
    try {
      const response = await itemApi.getByBarcode(scannedCode);
      const item = response.data;
      
      if (item.status !== 'available') {
        toast.error(`Artículo no disponible (${item.status})`);
        setBarcodeInput("");
        return;
      }
      
      if (items.find(i => i.barcode === item.barcode)) {
        toast.error("Artículo ya añadido");
        setBarcodeInput("");
        return;
      }
      
      setItems(prev => [...prev, { ...item, customPrice: null, itemDays: numDays }]);
      toast.success(`${item.brand} ${item.model} añadido`);
      setBarcodeInput("");
    } catch (error) {
      toast.error("Artículo no encontrado");
      setBarcodeInput("");
    }
  }, [items, numDays]);
  
  const { isScanning: globalScannerActive, forceFocus: focusBarcodeField } = useScannerListener({
    onScan: handleGlobalScan,
    inputRef: barcodeRef,
    // IMPORTANT: Disable scanner when editing cart items to prevent interference
    enabled: !showItemSearch && !showNewCustomer && !showPaymentDialog && !showSuccessDialog && !isEditingCartItem,
    minLength: 3,
    maxTimeBetweenKeys: 50,
    scannerDetectionThreshold: 4,
    autoFocus: !isEditingCartItem, // Don't auto-focus when editing
  });

  useEffect(() => {
    loadTariffs();
    loadSources();
    loadPacks();
    loadItemTypes();
    const timer = setTimeout(() => setShowTimeHint(false), 5000);
    
    // AUTO-FOCUS: Focus barcode input on page load (for barcode scanner)
    setTimeout(() => {
      if (barcodeRef.current) {
        barcodeRef.current.focus();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // AUTO-FOCUS after customer selection: Move focus to barcode input
  useEffect(() => {
    if (customer) {
      // Small delay to let customer card render, then focus barcode
      setTimeout(() => {
        if (barcodeRef.current) {
          barcodeRef.current.focus();
          barcodeRef.current.select();
        }
      }, 300);
    }
  }, [customer]);

  // AUTO-COMBO: Detect packs whenever items change
  useEffect(() => {
    const detected = detectPacks(items);
    setDetectedPacks(detected);
    // Silent detection - no toasts or interruptions
  }, [items, packs, numDays]);

  // Keyboard shortcut for item search (F3 or Alt+B)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F3' || (e.altKey && e.key === 'b')) {
        e.preventDefault();
        setShowItemSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadTariffs = async () => {
    try {
      const response = await tariffApi.getAll();
      setTariffs(response.data);
    } catch (error) {
      console.error("Error loading tariffs:", error);
    }
  };

  const loadSources = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/sources`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSources(data);
      }
    } catch (error) {
      console.log("Sources not loaded");
    }
  };

  const loadPacks = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/packs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPacks(data);
      }
    } catch (error) {
      console.log("Packs not loaded");
    }
  };

  const loadItemTypes = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/item-types`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setItemTypes([{ value: "all", label: "Todos" }, ...data.map(t => ({ value: t.value, label: t.label }))]);
      }
    } catch (error) {
      console.log("Item types not loaded");
      setItemTypes([{ value: "all", label: "Todos" }]);
    }
  };

  // AUTO-COMBO: Detect packs formed by current items
  const detectPacks = (currentItems) => {
    if (!packs || packs.length === 0 || currentItems.length === 0) {
      return [];
    }

    const detected = [];
    
    // Create a copy of items to track which ones are used
    const availableItems = [...currentItems];
    
    // Group items by category
    const itemsByCategory = currentItems.reduce((acc, item) => {
      const cat = item.category || 'MEDIA';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    // For each category, detect ALL possible pack instances
    Object.entries(itemsByCategory).forEach(([category, categoryItems]) => {
      // Get packs for this category
      const categoryPacks = packs.filter(p => p.category === category);
      
      // Track which items have been assigned to packs
      const usedBarcodes = new Set();
      
      // Keep trying to form packs until no more can be formed
      let foundPack = true;
      while (foundPack) {
        foundPack = false;
        
        // Try each pack definition
        for (const pack of categoryPacks) {
          // Get available items (not yet used in a pack)
          const availableCategoryItems = categoryItems.filter(
            item => !usedBarcodes.has(item.barcode)
          );
          
          // Count available item types
          const availableTypeCounts = availableCategoryItems.reduce((acc, item) => {
            acc[item.item_type] = (acc[item.item_type] || 0) + 1;
            return acc;
          }, {});
          
          // Count required components for this pack
          const requiredComponents = pack.items.reduce((acc, itemType) => {
            acc[itemType] = (acc[itemType] || 0) + 1;
            return acc;
          }, {});

          // Check if we have all components available
          let canFormPack = true;
          for (const [type, count] of Object.entries(requiredComponents)) {
            if ((availableTypeCounts[type] || 0) < count) {
              canFormPack = false;
              break;
            }
          }

          if (canFormPack) {
            // Find the specific items that will form THIS instance of the pack
            const packInstanceItems = [];
            
            for (const requiredType of pack.items) {
              const item = availableCategoryItems.find(i => 
                i.item_type === requiredType && 
                !packInstanceItems.includes(i.barcode) &&
                !usedBarcodes.has(i.barcode)
              );
              if (item) {
                packInstanceItems.push(item.barcode);
                usedBarcodes.add(item.barcode);
              }
            }

            if (packInstanceItems.length === pack.items.length) {
              // Generate unique instance ID for this pack
              const instanceId = `pack-instance-${Date.now()}-${detected.length}`;
              
              detected.push({
                pack: pack,
                items: packInstanceItems,
                category: category,
                instanceId: instanceId  // Unique ID for this specific pack instance
              });
              
              foundPack = true;
              break; // Start over to check for more packs
            }
          }
        }
      }
    });

    return detected;
  };

  // SMART UPSELLING: Detect partial packs (when missing components to complete a pack)
  const detectPartialPacks = (currentItems) => {
    if (!packs || packs.length === 0 || currentItems.length === 0) {
      return [];
    }

    const suggestions = [];
    
    // Group items by category
    const itemsByCategory = currentItems.reduce((acc, item) => {
      const cat = item.category || 'MEDIA';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    // For each category with items, check if we can form a pack by adding more items
    Object.entries(itemsByCategory).forEach(([category, categoryItems]) => {
      // Count item types in this category
      const itemTypeCounts = categoryItems.reduce((acc, item) => {
        acc[item.item_type] = (acc[item.item_type] || 0) + 1;
        return acc;
      }, {});

      // Check each pack of this category
      const categoryPacks = packs.filter(p => p.category === category);
      
      categoryPacks.forEach(pack => {
        // Count required components for this pack
        const requiredComponents = pack.items.reduce((acc, itemType) => {
          acc[itemType] = (acc[itemType] || 0) + 1;
          return acc;
        }, {});

        // Find what's missing
        const missingItems = [];
        let hasAtLeastOne = false;
        let canComplete = true;

        for (const [type, requiredCount] of Object.entries(requiredComponents)) {
          const currentCount = itemTypeCounts[type] || 0;
          if (currentCount > 0) {
            hasAtLeastOne = true;
          }
          if (currentCount < requiredCount) {
            for (let i = 0; i < (requiredCount - currentCount); i++) {
              missingItems.push(type);
            }
          }
        }

        // Only suggest if we have at least one component but not all
        if (hasAtLeastOne && missingItems.length > 0 && missingItems.length < pack.items.length) {
          // Calculate individual prices for current items
          const currentItemsPrice = categoryItems.reduce((sum, item) => {
            return sum + getItemPrice(item);
          }, 0);

          // Calculate what we'd pay if we completed the pack
          const packPrice = getPackPrice(pack);
          
          // Estimate individual price for missing items (average)
          const avgMissingPrice = currentItemsPrice / categoryItems.length;
          const estimatedTotalWithoutPack = currentItemsPrice + (avgMissingPrice * missingItems.length);
          
          // Calculate potential savings
          const potentialSavings = estimatedTotalWithoutPack - packPrice;

          if (potentialSavings > 0) {
            suggestions.push({
              pack: pack,
              category: category,
              missingItems: [...new Set(missingItems)], // Unique missing types
              missingCount: missingItems.length,
              currentItems: categoryItems.map(i => i.item_type),
              packPrice: packPrice,
              potentialSavings: potentialSavings,
              packName: pack.name
            });
          }
        }
      });
    });

    // Return only the best suggestion per category (highest savings)
    const bestByCategory = {};
    suggestions.forEach(s => {
      if (!bestByCategory[s.category] || s.potentialSavings > bestByCategory[s.category].potentialSavings) {
        bestByCategory[s.category] = s;
      }
    });

    return Object.values(bestByCategory);
  };

  // Update suggestions when items change
  useEffect(() => {
    if (items.length > 0 && packs.length > 0) {
      const suggestions = detectPartialPacks(items);
      setPackSuggestions(suggestions);
    } else {
      setPackSuggestions([]);
    }
  }, [items, packs, numDays]);

  // Open item search with pre-filter for missing item
  const openSearchForMissingItem = (itemType, category) => {
    setItemSearchType(itemType);
    setItemSearchCategory(category);
    setSearchFilter({ type: itemType, category: category });
    setShowItemSearch(true);
  };

  // AUTO-COMBO: Calculate price with pack detection
  const getItemPriceWithPack = (item) => {
    // Check if this item is part of a detected pack
    for (const detectedPack of detectedPacks) {
      if (detectedPack.items.includes(item.barcode)) {
        // This item is part of a pack - use pack's specific days
        const packDays = detectedPack.items[0]?.itemDays || numDays;
        const packPrice = getPackPrice(detectedPack.pack, packDays);
        // Divide pack price equally among components
        return packPrice / detectedPack.pack.items.length;
      }
    }

    // Not part of a pack, use individual pricing
    return getItemPrice(item);
  };

  const getPackPrice = (pack, days = null) => {
    // Use provided days or fall back to global numDays
    const targetDays = days !== null ? days : numDays;
    
    if (targetDays <= 10 && pack[`day_${targetDays}`]) {
      return pack[`day_${targetDays}`];
    }
    if (targetDays > 10 && pack.day_11_plus) {
      return pack.day_11_plus;
    }
    // Fallback to day_1 if available
    return pack.day_1 || 0;
  };

  // Smart date handlers
  const handleNumDaysChange = (value) => {
    const days = Math.max(1, parseInt(value) || 1);
    const previousDays = numDays;
    setNumDays(days);
    setEndDate(addDays(startDate, days));
    
    // UPDATE ALL ITEMS IN CART that haven't been manually edited
    // Items where itemDays equals the previous global value get updated
    if (items.length > 0) {
      setItems(items.map(item => {
        // If item's days match the previous global value, update it
        // This means it wasn't manually edited
        if (item.itemDays === previousDays || !item.manualDaysEdit) {
          return { ...item, itemDays: days };
        }
        // Keep manually edited items unchanged
        return item;
      }));
      toast.info(`Duración actualizada a ${days} día${days !== 1 ? 's' : ''} para todos los artículos`);
    }
    
    if (days > 30) {
      toast.info("Alquiler de larga duración: " + days + " días");
    }
  };

  const handleStartDateChange = (value) => {
    setStartDate(value);
    setEndDate(addDays(value, numDays));
  };

  const handleEndDateChange = (value) => {
    setEndDate(value);
    const calculatedDays = calculateDaysBetween(startDate, value);
    setNumDays(calculatedDays);
  };

  const handleDaysKeyDown = (e) => {
    if (e.key === 'Enter' && barcodeRef.current) {
      e.preventDefault();
      barcodeRef.current.focus();
    }
  };

  const getTimeHintMessage = () => {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hour}:${minutes}h`;
    
    if (hour >= 15) {
      return `Inicio mañana porque son las ${timeStr}`;
    }
    return `Inicio hoy porque son las ${timeStr}`;
  };

  const searchCustomer = async () => {
    if (!searchTerm.trim()) return;
    
    setSearchLoading(true);
    try {
      try {
        const response = await customerApi.getByDni(searchTerm);
        selectCustomer(response.data);
        toast.success(`Cliente encontrado: ${response.data.name}`);
        return;
      } catch (e) {
        // Customer not found by DNI, try general search
      }
      
      const response = await customerApi.getAll(searchTerm);
      if (response.data.length === 1) {
        selectCustomer(response.data[0]);
        toast.success(`Cliente encontrado: ${response.data[0].name}`);
      } else if (response.data.length > 1) {
        toast.info("Múltiples clientes encontrados. Sé más específico.");
      } else {
        setNewCustomer({ ...newCustomer, dni: searchTerm.toUpperCase() });
        setShowNewCustomer(true);
      }
    } catch (error) {
      setNewCustomer({ ...newCustomer, dni: searchTerm.toUpperCase() });
      setShowNewCustomer(true);
    } finally {
      setSearchLoading(false);
    }
  };

  // NEW: Predictive search (real-time)
  const searchCustomersRealTime = async (query) => {
    if (!query || query.trim().length < 2) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    try {
      const response = await customerApi.getAll(query.trim());
      setCustomerSuggestions(response.data.slice(0, 8)); // Limit to 8 suggestions
      setShowSuggestions(response.data.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // NEW: Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomersRealTime(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // NEW: Select customer from suggestions
  const selectCustomer = async (selectedCustomer) => {
    setCustomer(selectedCustomer);
    setSearchTerm("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setShowCustomerTechData(false); // Reset tech data visibility
    
    // Load history with alerts
    try {
      const response = await customerApi.getHistory(selectedCustomer.id);
      setCustomerHistory(response.data);
      
      // Show alert if customer has overdue rentals
      if (response.data.has_alerts && response.data.overdue_rentals > 0) {
        toast.warning(`⚠️ ALERTA: Este cliente tiene ${response.data.overdue_rentals} alquiler(es) vencido(s)`, {
          duration: 5000
        });
      }
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  // NEW: Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || customerSuggestions.length === 0) {
      if (e.key === 'Enter') {
        searchCustomer();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < customerSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < customerSuggestions.length) {
          selectCustomer(customerSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const loadCustomerHistory = async (customerId) => {
    try {
      const response = await customerApi.getHistory(customerId);
      setCustomerHistory(response.data);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const createNewCustomer = async () => {
    if (!newCustomer.dni || !newCustomer.name) {
      toast.error("DNI y nombre son obligatorios");
      return;
    }
    
    try {
      const response = await customerApi.create(newCustomer);
      setCustomer(response.data);
      setShowNewCustomer(false);
      setNewCustomer({ dni: "", name: "", phone: "", address: "", city: "", source: "" });
      toast.success("Cliente creado correctamente");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear cliente");
    }
  };

  // Item search functions
  const searchItems = async () => {
    setSearchingItems(true);
    try {
      const params = new URLSearchParams();
      params.append('status', 'available');
      if (itemSearchTerm) params.append('search', itemSearchTerm);
      if (itemSearchType && itemSearchType !== 'all') params.append('item_type', itemSearchType);
      
      const response = await itemApi.getAll({
        status: 'available',
        search: itemSearchTerm || undefined,
        item_type: (itemSearchType && itemSearchType !== 'all') ? itemSearchType : undefined
      });
      
      // Filter out already added items
      const addedBarcodes = items.map(i => i.barcode);
      setSearchResults(response.data.filter(i => !addedBarcodes.includes(i.barcode)));
    } catch (error) {
      toast.error("Error al buscar artículos");
    } finally {
      setSearchingItems(false);
    }
  };

  useEffect(() => {
    if (showItemSearch) {
      searchItems();
    }
  }, [showItemSearch, itemSearchTerm, itemSearchType]);

  const addItemFromSearch = (item) => {
    setItems([...items, { ...item, customPrice: null, itemDays: numDays }]);
    toast.success(`${item.brand} ${item.model} añadido`);
    // Update search results
    setSearchResults(searchResults.filter(i => i.barcode !== item.barcode));
    // Auto-focus barcode for next scan
    refocusBarcodeInput();
  };

  const addItemByBarcode = async (e) => {
    if (e.key !== 'Enter' || !barcodeInput.trim()) return;
    
    try {
      const response = await itemApi.getByBarcode(barcodeInput);
      const item = response.data;
      
      if (item.status !== 'available') {
        toast.error(`Artículo no disponible (${item.status})`);
        setBarcodeInput("");
        refocusBarcodeInput();
        return;
      }
      
      if (items.find(i => i.barcode === item.barcode)) {
        toast.error("Artículo ya añadido");
        setBarcodeInput("");
        refocusBarcodeInput();
        return;
      }
      
      setItems([...items, { ...item, customPrice: null, itemDays: numDays }]);
      toast.success(`${item.brand} ${item.model} añadido`);
      setBarcodeInput("");
      refocusBarcodeInput();
    } catch (error) {
      toast.error("Artículo no encontrado");
      setBarcodeInput("");
      refocusBarcodeInput();
    }
  };

  // HELPER: Re-focus barcode input with text selection (for barcode scanner optimization)
  const refocusBarcodeInput = () => {
    setTimeout(() => {
      if (barcodeRef.current) {
        barcodeRef.current.focus();
        barcodeRef.current.select(); // Select all text so next scan overwrites
      }
    }, 50);
  };

  // BORRADO EN CASCADA: Eliminar un pack completo con todos sus componentes
  const removePackComplete = (packItems) => {
    // Crear set de IDs de todos los items del pack
    const packItemIds = new Set(packItems.map(i => i.id || i.barcode));
    // Filtrar el carrito eliminando todos los items del pack
    setItems(prevItems => prevItems.filter(item => !packItemIds.has(item.id || item.barcode)));
  };

  // Eliminar un item - Si es parte de pack, elimina todo el pack
  const removeItem = (itemId) => {
    // Verificar si el item es parte de un pack detectado
    const itemBarcode = items.find(i => (i.id || i.barcode) === itemId)?.barcode;
    
    for (const dp of detectedPacks) {
      if (dp.items.includes(itemId) || dp.items.includes(itemBarcode)) {
        // El item es parte de un pack - BORRADO EN CASCADA
        // Obtener todos los items del pack
        const packItemObjects = items.filter(item => 
          dp.items.includes(item.barcode) || dp.items.includes(item.id)
        );
        removePackComplete(packItemObjects);
        toast.info(`Pack "${dp.pack.name}" eliminado completamente`);
        return;
      }
    }
    
    // No es parte de ningún pack - eliminar solo este item
    setItems(items.filter(i => (i.id || i.barcode) !== itemId));
  };

  // Update item days (marks as manually edited)
  const updateItemDays = (itemId, newDays) => {
    // Validate: only positive integers allowed
    const days = parseInt(newDays);
    if (isNaN(days) || days < 1) {
      toast.error("Los días deben ser un número positivo");
      setEditingItemDays(null);
      return;
    }
    setItems(items.map(item => 
      (item.id || item.barcode) === itemId 
        ? { ...item, itemDays: days, manualDaysEdit: true }
        : item
    ));
    setEditingItemDays(null);
  };

  // QUICK ADD: Configuración estricta - Solo 3 productos genéricos
  const QUICK_ADD_CONFIG = [
    { key: 'cascos', label: 'Cascos', genericName: 'Casco Genérico', type: 'helmet' },
    { key: 'bastones', label: 'Bastones', genericName: 'Bastones Genéricos', type: 'poles' },
    { key: 'mascara', label: 'Máscara', genericName: 'Máscara Genérica', type: 'goggles' }
  ];

  const quickAddGeneric = async (config) => {
    try {
      // Buscar artículo genérico existente por nombre o tipo
      const response = await itemApi.getAll({ item_type: config.type });
      let genericItem = response.data.find(i => i.is_generic && i.stock_available > 0);
      
      // Si no existe, crear automáticamente
      if (!genericItem) {
        const createResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            is_generic: true,
            name: config.genericName,
            item_type: config.type,
            stock_total: 100,
            rental_price: 5.00
          })
        });
        if (createResponse.ok) {
          genericItem = await createResponse.json();
          toast.info(`${config.genericName} creado automáticamente`);
        } else {
          toast.error(`No se pudo crear ${config.genericName}`);
          return;
        }
      }
      
      // Verificar stock disponible
      if (genericItem.stock_available < 1) {
        toast.error(`No hay ${config.label} disponibles`);
        return;
      }

      // Buscar si ya está en el carrito
      const existingIndex = items.findIndex(i => i.id === genericItem.id);
      
      if (existingIndex >= 0) {
        // Incrementar cantidad
        const updatedItems = [...items];
        const currentQty = updatedItems[existingIndex].quantity || 1;
        if (currentQty < genericItem.stock_available) {
          updatedItems[existingIndex] = { 
            ...updatedItems[existingIndex], 
            quantity: currentQty + 1 
          };
          setItems(updatedItems);
          toast.success(`${config.label}: ${currentQty + 1} unidades`);
        } else {
          toast.error(`Stock máximo alcanzado para ${config.label}`);
        }
      } else {
        // Añadir nuevo con cantidad 1 y días por defecto
        setItems([...items, { 
          ...genericItem, 
          quantity: 1, 
          customPrice: null,
          itemDays: numDays
        }]);
        toast.success(`${config.label} añadido`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Error al añadir ${config.label}`);
    }
  };

  const getItemPrice = (item) => {
    // Para artículos genéricos, usar rental_price
    if (item.is_generic && item.rental_price) {
      return item.rental_price;
    }
    
    if (item.customPrice !== null && item.customPrice !== undefined) {
      return item.customPrice;
    }
    
    const tariff = tariffs.find(t => t.item_type === item.item_type);
    if (!tariff) {
      // Sin tarifa configurada - retornar 0 (se mostrará alerta en UI)
      return 0;
    }
    
    // Usar exclusivamente precios diarios (day_1 a day_10, luego day_11_plus)
    if (numDays <= 10) {
      const dayPrice = tariff[`day_${numDays}`];
      if (dayPrice !== null && dayPrice !== undefined && dayPrice > 0) {
        return dayPrice;
      }
    } else if (tariff.day_11_plus !== null && tariff.day_11_plus !== undefined && tariff.day_11_plus > 0) {
      return tariff.day_11_plus;
    }
    
    // Sin precio configurado para estos días - retornar 0
    return 0;
  };

  // Verifica si un artículo tiene tarifa configurada
  const itemHasTariff = (item) => {
    if (item.is_generic && item.rental_price) return true;
    if (item.customPrice !== null && item.customPrice !== undefined) return true;
    const tariff = tariffs.find(t => t.item_type === item.item_type);
    if (!tariff) return false;
    // Verificar que tenga al menos un precio diario
    for (let i = 1; i <= 10; i++) {
      if (tariff[`day_${i}`] > 0) return true;
    }
    return tariff.day_11_plus > 0;
  };

  // Group items by detected packs for unified display
  // PASO 1: Consolidación - Fusionar códigos de hijos en el nombre del padre
  // PASO 2: Filtrado - Solo devolver packs (padres) y items sueltos, NUNCA hijos
  const getGroupedCartItems = () => {
    if (detectedPacks.length === 0) {
      // No packs - return items as individual entries
      return items.map(item => ({
        type: 'single',
        item: item,
        items: [item],
        price: item.customPrice !== null ? item.customPrice : getItemPriceFromTariff(item),
        days: item.itemDays || numDays
      }));
    }

    // PASO 2: Create a set of item IDs that are HIJOS (components of packs)
    // These will be EXCLUDED from the visual list
    // CRITICAL: Add BOTH barcode AND id to ensure filtering works
    const packItemIds = new Set();
    detectedPacks.forEach(dp => {
      // Add all barcodes from the detected pack
      dp.items.forEach(itemBarcode => packItemIds.add(itemBarcode));
      
      // Also add the actual item IDs from the items array
      items.forEach(item => {
        if (dp.items.includes(item.barcode) || dp.items.includes(item.id)) {
          packItemIds.add(item.id);
          packItemIds.add(item.barcode);
        }
      });
    });

    const groups = [];

    // Add detected packs as CONSOLIDATED groups (PADRES)
    // Each detected pack has a unique instanceId for multi-pack support
    detectedPacks.forEach((dp) => {
      // Get the actual item objects for THIS SPECIFIC pack instance
      const packItemObjects = items.filter(item => 
        dp.items.includes(item.barcode) || dp.items.includes(item.id)
      );
      
      // Use the first item's days as the pack days
      const packDays = packItemObjects[0]?.itemDays || numDays;
      
      // CRITICAL: Get pack price - check for custom price first
      const firstPackItem = packItemObjects[0];
      const customPackPrice = firstPackItem?.customPackPrice;
      const basePackPrice = getPackPrice(dp.pack, packDays);
      const packPrice = customPackPrice !== null && customPackPrice !== undefined 
        ? customPackPrice 
        : basePackPrice;
      const isPackPriceEdited = customPackPrice !== null && customPackPrice !== undefined;
      
      // PASO 1: CONSOLIDACIÓN - Extraer códigos de los HIJOS y fusionarlos en el nombre
      const childCodes = packItemObjects.map(item => 
        item.internal_code || item.barcode?.substring(0, 10) || 'N/A'
      ).join(' / ');
      
      // Crear nombre fusionado: "Pack Gama Media (SKI-001 / BOT-204)"
      const fusedName = `${dp.pack.name} (${childCodes})`;
      
      groups.push({
        type: 'pack',
        pack: dp.pack,
        fusedName: fusedName,  // Nombre con códigos de hijos incrustados
        childCodes: childCodes,
        items: packItemObjects,  // Solo para referencia interna, NO para renderizar filas
        price: packPrice,  // Precio TOTAL del pack (puede ser personalizado)
        basePrice: basePackPrice,  // Precio original sin editar
        isEdited: isPackPriceEdited,  // Flag para mostrar "EDITADO"
        days: packDays,
        packId: dp.instanceId || `pack-${Date.now()}`  // Use unique instance ID
      });
    });

    // PASO 2: Add ONLY items that are NOT part of any pack (items sueltos)
    // CONDICIÓN DE BLOQUEO: Si el item es componente de pack, NO renderizar
    items.forEach(item => {
      const itemId = item.id || item.barcode;
      const itemBarcode = item.barcode;
      
      // BLOQUEO: Si el item es HIJO de un pack, SALTARSE (no añadir)
      if (packItemIds.has(itemId) || packItemIds.has(itemBarcode)) {
        return; // CONTINUE - No generar entrada para este item
      }
      
      // Solo llegamos aquí si el item NO es parte de ningún pack
      const basePrice = getItemPriceFromTariff(item);
      const customPrice = item.customPrice;
      const finalPrice = customPrice !== null && customPrice !== undefined ? customPrice : basePrice;
      const isEdited = customPrice !== null && customPrice !== undefined;
      
      groups.push({
        type: 'single',
        item: item,
        items: [item],
        price: finalPrice,
        basePrice: basePrice,
        isEdited: isEdited,
        days: item.itemDays || numDays
      });
    });

    return groups;
  };

  // Get TOTAL price from tariff for an item (LOOK-UP escalonado, NO multiplicación)
  const getItemPriceFromTariff = (item) => {
    // Si tiene precio personalizado, usarlo
    if (item.customPrice !== null && item.customPrice !== undefined) return item.customPrice;
    
    // Buscar tarifa del tipo de artículo
    const tariff = tariffs.find(t => t.item_type === item.item_type);
    if (!tariff) return item.rental_price || 0;
    
    // LOOK-UP: Buscar el precio TOTAL para X días (NO es precio/día)
    const days = item.itemDays || numDays;
    const dayField = days <= 10 ? `day_${days}` : 'day_11_plus';
    return tariff[dayField] || tariff.day_1 || 0;
  };

  // Update days for all items in a pack - RECALCULATE pack price using scaled tariff
  const updatePackDays = (packItems, newDays, keepCustomPrice = false) => {
    // Validate: only positive integers allowed
    const days = parseInt(newDays);
    if (isNaN(days) || days < 1) {
      toast.error("Los días del pack deben ser un número positivo");
      setEditingItemDays(null);
      return;
    }
    
    const packItemIds = new Set(packItems.map(i => i.id || i.barcode));
    
    // Get the first item to check if price was manually edited
    const firstItem = packItems[0];
    const wasManuallyEdited = firstItem?.manualPriceEdit === true;
    
    setItems(items.map(item => {
      const itemId = item.id || item.barcode;
      if (packItemIds.has(itemId)) {
        const isFirstItem = (item.id || item.barcode) === (firstItem?.id || firstItem?.barcode);
        
        // CRITICAL: Only clear customPackPrice if:
        // 1. It wasn't manually edited by user (not keepCustomPrice)
        // 2. OR if explicitly told to recalculate (!keepCustomPrice)
        // This ensures the price is recalculated from the tariff table
        const updatedItem = { 
          ...item, 
          itemDays: days, 
          manualDaysEdit: true 
        };
        
        // Clear customPackPrice on first item so getGroupedCartItems will recalculate
        // ONLY if the price was NOT manually edited
        if (isFirstItem && !wasManuallyEdited && !keepCustomPrice) {
          updatedItem.customPackPrice = null;
          updatedItem.manualPriceEdit = false;
        }
        
        return updatedItem;
      }
      return item;
    }));
    
    setEditingItemDays(null);
    
    // Provide feedback about the recalculation
    if (!wasManuallyEdited) {
      toast.success(`Duración del pack actualizada a ${days} día${days !== 1 ? 's' : ''} - Precio recalculado`);
    } else {
      toast.info(`Duración del pack actualizada a ${days} día${days !== 1 ? 's' : ''} - Precio manual mantenido`);
    }
  };

  // Calcula el precio total de un item (precio unitario * cantidad * días)
  // Get total price for an item - TARIFA ESCALONADA (sin multiplicación por días)
  const getItemTotalPrice = (item) => {
    const totalPrice = getItemPriceWithPack(item);  // Ya es precio total escalonado
    const qty = item.quantity || 1;
    return totalPrice * qty;  // Solo multiplicar por cantidad, NO por días
  };

  // Calculate subtotal using grouped items - TARIFAS ESCALONADAS (sin multiplicación)
  const calculateSubtotal = () => {
    const groups = getGroupedCartItems();
    return groups.reduce((sum, group) => {
      if (group.type === 'pack') {
        // PACK: price es el TOTAL escalonado para los días seleccionados
        return sum + group.price;
      } else {
        const item = group.item;
        const qty = item.quantity || 1;
        // SINGLE ITEM: price ya es el TOTAL escalonado (look-up), solo multiplicar por cantidad
        // NO multiplicar por días - el precio ya incluye los días
        return sum + (group.price * qty);
      }
    }, 0);
  };

  const getProviderDiscount = () => {
    if (!customer?.source) return 0;
    const provider = sources.find(s => s.name === customer.source);
    return provider?.discount_percent || 0;
  };

  // Actualizar precio personalizado de un item individual
  const updateItemPrice = (itemId, newPrice) => {
    // Validate: only non-negative numbers allowed
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      toast.error("El precio debe ser un número positivo o cero");
      setEditingItemPrice(null);
      return;
    }
    setItems(items.map(item => {
      if ((item.id || item.barcode) === itemId) {
        return { ...item, customPrice: price };
      }
      return item;
    }));
    setEditingItemPrice(null);
  };

  // Actualizar precio de un pack completo (se guarda en el primer item del pack)
  // Marca manualPriceEdit = true para que updatePackDays no resetee el precio
  const updatePackPrice = (packItems, newPrice) => {
    // Validate: only non-negative numbers allowed
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      toast.error("El precio del pack debe ser un número positivo o cero");
      setEditingPackPrice(null);
      return;
    }
    const packItemIds = new Set(packItems.map(i => i.id || i.barcode));
    
    // Guardamos el precio del pack en el primer item como customPackPrice
    // Y marcamos manualPriceEdit = true para preservar en cambios de días
    setItems(items.map((item, idx) => {
      const itemId = item.id || item.barcode;
      if (packItemIds.has(itemId)) {
        // Solo el primer item del pack guarda el precio personalizado
        const isFirstPackItem = items.findIndex(i => packItemIds.has(i.id || i.barcode)) === idx;
        if (isFirstPackItem) {
          return { 
            ...item, 
            customPackPrice: isNaN(price) ? null : price,
            manualPriceEdit: true  // Mark as manually edited to preserve on days change
          };
        }
      }
      return item;
    }));
    
    setEditingPackPrice(null);
    toast.success("Precio del pack actualizado manualmente");
  };

  // Resetear precio del pack a la tarifa original (elimina edición manual)
  const resetPackPrice = (packItems) => {
    const packItemIds = new Set(packItems.map(i => i.id || i.barcode));
    
    setItems(items.map((item, idx) => {
      const itemId = item.id || item.barcode;
      if (packItemIds.has(itemId)) {
        const isFirstPackItem = items.findIndex(i => packItemIds.has(i.id || i.barcode)) === idx;
        if (isFirstPackItem) {
          // Clear custom price and manual edit flag
          return { 
            ...item, 
            customPackPrice: null,
            manualPriceEdit: false
          };
        }
      }
      return item;
    }));
    
    toast.success("Precio del pack restaurado a tarifa");
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    let total = subtotal;
    
    // Apply provider discount first
    const providerDiscount = getProviderDiscount();
    if (providerDiscount > 0) {
      total = total - (total * (providerDiscount / 100));
    }
    
    // Then apply manual discount if any
    if (discountType === 'percent' && discountValue) {
      const discount = total * (parseFloat(discountValue) / 100);
      total = total - discount;
    }
    if (discountType === 'fixed' && discountValue) {
      total = total - parseFloat(discountValue);
    }
    
    return total;
  };

  const completeRental = async () => {
    if (!customer) {
      toast.error("Selecciona un cliente");
      return;
    }
    if (items.length === 0) {
      toast.error("Añade al menos un artículo");
      return;
    }
    
    // Instead of completing immediately, open payment dialog
    setShowPaymentDialog(true);
  };

  const processPaymentAndCompleteRental = async () => {
    if (!paymentMethodSelected) {
      toast.error("Selecciona un método de pago");
      return;
    }

    // Validate cash payment
    if (paymentMethodSelected === "cash" && !cashGiven) {
      toast.error("Introduce el efectivo entregado");
      return;
    }

    const total = Number(calculateTotal().toFixed(2));
    const cashGivenAmount = Number(parseFloat(cashGiven) || 0);

    if (paymentMethodSelected === "cash" && cashGivenAmount < total) {
      toast.error(`El efectivo entregado (€${cashGivenAmount.toFixed(2)}) es menor que el total (€${total.toFixed(2)})`);
      return;
    }

    setProcessingPayment(true);
    
    const API = process.env.REACT_APP_BACKEND_URL;
    
    // === VERIFICACIÓN SIMPLE DE CAJA (sin abrir automáticamente) ===
    try {
      const sessionCheck = await fetch(`${API}/api/cash/sessions/active`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!sessionCheck.ok) {
        toast.warning("⚠️ Debe abrir la caja en el módulo de CAJA antes de procesar este alquiler.");
        setProcessingPayment(false);
        return;
      }
      
      const sessionText = await sessionCheck.text();
      if (!sessionText || sessionText.trim().startsWith('<') || !JSON.parse(sessionText)?.id) {
        toast.warning("⚠️ Debe abrir la caja en el módulo de CAJA antes de procesar este alquiler.");
        setProcessingPayment(false);
        return;
      }
    } catch (e) {
      // Si falla la verificación, continuar igual (no bloquear)
      console.log("No se pudo verificar caja, continuando...");
    }
    
    // === ENVÍO SIMPLE DEL ALQUILER ===
    try {
      const cleanTotal = Number(total.toFixed(2));
      const cleanDeposit = Number(parseFloat(deposit) || 0);
      const paid = paymentMethodSelected !== 'pending' ? cleanTotal : 0;
      
      const itemsToSend = items.map(i => ({
        barcode: String(i.barcode || i.id || ''),
        person_name: "",
        is_generic: i.is_generic || false,
        quantity: Number(i.quantity || 1),
        unit_price: Number(i.rental_price || getItemPriceWithPack(i) || 0)
      }));
      
      const rentalResponse = await fetch(`${API}/api/rentals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          customer_id: customer?.id || null,
          start_date: startDate,
          end_date: endDate,
          items: itemsToSend,
          payment_method: paymentMethodSelected || 'cash',
          total_amount: cleanTotal,
          paid_amount: Number(paid.toFixed(2)),
          deposit: cleanDeposit,
          notes: notes || ''
        })
      });
      
      const responseText = await rentalResponse.text();
      
      // Si devuelve HTML o error, redirigir a lista de alquileres
      if (!responseText || responseText.trim().startsWith('<')) {
        toast.info("Verificando alquiler... Redirigiendo a la lista.");
        setShowPaymentDialog(false);
        setTimeout(() => window.location.href = '/rentals', 1500);
        return;
      }
      
      if (!rentalResponse.ok) {
        const errorData = JSON.parse(responseText);
        toast.error(errorData.detail || 'Error al crear alquiler');
        setProcessingPayment(false);
        return;
      }
      
      const rentalData = JSON.parse(responseText);
      
      // === ÉXITO ===
      setCompletedRental({
        ...rentalData,
        customer_name: customer?.name || 'Cliente',
        customer_dni: customer?.dni || '',
        items_detail: items,
        total_amount: cleanTotal,
        paid_amount: paid,
        change: paymentMethodSelected === "cash" ? Number((cashGivenAmount - cleanTotal).toFixed(2)) : 0
      });
      
      setShowPaymentDialog(false);
      setCashGiven("");
      setShowSuccessDialog(true);
      toast.success("✅ Alquiler completado");
      
    } catch (error) {
      console.error("Error:", error);
      // Si hay error, redirigir a lista para verificar
      toast.info("Verificando operación... Compruebe la lista de alquileres.");
      setShowPaymentDialog(false);
      setTimeout(() => window.location.href = '/rentals', 2000);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Función vacía - Ya no se usa apertura automática
  const openCashAndContinue = async () => {
    toast.info("Por favor, abra la caja desde el módulo de CAJA.");
    setShowAutoOpenCashDialog(false);
  };

  const printRentalTicket = () => {
    if (!completedRental) return;
    
    // Helper to get item type label
    const getTypeLabel = (itemType) => {
      const type = itemTypes.find(t => t.value === itemType);
      return type?.label || itemType || 'Artículo';
    };
    
    // Prepare items for the ticket
    const ticketItems = [];
    
    // Group items by pack
    const packItems = {};
    const standaloneItems = [];
    
    (completedRental.items_detail || []).forEach(item => {
      const inPack = detectedPacks.find(dp => dp.items.includes(item.barcode));
      if (inPack) {
        const packId = inPack.pack.id;
        if (!packItems[packId]) {
          packItems[packId] = { pack: inPack.pack, items: [], days: item.itemDays || numDays };
        }
        packItems[packId].items.push(item);
      } else {
        standaloneItems.push(item);
      }
    });
    
    // Add standalone items
    standaloneItems.forEach(item => {
      const typeLabel = getTypeLabel(item.item_type);
      const days = item.itemDays || numDays;
      const tariff = tariffs.find(t => t.item_type === item.item_type);
      const dayField = days <= 10 ? `day_${days}` : 'day_11_plus';
      const totalPrice = item.customPrice || item.custom_price || (tariff ? tariff[dayField] : 0) || 0;
      
      const modelStr = `${item.brand || ''} ${item.model || ''}`.trim();
      
      ticketItems.push({
        name: `${typeLabel} ${modelStr}`.trim(),
        size: item.size || '',
        internal_code: item.internal_code || '',
        item_type: item.item_type,
        days: days,
        price: totalPrice,
        subtotal: totalPrice
      });
    });
    
    // Add pack items as single lines
    Object.values(packItems).forEach(packData => {
      const packDays = packData.days;
      const packTotal = getPackPrice(packData.pack, packDays);
      const childCodes = packData.items.map(item => 
        item.internal_code || item.barcode?.substring(0, 10) || 'N/A'
      ).join(' / ');
      
      ticketItems.push({
        name: `${packData.pack.name}`,
        internal_code: childCodes,
        item_type: 'pack',
        days: packDays,
        price: packTotal,
        subtotal: packTotal
      });
    });

    // Use PrintService for non-blocking print (allows scanning while printing)
    PrintService.printRental({
      operationNumber: completedRental.operation_number || `A${String(Date.now()).slice(-6)}`,
      date: new Date().toLocaleDateString('es-ES'),
      customer: customer?.name || completedRental.customer_name || '',
      dni: customer?.dni || completedRental.customer_dni || '',
      startDate: startDate,
      endDate: endDate,
      days: numDays,
      items: ticketItems,
      total: completedRental.total_amount || 0,
      paymentMethod: completedRental.payment_method || paymentMethod
    }, {
      settings: {
        companyLogo: settings.companyLogo,
        ticketHeader: settings.ticketHeader,
        ticketFooter: settings.ticketFooter,
        ticketTerms: settings.ticketTerms,
        showDniOnTicket: settings.showDniOnTicket,
        showVatOnTicket: settings.showVatOnTicket,
        defaultVat: settings.defaultVat,
        vatIncludedInPrices: settings.vatIncludedInPrices,
        language: settings.language
      },
      onComplete: () => {
        console.log('[PrintService] Ticket de alquiler impreso');
      },
      onError: (err) => {
        console.error('[PrintService] Error al imprimir:', err);
      }
    });
  };

  const closeSuccessDialog = () => {
    setShowSuccessDialog(false);
    setCompletedRental(null);
    resetForm();
  };

  const resetForm = () => {
    // Usar clearCart() para limpiar el estado persistido
    clearCart();
    
    // Limpiar estados transitorios adicionales
    setSearchTerm("");
    setPaidAmount("");
    setDeposit("");
    setDetectedPacks([]);
    
    if (searchRef.current) searchRef.current.focus();
  };

  // Función para vaciar carrito manualmente (botón "Vaciar Carrito")
  const handleClearCart = () => {
    if (items.length === 0 && !customer) {
      toast.info("El carrito ya está vacío");
      return;
    }
    
    clearCart();
    setSearchTerm("");
    setPaidAmount("");
    setDeposit("");
    toast.success("Carrito vaciado");
    
    if (barcodeRef.current) barcodeRef.current.focus();
  };

  const subtotal = calculateSubtotal();
  const total = calculateTotal();
  const hasDiscount = total < subtotal;

  return (
    <div className="p-6 lg:p-8" data-testid="new-rental-page">
      <h1 className="text-3xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Plus Jakarta Sans' }}>
        Nuevo Alquiler
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel - Customer & Dates */}
        <div className="lg:col-span-4 space-y-4">
          {/* Customer Card */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-slate-500" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Smart Autocomplete Search */}
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      ref={(el) => {
                        searchRef.current = el;
                        customerSearchRef.current = el;
                      }}
                      placeholder="Busca por nombre o DNI (mínimo 2 caracteres)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        // Tab navigation
                        if (e.key === 'Tab' && !isEditingCartItem && !showSuggestions) {
                          e.preventDefault();
                          if (e.shiftKey) {
                            focusPrevField('customer');
                          } else {
                            focusNextField('customer');
                          }
                          return;
                        }
                        // Normal handling (suggestions navigation)
                        handleKeyDown(e);
                      }}
                      onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
                      tabIndex={2}
                      className="h-11 pr-10"
                      data-testid="customer-search-input"
                      autoFocus
                      disabled={!!customer}
                      autoComplete="off"
                    />
                    {searchTerm && !customer && (
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setShowSuggestions(false);
                          searchRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        <X className="h-4 w-4" tabIndex={-1} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {!customer && (
                    <Button 
                      onClick={searchCustomer} 
                      disabled={searchLoading}
                      className="h-11 px-4"
                      data-testid="customer-search-btn"
                      tabIndex={-1}
                    >
                      {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" tabIndex={-1} aria-hidden="true" /> : <Search className="h-4 w-4" tabIndex={-1} aria-hidden="true" />}
                    </Button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && customerSuggestions.length > 0 && !customer && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                    <div className="p-2">
                      <p className="text-xs text-slate-500 px-2 py-1 mb-1" tabIndex={-1}>
                        {customerSuggestions.length} cliente(s) encontrado(s)
                      </p>
                      {customerSuggestions.map((suggestion, index) => (
                        <button
                          key={suggestion.id}
                          onClick={() => selectCustomer(suggestion)}
                          tabIndex={-1}
                          className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                            index === selectedIndex 
                              ? 'bg-primary text-white' 
                              : 'hover:bg-slate-50'
                          }`}
                          data-testid={`suggestion-${index}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold truncate ${
                                index === selectedIndex ? 'text-white' : 'text-slate-900'
                              }`}>
                                {suggestion.name}
                              </p>
                              <p className={`text-sm font-mono ${
                                index === selectedIndex ? 'text-white/90' : 'text-slate-500'
                              }`}>
                                {suggestion.dni}
                              </p>
                              {suggestion.phone && (
                                <p className={`text-xs ${
                                  index === selectedIndex ? 'text-white/80' : 'text-slate-400'
                                }`}>
                                  📞 {suggestion.phone}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              {suggestion.source && (
                                <Badge variant={index === selectedIndex ? "secondary" : "outline"} className="text-xs whitespace-nowrap">
                                  {suggestion.source}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {suggestion.total_rentals || 0}
                              </Badge>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Customer Card - COMPACT by default */}
              {customer && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 animate-fade-in">
                  {/* MAIN ROW: Name + Eye Toggle + Change Button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-lg truncate">{customer.name}</p>
                          {customerHistory?.has_alerts && (
                            <Badge variant="destructive" className="animate-pulse flex-shrink-0">
                              ⚠️
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 font-mono">{customer.dni}</p>
                      </div>
                    </div>
                    
                    {/* Right side: Eye toggle + Badge + Change button */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Eye Toggle Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCustomerTechData(!showCustomerTechData)}
                        className={`h-9 px-3 gap-1.5 ${showCustomerTechData ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-blue-600'}`}
                        title={showCustomerTechData ? "Ocultar datos" : "Ver datos técnicos"}
                        data-testid="toggle-tech-data-btn"
                      >
                        {showCustomerTechData ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline text-xs">
                          {showCustomerTechData ? "Ocultar" : "Ver datos"}
                        </span>
                      </Button>
                      
                      <Badge variant="secondary" className="font-semibold hidden md:flex">
                        {customer.total_rentals || 0} alq.
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCustomer(null);
                          setCustomerHistory(null);
                          setSearchTerm("");
                          setShowCustomerTechData(false);
                          setTimeout(() => searchRef.current?.focus(), 100);
                        }}
                        className="h-9 px-2 text-slate-500 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* EXPANDABLE SECTION - Only shown when eye is clicked */}
                  {showCustomerTechData && (
                    <div className="mt-4 pt-4 border-t border-primary/20 space-y-3 animate-fade-in">
                      {/* Contact & Source Info */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            📞 {customer.phone}
                          </span>
                        )}
                        {customer.city && (
                          <span className="flex items-center gap-1">
                            📍 {customer.city}
                          </span>
                        )}
                        {customer.source && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {customer.source}
                            {getProviderDiscount() > 0 && (
                              <span className="ml-1 font-bold">-{getProviderDiscount()}%</span>
                            )}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Technical Data Summary */}
                      {(customer.height || customer.weight || customer.boot_size || customer.ski_level) && (
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                          <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
                            <Mountain className="h-3 w-3" /> Datos Técnicos
                          </p>
                          <div className="flex flex-wrap gap-3 text-sm">
                            {customer.height && (
                              <span className="flex items-center gap-1 text-slate-700">
                                <Ruler className="h-3 w-3 text-blue-500" />
                                <strong>{customer.height}</strong>cm
                              </span>
                            )}
                            {customer.weight && (
                              <span className="flex items-center gap-1 text-slate-700">
                                <Scale className="h-3 w-3 text-blue-500" />
                                <strong>{customer.weight}</strong>kg
                              </span>
                            )}
                            {customer.boot_size && (
                              <span className="flex items-center gap-1 text-slate-700">
                                <Package className="h-3 w-3 text-blue-500" />
                                Pie <strong>{customer.boot_size}</strong>
                              </span>
                            )}
                            {customer.ski_level && customer.ski_level !== 'sin_especificar' && (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-300 capitalize text-xs">
                                {customer.ski_level}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Alerts Section */}
                      {customerHistory?.has_alerts && customerHistory.overdue_rentals > 0 && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-red-900">
                                Cliente con {customerHistory.overdue_rentals} alquiler(es) vencido(s)
                              </p>
                              <p className="text-xs text-red-700 mt-1">
                                Verifica el estado antes de proceder
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Customer Notes */}
                      {customer.notes && (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <p className="text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1">
                            📝 Observaciones
                          </p>
                          <p className="text-sm text-amber-800">{customer.notes}</p>
                        </div>
                      )}

                      {/* Preferred Sizes from History */}
                      {customerHistory?.preferred_sizes && Object.keys(customerHistory.preferred_sizes).length > 0 && (
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                          <p className="text-xs font-semibold text-emerald-900 mb-2 flex items-center gap-1">
                            <History className="h-3 w-3" /> Tallas Habituales
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(customerHistory.preferred_sizes).map(([type, sizes]) => (
                              <Badge key={type} className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                                <strong>{type}:</strong>&nbsp;{sizes.join(", ")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Create New Customer Button */}
              {!customer && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setShowNewCustomer(true);
                    setNewCustomer({ ...newCustomer, dni: searchTerm.toUpperCase() });
                  }}
                  data-testid="new-customer-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Nuevo Cliente
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Smart Dates Card */}
          <Card className="border-slate-200 border-primary/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" tabIndex={-1} aria-hidden="true" />
                Duración del Alquiler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/5 rounded-xl p-4">
                <Label className="text-sm font-medium text-slate-700">Número de días</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Input
                    ref={daysRef}
                    type="number"
                    min="1"
                    value={numDays}
                    onChange={(e) => handleNumDaysChange(e.target.value)}
                    onKeyDown={(e) => {
                      // Tab navigation
                      if (e.key === 'Tab' && !isEditingCartItem) {
                        e.preventDefault();
                        if (e.shiftKey) {
                          focusPrevField('days');
                        } else {
                          focusNextField('days');
                        }
                        return;
                      }
                      // Normal days handling
                      handleDaysKeyDown(e);
                    }}
                    tabIndex={3}
                    className="h-14 text-3xl font-bold text-center w-24 border-primary/30"
                    data-testid="num-days-input"
                    autoComplete="off"
                  />
                  <div className="flex-1 text-center" tabIndex={-1}>
                    <div className="flex items-center justify-center gap-2 text-lg font-medium text-slate-700">
                      <span>{formatDateDisplay(startDate)}</span>
                      <ArrowRight className="h-4 w-4 text-primary" tabIndex={-1} aria-hidden="true" />
                      <span>{formatDateDisplay(endDate)}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {numDays} {numDays === 1 ? 'día' : 'días'}
                    </p>
                  </div>
                </div>
              </div>

              {showTimeHint && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg animate-fade-in" tabIndex={-1}>
                  <Clock className="h-3 w-3" tabIndex={-1} aria-hidden="true" />
                  <span>{getTimeHintMessage()}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Desde</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="h-10 mt-1 text-sm"
                    data-testid="start-date-input"
                    tabIndex={-1}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Hasta</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="h-10 mt-1 text-sm"
                    data-testid="end-date-input"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {[1, 2, 3, 5, 7].map(d => (
                  <Button
                    key={d}
                    variant={numDays === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleNumDaysChange(d)}
                    className="flex-1"
                  >
                    {d}d
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Items */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-slate-500" />
                  Artículos
                  {items.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                      {items.length}
                    </Badge>
                  )}
                </CardTitle>
                {/* Indicador de persistencia + Botón vaciar carrito */}
                <div className="flex items-center gap-2">
                  {hasCartData && (
                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 bg-emerald-50">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Guardado
                    </Badge>
                  )}
                  {(items.length > 0 || customer) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearCart}
                      className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                      data-testid="clear-cart-btn"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Vaciar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barcode + Manual Search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${globalScannerActive ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} tabIndex={-1} aria-hidden="true" />
                  <Input
                    ref={barcodeRef}
                    placeholder={globalScannerActive ? "📡 Escáner listo..." : "Escanear código de barras..."}
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      // Tab navigation
                      if (e.key === 'Tab' && !isEditingCartItem) {
                        e.preventDefault();
                        if (e.shiftKey) {
                          focusPrevField('barcode');
                        } else {
                          focusNextField('barcode');
                        }
                        return;
                      }
                      // Normal barcode processing
                      addItemByBarcode(e);
                    }}
                    tabIndex={1}
                    className={`h-12 pl-10 pr-10 text-lg font-mono transition-all ${
                      globalScannerActive 
                        ? 'border-emerald-400 ring-2 ring-emerald-200 bg-emerald-50' 
                        : ''
                    }`}
                    data-testid="barcode-input"
                    autoComplete="off"
                  />
                  {globalScannerActive && (
                    <Radio className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500 animate-pulse" tabIndex={-1} aria-hidden="true" />
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowItemSearch(true)}
                  className="h-12 px-4"
                  data-testid="manual-search-btn"
                  tabIndex={-1}
                >
                  <Search className="h-4 w-4 mr-2" tabIndex={-1} aria-hidden="true" />
                  Buscar
                </Button>
              </div>
              <p className={`text-xs transition-colors ${globalScannerActive ? 'text-emerald-600 font-medium' : 'text-slate-500'}`} tabIndex={-1}>
                {globalScannerActive 
                  ? '📡 Escáner HID detectado - Escanea para añadir artículos automáticamente' 
                  : 'Tab: siguiente campo | Escanea el código o pulsa F3 para buscar'}
              </p>

              {/* LISTA DE ARTÍCULOS - Altura expandida para mostrar más items */}
              <div className="min-h-[200px] max-h-[580px] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <Package className="h-12 w-12 mb-2" />
                    <p>Escanea artículos para añadirlos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* GROUPED CART ITEMS - Solo PADRES (packs) e items sueltos */}
                    {/* Los HIJOS ya fueron filtrados en getGroupedCartItems() */}
                    {getGroupedCartItems().map((group, groupIndex) => {
                      if (group.type === 'pack') {
                        // PACK (PADRE): Una sola línea con códigos de hijos incrustados
                        const packTotal = group.price;  // Precio TOTAL (no multiplicar por días)
                        
                        return (
                          <div 
                            key={group.packId}
                            className="grid grid-cols-12 gap-2 items-center py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 animate-fade-in"
                          >
                            {/* Nombre FUSIONADO: "Pack Gama Media (SKI-001 / BOT-204)" */}
                            <div className="col-span-5">
                              <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-amber-600 flex-shrink-0" />
                                <span className="font-bold text-amber-800 text-sm leading-tight">
                                  {group.fusedName}
                                </span>
                              </div>
                            </div>
                            
                            {/* Días del Pack - Editable */}
                            <div className="col-span-3 text-center">
                              {editingItemDays === group.packId ? (
                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  defaultValue={group.days}
                                  className="h-8 w-20 text-center text-sm font-bold mx-auto border-2 border-amber-500 bg-amber-50"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    e.stopPropagation(); // Prevent scanner
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      updatePackDays(group.items, e.target.value);
                                    }
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingItemDays(null);
                                    }
                                  }}
                                  onBlur={(e) => updatePackDays(group.items, e.target.value)}
                                  data-testid={`edit-pack-days-${group.packId}`}
                                />
                              ) : (
                                <Badge 
                                  className="cursor-pointer bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-1"
                                  onClick={() => setEditingItemDays(group.packId)}
                                >
                                  {group.days} días <Edit2 className="h-3 w-3 ml-1 inline" />
                                </Badge>
                              )}
                            </div>
                            
                            {/* Precio Total Pack (IVA incluido) - EDITABLE */}
                            <div className="col-span-3 text-right">
                              <p className="text-xs text-amber-700 uppercase">Total (IVA inc.)</p>
                              {editingPackPrice === group.packId ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  defaultValue={packTotal.toFixed(2)}
                                  className="h-8 w-24 text-right text-lg font-bold ml-auto border-2 border-orange-500 bg-orange-50"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    e.stopPropagation(); // Prevent scanner
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      updatePackPrice(group.items, e.target.value);
                                    }
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingPackPrice(null);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    updatePackPrice(group.items, e.target.value);
                                  }}
                                  data-testid={`edit-pack-price-${group.packId}`}
                                />
                              ) : (
                                <div 
                                  className="cursor-pointer hover:bg-amber-100 rounded px-2 py-1 inline-block"
                                  onClick={() => setEditingPackPrice(group.packId)}
                                >
                                  <p className={`text-xl font-bold ${group.isEdited ? 'text-orange-600' : 'text-amber-700'}`}>
                                    €{packTotal.toFixed(2)}
                                    <Edit2 className="h-3 w-3 ml-1 inline opacity-50" />
                                  </p>
                                  {group.isEdited && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Badge className="bg-orange-500 text-white text-xs">EDITADO</Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 px-1 text-xs text-slate-500 hover:text-blue-600"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          resetPackPrice(group.items);
                                        }}
                                        title="Restaurar precio de tarifa"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Remove Pack Button - BORRADO EN CASCADA */}
                            <div className="col-span-1 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removePackComplete(group.items)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      } else {
                        // SINGLE ITEM: Render normally - TARIFA ESCALONADA
                        const item = group.item;
                        const qty = item.quantity || 1;
                        const days = group.days;
                        // Precio ya es TOTAL escalonado (look-up), solo multiplicar por cantidad
                        const totalItemPrice = group.price * qty;
                        
                        return (
                          <div 
                            key={item.id || item.barcode}
                            className={`grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-xl transition-colors animate-fade-in ${
                              item.is_generic ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-slate-50 hover:bg-slate-100'
                            }`}
                          >
                            {/* Nombre/Código */}
                            <div className="col-span-4">
                              <p className="text-[10px] text-slate-500 font-medium uppercase">
                                {item.is_generic ? 'Artículo' : 'Código'}
                              </p>
                              {item.is_generic ? (
                                <p className="font-bold text-emerald-700 truncate text-sm">{item.name}</p>
                              ) : (
                                <>
                                  <p className="font-mono font-bold text-slate-900 text-sm">{item.internal_code || item.barcode}</p>
                                  <p className="text-[10px] text-slate-500 leading-tight">{item.brand} {item.model} {item.size && `(${item.size})`}</p>
                                </>
                              )}
                            </div>
                            
                            {/* Tipo */}
                            <div className="col-span-2">
                              <p className="text-[10px] text-slate-500 font-medium uppercase">Tipo</p>
                              <Badge variant="outline" className="font-semibold text-xs">
                                {itemTypes.find(t => t.value === item.item_type)?.label || item.item_type}
                              </Badge>
                              {item.is_generic && qty > 1 && (
                                <Badge className="ml-1 bg-emerald-600 text-white font-bold text-xs">x{qty}</Badge>
                              )}
                            </div>
                            
                            {/* Días - Editable */}
                            <div className="col-span-2 text-center">
                              <p className="text-[10px] text-slate-500 font-medium uppercase">Días</p>
                              {editingItemDays === (item.id || item.barcode) ? (
                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  defaultValue={days}
                                  className="h-6 w-14 text-center text-sm font-bold mx-auto border-2 border-blue-500 bg-blue-50"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    e.stopPropagation(); // Prevent scanner from capturing
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      updateItemDays(item.id || item.barcode, e.target.value);
                                    }
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingItemDays(null);
                                    }
                                  }}
                                  onBlur={(e) => updateItemDays(item.id || item.barcode, e.target.value)}
                                  data-testid={`edit-days-${item.id || item.barcode}`}
                                />
                              ) : (
                                <Badge 
                                  variant="outline" 
                                  className="cursor-pointer hover:bg-blue-100 font-bold text-blue-700 border-blue-300 text-xs"
                                  onClick={() => setEditingItemDays(item.id || item.barcode)}
                                >
                                  {days}d <Edit2 className="h-2.5 w-2.5 ml-0.5 inline" />
                                </Badge>
                              )}
                            </div>
                            
                            {/* Precio Total (IVA incluido) - EDITABLE */}
                            <div className="col-span-3 text-right">
                              <p className="text-[10px] text-slate-500 font-medium uppercase">Total</p>
                              {group.price === 0 && !item.is_generic ? (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertCircle className="h-3 w-3 mr-1" /> Sin tarifa
                                </Badge>
                              ) : editingItemPrice === (item.id || item.barcode) ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  defaultValue={totalItemPrice.toFixed(2)}
                                  className="h-8 w-24 text-right text-lg font-bold ml-auto border-2 border-orange-500 bg-orange-50"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    e.stopPropagation(); // Prevent scanner from capturing
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      updateItemPrice(item.id || item.barcode, e.target.value);
                                    }
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingItemPrice(null);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    updateItemPrice(item.id || item.barcode, e.target.value);
                                  }}
                                  data-testid={`edit-price-${item.id || item.barcode}`}
                                />
                              ) : (
                                <div 
                                  className="cursor-pointer hover:bg-slate-100 rounded px-2 py-1 inline-block"
                                  onClick={() => setEditingItemPrice(item.id || item.barcode)}
                                >
                                  <p className={`text-lg font-bold ${group.isEdited ? 'text-orange-600' : 'text-slate-900'}`}>
                                    €{totalItemPrice.toFixed(2)}
                                    <Edit2 className="h-3 w-3 ml-1 inline opacity-50" />
                                  </p>
                                  {group.isEdited && (
                                    <Badge className="bg-orange-500 text-white text-xs mt-1">EDITADO</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Eliminar */}
                            <div className="col-span-1 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id || item.barcode)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Card */}
          <Card className="border-slate-200">
            <CardContent className="pt-6">
              {/* BOTONERA FIJA: Solo 3 botones en orden estricto */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-200">
                <span className="text-sm text-slate-600 font-medium">Añadir rápido:</span>
                {QUICK_ADD_CONFIG.map(config => (
                  <Button
                    key={config.key}
                    variant="outline"
                    size="sm"
                    onClick={() => quickAddGeneric(config)}
                    className="h-8 px-3 text-sm hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
                    data-testid={`quick-add-${config.key}`}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    {config.label}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label>Método de Pago</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-11 mt-1" data-testid="payment-method-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(method => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Importe Pagado</Label>
                  <Input
                    type="number"
                    placeholder={total.toFixed(2)}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="h-11 mt-1"
                    data-testid="paid-amount-input"
                  />
                </div>
                <div>
                  <Label>Depósito</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    className="h-11 mt-1"
                    data-testid="deposit-input"
                  />
                </div>
                <div>
                  <Label>Descuento</Label>
                  <div className="flex gap-1 mt-1">
                    <Select value={discountType} onValueChange={setDiscountType}>
                      <SelectTrigger className="w-20 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        <SelectItem value="percent">%</SelectItem>
                        <SelectItem value="fixed">€</SelectItem>
                      </SelectContent>
                    </Select>
                    {discountType !== 'none' && (
                      <Input
                        type="number"
                        placeholder="0"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className="h-11 flex-1"
                      />
                    )}
                  </div>
                </div>
              </div>

              {hasDiscount && (
                <div className="mb-4">
                  <Input
                    placeholder="Motivo del descuento (opcional): grupo, VIP, etc."
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              )}

              {/* Provider Discount Info */}
              {customer?.source && getProviderDiscount() > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Descuento {customer.source}
                    </p>
                    <p className="text-xs text-blue-700">
                      Se aplicará automáticamente {getProviderDiscount()}% de descuento
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    -{getProviderDiscount()}%
                  </Badge>
                </div>
              )}

              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 mt-4">
                <div className="flex-1" tabIndex={-1}>
                  {(hasDiscount || getProviderDiscount() > 0) && (
                    <p className="text-sm text-slate-500 line-through">€{subtotal.toFixed(2)}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-500">Total a pagar</p>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">€{total.toFixed(2)}</p>
                      {getProviderDiscount() > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          Incluye descuento {customer.source}
                        </p>
                      )}
                    </div>
                    {(hasDiscount || getProviderDiscount() > 0) && (
                      <Badge className="bg-emerald-100 text-emerald-700" tabIndex={-1}>
                        -€{(subtotal - total).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  ref={submitRef}
                  size="lg"
                  onClick={completeRental}
                  disabled={loading || !customer || items.length === 0}
                  tabIndex={4}
                  onKeyDown={(e) => {
                    // Tab navigation
                    if (e.key === 'Tab' && !isEditingCartItem) {
                      e.preventDefault();
                      if (e.shiftKey) {
                        focusPrevField('submit');
                      } else {
                        focusNextField('submit');
                      }
                      return;
                    }
                  }}
                  className="h-14 px-8 text-lg font-semibold"
                  data-testid="complete-rental-btn"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" tabIndex={-1} aria-hidden="true" />
                  ) : (
                    <Check className="h-5 w-5 mr-2" tabIndex={-1} aria-hidden="true" />
                  )}
                  Completar Alquiler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Customer Dialog - With Focus Trap */}
      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent className="sm:max-w-md">
          <FocusTrap active={showNewCustomer} onEscape={() => setShowNewCustomer(false)}>
            <DialogHeader>
              <DialogTitle>Nuevo Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>DNI/Pasaporte *</Label>
                  <Input
                    value={newCustomer.dni}
                    onChange={(e) => setNewCustomer({ ...newCustomer, dni: e.target.value.toUpperCase() })}
                    className="h-11 mt-1"
                    data-testid="new-customer-dni"
                    tabIndex={1}
                    autoFocus
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="h-11 mt-1"
                    data-testid="new-customer-phone"
                    tabIndex={2}
                    autoComplete="off"
                  />
                </div>
              </div>
            <div>
              <Label>Nombre Completo *</Label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                className="h-11 mt-1"
                data-testid="new-customer-name"
              />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                className="h-11 mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Población</Label>
                <Input
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                  className="h-11 mt-1"
                />
              </div>
              <div>
                <Label>Proveedor/Fuente</Label>
                <Select 
                  value={newCustomer.source || "none"} 
                  onValueChange={(v) => setNewCustomer({ ...newCustomer, source: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="h-11 mt-1">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    <SelectItem value="Web propia">Web propia</SelectItem>
                    <SelectItem value="Booking.com">Booking.com</SelectItem>
                    <SelectItem value="Expedia">Expedia</SelectItem>
                    <SelectItem value="Hotel">Hotel</SelectItem>
                    <SelectItem value="Recomendación">Recomendación</SelectItem>
                    <SelectItem value="Walk-in">Walk-in (pie de tienda)</SelectItem>
                    {sources.map(s => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomer(false)} tabIndex={10}>
              Cancelar
            </Button>
            <Button onClick={createNewCustomer} data-testid="save-new-customer-btn" tabIndex={11}>
              Guardar Cliente
            </Button>
          </DialogFooter>
          </FocusTrap>
        </DialogContent>
      </Dialog>

      {/* Manual Item Search Dialog */}
      <Dialog open={showItemSearch} onOpenChange={(open) => {
        setShowItemSearch(open);
        if (!open) {
          setSearchFilter(null);
          setItemSearchType("all");
          setItemSearchCategory("all");
          setItemSearchTerm("");
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {searchFilter ? (
                <>
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Completar Pack - Buscar {itemTypes.find(t => t.value === searchFilter.type)?.label || searchFilter.type}
                </>
              ) : (
                "Buscar Artículo Manualmente"
              )}
            </DialogTitle>
            {searchFilter && (
              <p className="text-sm text-amber-600">
                Mostrando artículos de tipo <strong>{itemTypes.find(t => t.value === searchFilter.type)?.label}</strong> en categoría <strong>{searchFilter.category}</strong> para completar el pack
              </p>
            )}
          </DialogHeader>
          
          {/* Search Filters */}
          <div className="grid grid-cols-3 gap-3 py-4">
            <Input
              placeholder="Código, marca, modelo..."
              value={itemSearchTerm}
              onChange={(e) => setItemSearchTerm(e.target.value)}
              className="h-11"
              autoFocus
            />
            <Select value={itemSearchType} onValueChange={setItemSearchType}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {itemTypes.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {searchingItems ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No se encontraron artículos disponibles</p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((item) => (
                  <div 
                    key={item.barcode}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                    onClick={() => addItemFromSearch(item)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Package className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{item.item_type}</Badge>
                          <span className="font-mono text-xs text-slate-400">{item.barcode}</span>
                        </div>
                        <p className="font-medium text-slate-900">
                          {item.brand} {item.model} - {item.size}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowItemSearch(false);
              refocusBarcodeInput(); // Auto-focus barcode after closing search
            }}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto Cash Opening Dialog - PRIORITY (Before Payment) */}
      <Dialog open={showAutoOpenCashDialog} onOpenChange={(open) => {
        // Don't allow closing without completing
        if (!open && !openingCashBalance) {
          toast.error("Debes introducir el fondo de caja para continuar");
          return;
        }
        setShowAutoOpenCashDialog(open);
      }}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              🏪 Iniciando Nueva Jornada
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* Alert Info */}
            <div className="p-4 rounded-lg bg-amber-50 border-2 border-amber-300">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">No hay caja abierta</p>
                  <p className="text-sm text-amber-800 mt-1">
                    Para procesar este cobro, necesitas abrir la caja del día.
                  </p>
                </div>
              </div>
            </div>

            {/* Opening Balance Input */}
            <div className="space-y-3">
              <Label className="text-base font-bold text-slate-900">
                Fondo de Caja Inicial (Efectivo) *
              </Label>
              <p className="text-sm text-slate-600">
                Introduce el dinero en efectivo con el que empiezas la jornada
              </p>
              <Input
                type="number"
                value={openingCashBalance}
                onChange={(e) => setOpeningCashBalance(e.target.value)}
                placeholder="0.00"
                className="h-16 text-3xl font-bold text-center"
                min="0"
                step="0.01"
                autoFocus
              />
              <p className="text-xs text-slate-500">
                Ejemplo: Si tienes €100 en la caja para empezar, introduce <span className="font-mono font-bold">100</span>
              </p>
            </div>

            {/* Preview */}
            {openingCashBalance && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300 animate-fade-in">
                <p className="text-sm text-emerald-700 font-medium">Resumen de Apertura</p>
                <p className="text-3xl font-black text-emerald-900 mt-2">
                  Fondo: €{parseFloat(openingCashBalance).toFixed(2)}
                </p>
                {pendingPaymentData && (
                  <p className="text-sm text-emerald-700 mt-2">
                    + Primera venta: €{pendingPaymentData.total.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Info box */}
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs text-blue-800">
                💡 <strong>Nota:</strong> Este proceso solo ocurre una vez al día. Las siguientes ventas se procesarán automáticamente.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={openCashAndContinue}
              disabled={!openingCashBalance && openingCashBalance !== "0"}
              className="bg-emerald-600 hover:bg-emerald-700 w-full"
              size="lg"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Abrir Caja y Continuar con el Cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog - NEW */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              💳 Finalizar Pago
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Total to Pay - Highlighted */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300 shadow-lg">
              <p className="text-sm font-medium text-emerald-700 uppercase tracking-wide">Total a Pagar</p>
              <p className="text-5xl font-black text-emerald-900 mt-2">
                €{calculateTotal().toFixed(2)}
              </p>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Método de Pago</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={paymentMethodSelected === "cash" ? "default" : "outline"}
                  className={`h-20 text-lg font-bold ${
                    paymentMethodSelected === "cash" 
                      ? "bg-emerald-600 hover:bg-emerald-700" 
                      : "hover:border-emerald-500"
                  }`}
                  onClick={() => setPaymentMethodSelected("cash")}
                >
                  💵 EFECTIVO
                </Button>
                <Button
                  type="button"
                  variant={paymentMethodSelected === "card" ? "default" : "outline"}
                  className={`h-20 text-lg font-bold ${
                    paymentMethodSelected === "card" 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "hover:border-blue-500"
                  }`}
                  onClick={() => setPaymentMethodSelected("card")}
                >
                  💳 TARJETA
                </Button>
              </div>
            </div>

            {/* Cash Input and Change Calculation */}
            {paymentMethodSelected === "cash" && (
              <div className="space-y-4 p-4 rounded-lg bg-slate-50 border-2 border-slate-200">
                <div>
                  <Label className="text-base font-semibold">Efectivo Entregado (€)</Label>
                  <Input
                    type="number"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    placeholder="0.00"
                    className="h-14 text-2xl font-bold text-center mt-2"
                    min="0"
                    step="0.01"
                    autoFocus
                  />
                </div>

                {/* Change Display */}
                {cashGiven && parseFloat(cashGiven) >= calculateTotal() && (
                  <div className="p-4 rounded-lg bg-blue-50 border-2 border-blue-300 animate-fade-in">
                    <p className="text-sm font-medium text-blue-700">Cambio a Devolver</p>
                    <p className="text-4xl font-black text-blue-900 mt-1">
                      €{(parseFloat(cashGiven) - calculateTotal()).toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Warning if insufficient */}
                {cashGiven && parseFloat(cashGiven) < calculateTotal() && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-300 flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">
                      El efectivo entregado es menor que el total a pagar.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Card Payment Info */}
            {paymentMethodSelected === "card" && (
              <div className="p-4 rounded-lg bg-blue-50 border-2 border-blue-200">
                <p className="text-sm text-blue-800">
                  ✅ Procesa el pago con el datáfono antes de continuar.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPaymentDialog(false);
                setCashGiven("");
              }}
              disabled={processingPayment}
            >
              Cancelar
            </Button>
            <Button 
              onClick={processPaymentAndCompleteRental}
              disabled={processingPayment || (paymentMethodSelected === "cash" && !cashGiven)}
              className="bg-emerald-600 hover:bg-emerald-700 min-w-[200px]"
              size="lg"
            >
              {processingPayment ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Confirmar Pago
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog with Print Button */}
      <Dialog open={showSuccessDialog} onOpenChange={closeSuccessDialog}>
        <DialogContent className="sm:max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 text-xl">
              <CheckCircle className="h-7 w-7" />
              ¡Alquiler Completado!
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div className="p-4 rounded-lg bg-emerald-50 border-2 border-emerald-200 w-full max-w-full box-border">
              <p className="text-sm font-semibold text-emerald-900 break-words">
                <strong>Cliente:</strong> {completedRental?.customer_name}
              </p>
              <p className="text-sm font-semibold text-emerald-900 mt-2">
                <strong>Total pagado:</strong> €{completedRental?.paid_amount?.toFixed(2)}
              </p>
              <p className="text-xs text-emerald-700 mt-2 font-mono">
                ID: {completedRental?.id?.substring(0, 8)}
              </p>
            </div>
            
            <Button 
              onClick={printRentalTicket}
              className="w-full h-16 text-xl font-bold bg-primary hover:bg-primary/90 shadow-lg"
              size="lg"
            >
              <Printer className="h-6 w-6 mr-3" />
              🖨️ IMPRIMIR TICKET
            </Button>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={closeSuccessDialog} 
              className="w-full"
            >
              Continuar sin imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
