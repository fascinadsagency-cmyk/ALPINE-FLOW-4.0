import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { customerApi, itemApi, tariffApi, rentalApi } from "@/lib/api";
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
  Calendar,
  Clock,
  ArrowRight,
  Edit2,
  X,
  AlertTriangle,
  Sparkles,
  CheckCircle,
  Printer
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

const ITEM_TYPES = [
  { value: "all", label: "Todos" },
  { value: "ski", label: "Esquís" },
  { value: "snowboard", label: "Snowboard" },
  { value: "boots", label: "Botas" },
  { value: "helmet", label: "Casco" },
  { value: "poles", label: "Bastones" },
];

const CATEGORIES = [
  { value: "all", label: "Todas" },
  { value: "SUPERIOR", label: "Gama Superior" },
  { value: "ALTA", label: "Gama Alta" },
  { value: "MEDIA", label: "Gama Media" },
];

const getCategoryBadge = (category) => {
  const styles = {
    SUPERIOR: "bg-purple-100 text-purple-700 border-purple-200",
    ALTA: "bg-blue-100 text-blue-700 border-blue-200",
    MEDIA: "bg-emerald-100 text-emerald-700 border-emerald-200"
  };
  return styles[category] || styles.MEDIA;
};

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
  const [searchTerm, setSearchTerm] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [customer, setCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState(null);
  const [items, setItems] = useState([]);
  const [packs, setPacks] = useState([]);
  const [detectedPacks, setDetectedPacks] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  
  // Smart date system
  const [numDays, setNumDays] = useState(1);
  const [startDate, setStartDate] = useState(getSmartStartDate());
  const [endDate, setEndDate] = useState(getSmartStartDate());
  const [showTimeHint, setShowTimeHint] = useState(true);
  
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [deposit, setDeposit] = useState("");
  const [notes, setNotes] = useState("");
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ dni: "", name: "", phone: "", address: "", city: "", source: "" });
  
  // Item search modal
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [itemSearchType, setItemSearchType] = useState("all");
  const [itemSearchCategory, setItemSearchCategory] = useState("all");
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
  
  // Price editing
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [editingItemPrice, setEditingItemPrice] = useState(null);
  
  // Sources
  const [sources, setSources] = useState([]);
  
  const barcodeRef = useRef(null);
  const searchRef = useRef(null);
  const daysRef = useRef(null);

  useEffect(() => {
    loadTariffs();
    loadSources();
    loadPacks();
    const timer = setTimeout(() => setShowTimeHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (customer && daysRef.current) {
      daysRef.current.focus();
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

  // AUTO-COMBO: Detect packs formed by current items
  const detectPacks = (currentItems) => {
    if (!packs || packs.length === 0 || currentItems.length === 0) {
      return [];
    }

    const detected = [];
    
    // Group items by category
    const itemsByCategory = currentItems.reduce((acc, item) => {
      const cat = item.category || 'MEDIA';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    // For each category, check if items form a pack
    Object.entries(itemsByCategory).forEach(([category, categoryItems]) => {
      // Count item types in this category
      const itemTypeCounts = categoryItems.reduce((acc, item) => {
        acc[item.item_type] = (acc[item.item_type] || 0) + 1;
        return acc;
      }, {});

      // Check each pack of this category
      const categoryPacks = packs.filter(p => p.category === category);
      
      categoryPacks.forEach(pack => {
        // Count required components
        const requiredComponents = pack.items.reduce((acc, itemType) => {
          acc[itemType] = (acc[itemType] || 0) + 1;
          return acc;
        }, {});

        // Check if we have all components
        let canFormPack = true;
        for (const [type, count] of Object.entries(requiredComponents)) {
          if ((itemTypeCounts[type] || 0) < count) {
            canFormPack = false;
            break;
          }
        }

        if (canFormPack) {
          // Find the specific items that form this pack
          const usedItems = [];
          const tempCounts = { ...itemTypeCounts };
          
          for (const requiredType of pack.items) {
            const item = categoryItems.find(i => 
              i.item_type === requiredType && !usedItems.includes(i.barcode)
            );
            if (item) {
              usedItems.push(item.barcode);
            }
          }

          if (usedItems.length === pack.items.length) {
            detected.push({
              pack: pack,
              items: usedItems,
              category: category
            });
          }
        }
      });
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
        // This item is part of a pack
        const packPrice = getPackPrice(detectedPack.pack);
        // Divide pack price equally among components
        return packPrice / detectedPack.pack.items.length;
      }
    }

    // Not part of a pack, use individual pricing
    return getItemPrice(item);
  };

  const getPackPrice = (pack) => {
    if (numDays <= 10 && pack[`day_${numDays}`]) {
      return pack[`day_${numDays}`];
    }
    if (numDays > 10 && pack.day_11_plus) {
      return pack.day_11_plus;
    }
    return 0;
  };

  // Smart date handlers
  const handleNumDaysChange = (value) => {
    const days = Math.max(1, parseInt(value) || 1);
    setNumDays(days);
    setEndDate(addDays(startDate, days));
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
      if (itemSearchCategory && itemSearchCategory !== 'all') params.append('category', itemSearchCategory);
      
      const response = await itemApi.getAll({
        status: 'available',
        search: itemSearchTerm || undefined,
        item_type: (itemSearchType && itemSearchType !== 'all') ? itemSearchType : undefined,
        category: (itemSearchCategory && itemSearchCategory !== 'all') ? itemSearchCategory : undefined
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
  }, [showItemSearch, itemSearchTerm, itemSearchType, itemSearchCategory]);

  const addItemFromSearch = (item) => {
    setItems([...items, { ...item, customPrice: null }]);
    toast.success(`${item.brand} ${item.model} añadido`);
    // Update search results
    setSearchResults(searchResults.filter(i => i.barcode !== item.barcode));
  };

  const addItemByBarcode = async (e) => {
    if (e.key !== 'Enter' || !barcodeInput.trim()) return;
    
    try {
      const response = await itemApi.getByBarcode(barcodeInput);
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
      
      setItems([...items, { ...item, customPrice: null }]);
      toast.success(`${item.brand} ${item.model} añadido`);
      setBarcodeInput("");
    } catch (error) {
      toast.error("Artículo no encontrado");
      setBarcodeInput("");
    }
  };

  const removeItem = (barcode) => {
    setItems(items.filter(i => i.barcode !== barcode));
  };

  const updateItemPrice = (barcode, newPrice) => {
    setItems(items.map(item => 
      item.barcode === barcode 
        ? { ...item, customPrice: parseFloat(newPrice) || null }
        : item
    ));
    setEditingItemPrice(null);
  };

  const getItemPrice = (item) => {
    if (item.customPrice !== null && item.customPrice !== undefined) {
      return item.customPrice;
    }
    
    const tariff = tariffs.find(t => t.item_type === item.item_type);
    if (!tariff) return 0;
    
    // Use daily pricing if available (day_1 to day_10, then day_11_plus)
    if (numDays <= 10 && tariff[`day_${numDays}`] !== null && tariff[`day_${numDays}`] !== undefined) {
      return tariff[`day_${numDays}`];
    }
    if (numDays > 10 && tariff.day_11_plus !== null && tariff.day_11_plus !== undefined) {
      return tariff.day_11_plus;
    }
    
    // Fallback to legacy pricing structure
    if (numDays === 1 && tariff.days_1) return tariff.days_1;
    if (numDays <= 3 && tariff.days_2_3) return tariff.days_2_3;
    if (numDays <= 7 && tariff.days_4_7) return tariff.days_4_7;
    if (tariff.week) return tariff.week;
    
    return 0;
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + getItemPriceWithPack(item), 0);
  };

  const getProviderDiscount = () => {
    if (!customer?.source) return 0;
    const provider = sources.find(s => s.name === customer.source);
    return provider?.discount_percent || 0;
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

    const total = calculateTotal();
    const cashGivenAmount = parseFloat(cashGiven) || 0;

    if (paymentMethodSelected === "cash" && cashGivenAmount < total) {
      toast.error(`El efectivo entregado (€${cashGivenAmount.toFixed(2)}) es menor que el total (€${total.toFixed(2)})`);
      return;
    }

    setProcessingPayment(true);
    
    try {
      // 1. Check if there's an active cash session
      const API = import.meta.env.VITE_API_URL;
      const sessionCheck = await fetch(`${API}/cash/sessions/active`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      let activeSession = null;
      if (sessionCheck.ok) {
        const data = await sessionCheck.json();
        activeSession = data;
      }
      
      // 2. If no active session, prompt user to open cash register
      if (!activeSession || !activeSession.id) {
        const shouldOpenCash = window.confirm(
          `⚠️ NO HAY CAJA ABIERTA\n\n` +
          `No se puede registrar el cobro de €${total.toFixed(2)} sin una caja activa.\n\n` +
          `¿Deseas abrir una nueva caja ahora para registrar este cobro?\n\n` +
          `(Se abrirá con fondo inicial de €0, puedes cambiarlo después)`
        );
        
        if (!shouldOpenCash) {
          toast.error("Cobro cancelado. Abre la caja primero desde 'Gestión de Caja'.");
          setProcessingPayment(false);
          return;
        }
        
        // Open new cash session with 0 opening balance
        const openSessionRes = await fetch(`${API}/cash/sessions/open`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            opening_balance: 0,
            notes: `Apertura automática por venta de €${total.toFixed(2)}`
          })
        });
        
        if (!openSessionRes.ok) {
          const errorData = await openSessionRes.json();
          throw new Error(errorData.detail || "No se pudo abrir la caja automáticamente");
        }
        
        toast.success("✅ Nueva caja abierta automáticamente");
      }
      
      // 3. Create rental
      const paid = paymentMethodSelected !== 'pending' ? total : 0;
      
      const rentalResponse = await rentalApi.create({
        customer_id: customer.id,
        start_date: startDate,
        end_date: endDate,
        items: items.map(i => ({ barcode: i.barcode, person_name: "" })),
        payment_method: paymentMethodSelected,
        total_amount: total,
        paid_amount: paid,
        deposit: parseFloat(deposit) || 0,
        notes: notes + (discountReason ? ` | Descuento: ${discountReason}` : '')
      });
      
      // 2. Register cash movement (income) if payment completed
      if (paid > 0) {
        try {
          const API = import.meta.env.VITE_API_URL;
          await fetch(`${API}/cash/movements`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              movement_type: 'income',
              amount: paid,
              payment_method: paymentMethodSelected,
              category: 'rental',
              concept: `Alquiler #${rentalResponse.data.id} - ${customer.name}`,
              reference_id: rentalResponse.data.id,
              notes: `Cliente: ${customer.dni || customer.name}`
            })
          });
        } catch (cashError) {
          console.error("Error registering cash movement:", cashError);
          toast.error("Alquiler creado pero no se pudo registrar en caja. Regístralo manualmente.");
        }
      }
      
      // 3. Store rental data for printing
      setCompletedRental({
        ...rentalResponse.data,
        customer_name: customer.name,
        customer_dni: customer.dni,
        items_detail: items,
        total_amount: total,
        paid_amount: paid,
        change: paymentMethodSelected === "cash" ? cashGivenAmount - total : 0
      });
      
      // Close payment dialog
      setShowPaymentDialog(false);
      setCashGiven("");
      
      // 4. Show success dialog with print button
      setShowSuccessDialog(true);
      
      // 5. Auto-print if enabled
      const autoPrint = localStorage.getItem('auto_print_enabled') === 'true';
      if (autoPrint) {
        setTimeout(() => printRentalTicket(), 500);
      }
      
      toast.success("Alquiler completado y registrado en caja");
      
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear alquiler");
    } finally {
      setProcessingPayment(false);
    }
  };

  const printRentalTicket = () => {

  const printRentalTicket = () => {
    if (!completedRental) return;
    
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    const subtotal_val = completedRental.subtotal || completedRental.total_amount;
    const total_val = completedRental.total_amount;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket de Alquiler</title>
          <style>
            @page { size: 80mm auto; margin: 5mm; }
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 5mm; width: 70mm; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
            .right { text-align: right; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 2px 0; }
          </style>
        </head>
        <body>
          <div class="center bold">
            <h2 style="margin:5px 0;">TICKET DE ALQUILER</h2>
            <p>ID: ${completedRental.id?.substring(0, 8) || 'N/A'}</p>
          </div>
          <div class="line"></div>
          
          <table>
            <tr><td>Cliente:</td><td class="right bold">${completedRental.customer_name}</td></tr>
            <tr><td>DNI:</td><td class="right">${completedRental.customer_dni}</td></tr>
            <tr><td>Fecha inicio:</td><td class="right">${completedRental.start_date}</td></tr>
            <tr><td>Fecha fin:</td><td class="right">${completedRental.end_date}</td></tr>
          </table>
          
          <div class="line"></div>
          <p class="bold">ARTÍCULOS:</p>
          ${completedRental.items_detail.map(item => `
            <table style="margin-bottom: 5px;">
              <tr><td colspan="2" class="bold">${item.brand} ${item.model}</td></tr>
              <tr><td>Talla: ${item.size}</td><td class="right">€${((item.custom_price || item.price_per_day) * (completedRental.num_days || 1)).toFixed(2)}</td></tr>
            </table>
          `).join('')}
          
          <div class="line"></div>
          <table>
            <tr><td>Subtotal:</td><td class="right">€${subtotal_val.toFixed(2)}</td></tr>
            ${total_val < subtotal_val ? `<tr><td>Descuento:</td><td class="right">-€${(subtotal_val - total_val).toFixed(2)}</td></tr>` : ''}
            <tr><td class="bold">TOTAL:</td><td class="right bold">€${total_val.toFixed(2)}</td></tr>
            <tr><td>Pagado:</td><td class="right">€${completedRental.paid_amount.toFixed(2)}</td></tr>
            <tr><td>Método:</td><td class="right">${PAYMENT_METHODS.find(p => p.value === completedRental.payment_method)?.label || completedRental.payment_method}</td></tr>
            ${completedRental.change > 0 ? `<tr><td class="bold">CAMBIO:</td><td class="right bold">€${completedRental.change.toFixed(2)}</td></tr>` : ''}
          </table>
          
          <div class="line"></div>
          <p class="center" style="font-size: 10px;">¡Gracias por confiar en nosotros!</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const closeSuccessDialog = () => {
    setShowSuccessDialog(false);
    setCompletedRental(null);
    resetForm();
  };

    if (!completedRental) return;
    
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket de Alquiler</title>
          <style>
            @page { size: 80mm auto; margin: 5mm; }
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 5mm; width: 70mm; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
            .right { text-align: right; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 2px 0; }
          </style>
        </head>
        <body>
          <div class="center bold">
            <h2 style="margin:5px 0;">TICKET DE ALQUILER</h2>
            <p>ID: ${completedRental.id?.substring(0, 8) || 'N/A'}</p>
          </div>
          <div class="line"></div>
          
          <table>
            <tr><td>Cliente:</td><td class="right bold">${completedRental.customer_name}</td></tr>
            <tr><td>DNI:</td><td class="right">${completedRental.customer_dni}</td></tr>
            <tr><td>Fecha inicio:</td><td class="right">${completedRental.start_date}</td></tr>
            <tr><td>Fecha fin:</td><td class="right">${completedRental.end_date}</td></tr>
          </table>
          
          <div class="line"></div>
          <p class="bold">ARTÍCULOS:</p>
          ${completedRental.items_detail.map(item => `
            <table style="margin-bottom: 5px;">
              <tr><td colspan="2" class="bold">${item.brand} ${item.model}</td></tr>
              <tr><td>Talla: ${item.size}</td><td class="right">€${(item.custom_price || item.price_per_day * numDays).toFixed(2)}</td></tr>
            </table>
          `).join('')}
          
          <div class="line"></div>
          <table>
            <tr><td>Subtotal:</td><td class="right">€${calculateSubtotal().toFixed(2)}</td></tr>
            ${total < subtotal ? `<tr><td>Descuento:</td><td class="right">-€${(subtotal - total).toFixed(2)}</td></tr>` : ''}
            <tr><td class="bold">TOTAL:</td><td class="right bold">€${completedRental.total_amount.toFixed(2)}</td></tr>
            <tr><td>Pagado:</td><td class="right">€${completedRental.paid_amount.toFixed(2)}</td></tr>
            <tr><td>Método:</td><td class="right">${PAYMENT_METHODS.find(p => p.value === paymentMethod)?.label || paymentMethod}</td></tr>
          </table>
          
          <div class="line"></div>
          <p class="center" style="font-size: 10px;">¡Gracias por confiar en nosotros!</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const closeSuccessDialog = () => {
    setShowSuccessDialog(false);
    setCompletedRental(null);
    resetForm();
  };

  const resetForm = () => {
    setCustomer(null);
    setCustomerHistory(null);
    setItems([]);
    setSearchTerm("");
    setPaidAmount("");
    setDeposit("");
    setNotes("");
    setNumDays(1);
    setStartDate(getSmartStartDate());
    setEndDate(getSmartStartDate());
    setDiscountType('none');
    setDiscountValue("");
    setDiscountReason("");
    
    if (searchRef.current) searchRef.current.focus();
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
                      ref={searchRef}
                      placeholder="Busca por nombre o DNI (mínimo 2 caracteres)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
                      className="h-11 pr-10"
                      data-testid="customer-search-input"
                      autoFocus
                      disabled={!!customer}
                    />
                    {searchTerm && !customer && (
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setShowSuggestions(false);
                          searchRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {!customer && (
                    <Button 
                      onClick={searchCustomer} 
                      disabled={searchLoading}
                      className="h-11 px-4"
                      data-testid="customer-search-btn"
                    >
                      {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && customerSuggestions.length > 0 && !customer && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                    <div className="p-2">
                      <p className="text-xs text-slate-500 px-2 py-1 mb-1">
                        {customerSuggestions.length} cliente(s) encontrado(s)
                      </p>
                      {customerSuggestions.map((suggestion, index) => (
                        <button
                          key={suggestion.id}
                          onClick={() => selectCustomer(suggestion)}
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

              {/* Selected Customer Card */}
              {customer && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 animate-fade-in">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-bold text-slate-900 text-lg">{customer.name}</p>
                        {customerHistory?.has_alerts && (
                          <Badge variant="destructive" className="animate-pulse">
                            ⚠️ ALERTA
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 font-mono font-semibold">{customer.dni}</p>
                      <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
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
                      </div>
                      {customer.source && (
                        <div className="mt-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {customer.source}
                            {getProviderDiscount() > 0 && (
                              <span className="ml-1 font-bold">-{getProviderDiscount()}%</span>
                            )}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary" className="font-semibold">
                        {customer.total_rentals || 0} alquileres
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCustomer(null);
                          setCustomerHistory(null);
                          setSearchTerm("");
                          setTimeout(() => searchRef.current?.focus(), 100);
                        }}
                        className="h-7 px-2"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cambiar
                      </Button>
                    </div>
                  </div>
                  
                  {/* Alerts Section */}
                  {customerHistory?.has_alerts && customerHistory.overdue_rentals > 0 && (
                    <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-red-900">
                            Cliente con {customerHistory.overdue_rentals} alquiler(es) vencido(s)
                          </p>
                          <p className="text-xs text-red-700 mt-1">
                            Verifica el estado antes de proceder con un nuevo alquiler
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Customer Notes */}
                  {customer.notes && (
                    <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1">
                        📝 Observaciones
                      </p>
                      <p className="text-sm text-amber-800">{customer.notes}</p>
                    </div>
                  )}

                  {/* Preferred Sizes */}
                  {customerHistory?.preferred_sizes && Object.keys(customerHistory.preferred_sizes).length > 0 && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <p className="text-xs font-semibold text-emerald-900 mb-2 flex items-center gap-1">
                        <History className="h-3 w-3" /> Tallas Habituales (histórico)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(customerHistory.preferred_sizes).map(([type, sizes]) => (
                          <Badge key={type} className="bg-emerald-100 text-emerald-800 border-emerald-300">
                            <strong>{type}:</strong>&nbsp;{sizes.join(", ")}
                          </Badge>
                        ))}
                      </div>
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
                <Calendar className="h-5 w-5 text-primary" />
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
                    onKeyDown={handleDaysKeyDown}
                    className="h-14 text-3xl font-bold text-center w-24 border-primary/30"
                    data-testid="num-days-input"
                  />
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-2 text-lg font-medium text-slate-700">
                      <span>{formatDateDisplay(startDate)}</span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                      <span>{formatDateDisplay(endDate)}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {numDays} {numDays === 1 ? 'día' : 'días'}
                    </p>
                  </div>
                </div>
              </div>

              {showTimeHint && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg animate-fade-in">
                  <Clock className="h-3 w-3" />
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
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-slate-500" />
                Artículos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barcode + Manual Search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    ref={barcodeRef}
                    placeholder="Escanear código de barras..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={addItemByBarcode}
                    className="h-12 pl-10 text-lg font-mono"
                    data-testid="barcode-input"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowItemSearch(true)}
                  className="h-12 px-4"
                  data-testid="manual-search-btn"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>
              <p className="text-xs text-slate-500">Escanea el código o pulsa F3 / Alt+B para buscar manualmente</p>

              <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <Package className="h-12 w-12 mb-2" />
                    <p>Escanea artículos para añadirlos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Items List - Optimized with Priority Columns */}
                    {items.map((item, index) => {
                      const itemPrice = getItemPriceWithPack(item);
                      
                      return (
                        <div 
                          key={item.barcode}
                          className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors animate-fade-in"
                        >
                          {/* Código Interno - Priority #1 */}
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500 font-medium uppercase">Código</p>
                            <p className="font-mono font-bold text-slate-900">{item.barcode}</p>
                          </div>
                          
                          {/* Tipo de Artículo - Priority #2 */}
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500 font-medium uppercase">Tipo</p>
                            <Badge variant="outline" className="font-semibold">{item.item_type}</Badge>
                          </div>
                          
                          {/* Modelo - Priority #3 */}
                          <div className="col-span-3">
                            <p className="text-xs text-slate-500 font-medium uppercase">Modelo</p>
                            <p className="font-medium text-slate-900">{item.brand} {item.model}</p>
                          </div>
                          
                          {/* Talla/Tamaño - Priority #4 */}
                          <div className="col-span-1">
                            <p className="text-xs text-slate-500 font-medium uppercase">Talla</p>
                            <Badge variant="outline" className="text-sm font-bold">
                              {item.size}
                            </Badge>
                          </div>
                          
                          {/* Categoría */}
                          <div className="col-span-2">
                            <Badge className={`${
                              item.category === 'ALTA' ? 'bg-purple-100 text-purple-700' :
                              item.category === 'MEDIA' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            } text-xs`}>
                              {item.category}
                            </Badge>
                          </div>
                          
                          {/* Precio y Acciones */}
                          <div className="col-span-2 flex items-center justify-end gap-2">
                            <div 
                              className="cursor-pointer hover:bg-slate-200 px-2 py-1 rounded transition-colors flex items-center gap-1"
                              onClick={() => setEditingItemPrice(item.barcode)}
                              title="Click para editar precio"
                            >
                              <div className="text-right">
                                <p className="text-sm font-semibold text-slate-900">
                                  €{itemPrice.toFixed(2)}
                                </p>
                                <p className="text-xs text-slate-500">{numDays}d</p>
                              </div>
                              <Edit2 className="h-3 w-3 opacity-50" />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.barcode)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Card */}
          <Card className="border-slate-200">
            <CardContent className="pt-6">
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
                <div className="flex-1">
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
                      <Badge className="bg-emerald-100 text-emerald-700">
                        -€{(subtotal - total).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={completeRental}
                  disabled={loading || !customer || items.length === 0}
                  className="h-14 px-8 text-lg font-semibold"
                  data-testid="complete-rental-btn"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Check className="h-5 w-5 mr-2" />
                  )}
                  Completar Alquiler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent className="sm:max-w-md">
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
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="h-11 mt-1"
                  data-testid="new-customer-phone"
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
            <Button variant="outline" onClick={() => setShowNewCustomer(false)}>
              Cancelar
            </Button>
            <Button onClick={createNewCustomer} data-testid="save-new-customer-btn">
              Guardar Cliente
            </Button>
          </DialogFooter>
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
                  Completar Pack - Buscar {ITEM_TYPES.find(t => t.value === searchFilter.type)?.label || searchFilter.type}
                </>
              ) : (
                "Buscar Artículo Manualmente"
              )}
            </DialogTitle>
            {searchFilter && (
              <p className="text-sm text-amber-600">
                Mostrando artículos de tipo <strong>{ITEM_TYPES.find(t => t.value === searchFilter.type)?.label}</strong> en categoría <strong>{searchFilter.category}</strong> para completar el pack
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
                {ITEM_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={itemSearchCategory} onValueChange={setItemSearchCategory}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
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
                          <Badge className={`${getCategoryBadge(item.category || 'MEDIA')} text-xs`}>
                            {item.category || 'MEDIA'}
                          </Badge>
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
            <Button variant="outline" onClick={() => setShowItemSearch(false)}>
              Cerrar
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 text-xl">
              <CheckCircle className="h-7 w-7" />
              ¡Alquiler Completado!
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div className="p-4 rounded-lg bg-emerald-50 border-2 border-emerald-200">
              <p className="text-sm font-semibold text-emerald-900">
                <strong>Cliente:</strong> {completedRental?.customer_name}
              </p>
              <p className="text-sm font-semibold text-emerald-900 mt-2">
                <strong>Total pagado:</strong> €{completedRental?.paid_amount?.toFixed(2)}
              </p>
              <p className="text-xs text-emerald-700 mt-2">
                ID: {completedRental?.id?.substring(0, 8)}
              </p>
            </div>
            
            <Button 
              onClick={printRentalTicket}
              className="w-full h-16 text-xl font-bold bg-primary hover:bg-primary/90 shadow-lg"
              size="lg"
            >
              <Printer className="h-6 w-6 mr-3" />
              🖨️ IMPRIMIR TICKET DE ALQUILER
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
