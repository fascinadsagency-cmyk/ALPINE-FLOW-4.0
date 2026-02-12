import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rentalApi } from "@/lib/api";
import { printTicket, getStoredSettings } from "@/lib/ticketGenerator";
import { useSettings } from "@/contexts/SettingsContext";
import { useScannerListener } from "@/hooks/useScannerListener";
import { toast } from "sonner";
import axios from "axios";
import { 
  ShoppingCart, 
  User, 
  Calendar, 
  CalendarPlus,
  DollarSign, 
  Loader2,
  ArrowRight,
  AlertCircle,
  CreditCard,
  Banknote,
  Printer,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  RefreshCw,
  Scan,
  ArrowLeftRight,
  Zap,
  Eye,
  ChevronDown,
  Search,
  RotateCcw,
  X,
  ExternalLink,
  FileText,
  History,
  AlertTriangle,
  Star,
  FileWarning,
  Ruler,
  Scale,
  Mountain,
  Edit3,
  Edit2,
  Save,
  Lock,
  Check,
  Plus,
  Minus,
  Clock
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "card", label: "Tarjeta", icon: CreditCard },
];

export default function ActiveRentals() {
  const navigate = useNavigate();
  const settings = useSettings();
  const { darkMode, t } = settings;
  const [rentals, setRentals] = useState([]);
  const [filteredRentals, setFilteredRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ============ SMART SEARCH STATE ============
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef(null);
  
  // Payment method for operations
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [updating, setUpdating] = useState(false);

  // Customer modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  
  // Technical data editing state
  const [editingTechnicalData, setEditingTechnicalData] = useState(false);
  const [technicalDataExpanded, setTechnicalDataExpanded] = useState(false); // Accordion state
  const [technicalDataForm, setTechnicalDataForm] = useState({
    boot_size: "",
    height: "",
    weight: "",
    ski_level: ""
  });
  const [savingTechnicalData, setSavingTechnicalData] = useState(false);

  // ============ GESTIÓN DE CAMBIOS MODAL STATE (Idéntico a Devoluciones) ============
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [changeRental, setChangeRental] = useState(null);
  const [changeItems, setChangeItems] = useState([]); // Array of items with swap info
  const [activeSwapIndex, setActiveSwapIndex] = useState(null);
  const [changeNewBarcode, setChangeNewBarcode] = useState("");
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeComplete, setChangeComplete] = useState(false);
  const [changePaymentMethod, setChangePaymentMethod] = useState("cash");
  const changeInputRef = useRef(null);
  
  // Date adjustment state for change modal
  const [changeAdjustDate, setChangeAdjustDate] = useState(false);
  const [changeNewEndDate, setChangeNewEndDate] = useState("");
  const [changeDaysRemaining, setChangeDaysRemaining] = useState(0);
  const [changeOriginalDays, setChangeOriginalDays] = useState(0);
  const [changeNewTotalDays, setChangeNewTotalDays] = useState(0);
  const [changeDateDelta, setChangeDateDelta] = useState(0);
  const [changeTotalDelta, setChangeTotalDelta] = useState(0);
  const [changeMaterialDelta, setChangeMaterialDelta] = useState(0);
  // Días a descontar (no facturables) para descuentos por cierre de estación o enfermedad
  const [changeDiscountDays, setChangeDiscountDays] = useState(0);
  const [changeRefundAmount, setChangeRefundAmount] = useState(0); // Importe a devolver por días descontados

  // ============ QUICK PAYMENT MODAL STATE ============
  const [quickPaymentModalOpen, setQuickPaymentModalOpen] = useState(false);
  const [quickPaymentRental, setQuickPaymentRental] = useState(null);
  const [quickPaymentAmount, setQuickPaymentAmount] = useState(0);
  const [quickPaymentMethod, setQuickPaymentMethod] = useState("cash");
  const [quickPaymentProcessing, setQuickPaymentProcessing] = useState(false);


  // ============ ADD ITEMS MODAL STATE ============
  const [addItemsModalOpen, setAddItemsModalOpen] = useState(false);
  const [addItemsRental, setAddItemsRental] = useState(null);
  const [addItemsSelected, setAddItemsSelected] = useState([]); // Items nuevos a añadir
  const [addItemsSearch, setAddItemsSearch] = useState("");
  const [addItemsDays, setAddItemsDays] = useState(0); // Días restantes del alquiler
  const [addItemsChargeNow, setAddItemsChargeNow] = useState(true);
  const [addItemsPaymentMethod, setAddItemsPaymentMethod] = useState("cash");
  const [addItemsProcessing, setAddItemsProcessing] = useState(false);
  const [addItemsSearchResults, setAddItemsSearchResults] = useState([]);
  const [addItemsSearchLoading, setAddItemsSearchLoading] = useState(false);
  // Estados para lógica de packs
  const [addItemsPacks, setAddItemsPacks] = useState([]); // Packs disponibles de la tienda
  const [addItemsTariffs, setAddItemsTariffs] = useState([]); // Tarifas disponibles
  const [addItemsExistingItems, setAddItemsExistingItems] = useState([]); // Items del alquiler original
  const addItemsSearchRef = useRef(null); // Ref para autofocus


  // ============ ADD ITEMS MODAL FUNCTIONS ============
  
  // Cargar packs y tarifas de la tienda
  const loadPacksAndTariffs = async () => {
    try {
      const [packsRes, tariffsRes] = await Promise.all([
        axios.get(`${API}/packs`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API}/tariffs`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      setAddItemsPacks(packsRes.data || []);
      setAddItemsTariffs(tariffsRes.data || []);
    } catch (error) {
      console.error("[AddItems] Error cargando packs/tarifas:", error);
    }
  };

  const openAddItemsModal = async (rental) => {
    // Calcular días restantes por defecto
    const today = new Date();
    const endDate = new Date(rental.end_date);
    const daysRemaining = Math.max(1, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
    
    setAddItemsRental(rental);
    setAddItemsDays(daysRemaining);
    setAddItemsSelected([]);
    setAddItemsSearch("");
    setAddItemsSearchResults([]);
    setAddItemsChargeNow(true);
    setAddItemsPaymentMethod("cash");
    
    // Guardar los items existentes del alquiler para detección de packs
    const existingItems = (rental.items || []).filter(i => !i.returned).map(i => ({
      barcode: i.barcode,
      item_type: i.item_type,
      name: i.name || i.item_type,
      unit_price: i.unit_price || 0
    }));
    setAddItemsExistingItems(existingItems);
    
    // Cargar packs y tarifas
    await loadPacksAndTariffs();
    
    setAddItemsModalOpen(true);
    
    // Focus en el input de búsqueda después de abrir
    setTimeout(() => {
      if (addItemsSearchRef.current) {
        addItemsSearchRef.current.focus();
      }
    }, 100);
  };

  // Buscar artículos disponibles para añadir
  const searchAvailableItems = async (query) => {
    if (!query || query.trim().length < 2) {
      setAddItemsSearchResults([]);
      return;
    }
    
    setAddItemsSearchLoading(true);
    try {
      const response = await axios.get(`${API}/items?search=${encodeURIComponent(query)}&status=available&limit=20`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Filtrar solo artículos disponibles
      const availableItems = response.data.filter(item => item.status === 'available');
      setAddItemsSearchResults(availableItems);
    } catch (error) {
      console.error("[AddItems] Error buscando artículos:", error);
      toast.error("Error al buscar artículos");
      setAddItemsSearchResults([]);
    } finally {
      setAddItemsSearchLoading(false);
    }
  };

  // Manejar cambio en búsqueda con debounce manual
  const handleAddItemsSearchChange = (e) => {
    const value = e.target.value;
    setAddItemsSearch(value);
    
    // Debounce de 300ms
    clearTimeout(window.addItemsSearchTimeout);
    window.addItemsSearchTimeout = setTimeout(() => {
      searchAvailableItems(value);
    }, 300);
  };

  // Manejar Enter para búsqueda inmediata o escaneo
  const handleAddItemsSearchKeyDown = async (e) => {
    if (e.key === 'Enter' && addItemsSearch.trim()) {
      e.preventDefault();
      clearTimeout(window.addItemsSearchTimeout);
      
      // Buscar por código exacto primero (comportamiento de escáner)
      try {
        const response = await axios.get(`${API}/items/barcode/${encodeURIComponent(addItemsSearch.trim())}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.data && response.data.status === 'available') {
          addItemToRental(response.data);
          return;
        } else if (response.data) {
          toast.warning(`Artículo ${addItemsSearch} no está disponible (${response.data.status})`);
          setAddItemsSearch("");
          return;
        }
      } catch {
        // No encontrado por código exacto, hacer búsqueda normal
        await searchAvailableItems(addItemsSearch);
      }
    }
  };
  
  // Obtener precio de tarifa para un tipo de artículo
  const getAddItemsTariffPrice = (itemType, days) => {
    const tariff = addItemsTariffs.find(t => 
      t.item_type?.toLowerCase() === itemType?.toLowerCase()
    );
    
    if (!tariff) return 0;
    
    // Usar tarifa escalonada
    if (days <= 10) {
      return tariff[`day_${days}`] || tariff.day_1 || 0;
    }
    return tariff.day_11_plus || tariff.day_1 || 0;
  };
  
  // Obtener precio de pack para días específicos
  const getAddItemsPackPrice = (pack, days) => {
    if (!pack) return 0;
    
    if (days <= 10 && pack[`day_${days}`]) {
      return pack[`day_${days}`];
    }
    if (days > 10 && pack.day_11_plus) {
      return pack.day_11_plus;
    }
    return pack.day_1 || 0;
  };
  
  // Detectar packs en el carrito combinado (items existentes + nuevos)
  const detectAddItemsPacks = (newItems) => {
    if (!addItemsPacks || addItemsPacks.length === 0) return [];
    
    // Combinar items existentes con nuevos
    const allItems = [...addItemsExistingItems, ...newItems];
    if (allItems.length === 0) return [];
    
    const detectedPackInstances = [];
    const usedBarcodes = new Set();
    
    // Intentar formar packs
    let foundPack = true;
    while (foundPack) {
      foundPack = false;
      
      for (const pack of addItemsPacks) {
        // Items disponibles (no usados aún)
        const availableItems = allItems.filter(item => !usedBarcodes.has(item.barcode));
        
        // Contar tipos disponibles
        const availableTypeCounts = availableItems.reduce((acc, item) => {
          const normalizedType = item.item_type?.toLowerCase() || '';
          acc[normalizedType] = (acc[normalizedType] || 0) + 1;
          return acc;
        }, {});
        
        // Contar componentes requeridos
        const requiredComponents = pack.items.reduce((acc, itemType) => {
          const normalizedType = itemType?.toLowerCase() || '';
          acc[normalizedType] = (acc[normalizedType] || 0) + 1;
          return acc;
        }, {});
        
        // Verificar si podemos formar este pack
        let canFormPack = true;
        for (const [type, count] of Object.entries(requiredComponents)) {
          if ((availableTypeCounts[type] || 0) < count) {
            canFormPack = false;
            break;
          }
        }
        
        if (canFormPack) {
          const packInstanceItems = [];
          
          for (const requiredType of pack.items) {
            const item = availableItems.find(i => 
              i.item_type?.toLowerCase() === requiredType?.toLowerCase() && 
              !packInstanceItems.includes(i.barcode) &&
              !usedBarcodes.has(i.barcode)
            );
            if (item) {
              packInstanceItems.push(item.barcode);
              usedBarcodes.add(item.barcode);
            }
          }
          
          if (packInstanceItems.length === pack.items.length) {
            // Determinar qué items son nuevos vs existentes
            const existingBarcodes = new Set(addItemsExistingItems.map(i => i.barcode));
            const isNewPack = packInstanceItems.some(bc => !existingBarcodes.has(bc));
            const hasExistingItems = packInstanceItems.some(bc => existingBarcodes.has(bc));
            
            detectedPackInstances.push({
              pack: pack,
              items: packInstanceItems,
              instanceId: `pack-${Date.now()}-${detectedPackInstances.length}`,
              isNewPack: isNewPack,
              hasExistingItems: hasExistingItems,
              // Marcar si es un pack mixto (existente + nuevo)
              isMixedPack: isNewPack && hasExistingItems
            });
            
            foundPack = true;
            break;
          }
        }
      }
    }
    
    return detectedPackInstances;
  };
  
  // Calcular precio total considerando packs (sin modificar estado)
  const calculateAddItemsTotalWithPacks = () => {
    const days = addItemsDays;
    const detectedPacks = detectAddItemsPacks(addItemsSelected);
    
    // Combinar todos los items
    const allItems = [...addItemsExistingItems, ...addItemsSelected];
    
    // Identificar qué items están en packs
    const itemsInPacks = new Set();
    detectedPacks.forEach(dp => {
      dp.items.forEach(bc => itemsInPacks.add(bc));
    });
    
    let totalNew = 0;
    
    // Calcular precio de packs
    detectedPacks.forEach(dp => {
      const packPrice = getAddItemsPackPrice(dp.pack, days);
      
      if (dp.isMixedPack) {
        // Pack mixto: cobrar precio del pack completo
        // pero descontar lo que ya se pagó por los items existentes
        const existingBarcodes = new Set(addItemsExistingItems.map(i => i.barcode));
        const existingItemsInPack = dp.items.filter(bc => existingBarcodes.has(bc));
        const existingItemsPrice = existingItemsInPack.reduce((sum, bc) => {
          const item = addItemsExistingItems.find(i => i.barcode === bc);
          return sum + (item?.unit_price || 0);
        }, 0);
        
        // La diferencia a cobrar es: precio pack - lo ya pagado
        const difference = Math.max(0, packPrice - existingItemsPrice);
        totalNew += difference;
      } else if (dp.isNewPack) {
        // Pack completamente nuevo
        totalNew += packPrice;
      }
      // Los packs que son solo de items existentes no se cobran de nuevo
    });
    
    // Calcular precio de items sueltos (no en packs)
    addItemsSelected.forEach(item => {
      if (!itemsInPacks.has(item.barcode)) {
        const itemPrice = getAddItemsTariffPrice(item.item_type, days);
        totalNew += itemPrice;
      }
    });
    
    return {
      total: totalNew,
      detectedPacks: detectedPacks,
      packSavings: calculatePackSavings(detectedPacks, days)
    };
  };
  
  // Calcular ahorro por usar packs
  const calculatePackSavings = (detectedPacks, days) => {
    let savings = 0;
    
    detectedPacks.forEach(dp => {
      if (dp.isNewPack || dp.isMixedPack) {
        // Precio si se cobraran individualmente
        const individualPrice = dp.pack.items.reduce((sum, itemType) => {
          return sum + getAddItemsTariffPrice(itemType, days);
        }, 0);
        
        // Precio del pack
        const packPrice = getAddItemsPackPrice(dp.pack, days);
        
        savings += Math.max(0, individualPrice - packPrice);
      }
    });
    
    return savings;
  };
  
  const addItemToRental = (item) => {
    // Verificar que no esté ya agregado
    if (addItemsSelected.find(i => i.barcode === item.barcode)) {
      toast.warning("Este artículo ya está en la lista");
      return;
    }
    
    // Verificar que no esté en el alquiler original
    if (addItemsExistingItems.find(i => i.barcode === item.barcode)) {
      toast.warning("Este artículo ya está en el alquiler");
      return;
    }
    
    const newItem = {
      barcode: item.barcode,
      internal_code: item.internal_code,
      name: item.name || item.item_type,
      item_type: item.item_type,
      size: item.size,
      days: addItemsDays,
      unit_price: getAddItemsTariffPrice(item.item_type, addItemsDays),
      person_name: ""
    };
    
    const newSelected = [...addItemsSelected, newItem];
    setAddItemsSelected(newSelected);
    setAddItemsSearch("");
    setAddItemsSearchResults([]);
    
    toast.success(`Artículo añadido: ${newItem.name} (${item.internal_code || item.barcode})`);
  };
  
  const removeItemFromAddList = (barcode) => {
    const newSelected = addItemsSelected.filter(i => i.barcode !== barcode);
    setAddItemsSelected(newSelected);
  };
  
  // Manejar cambio de días - recalcular precios
  const handleAddItemsDaysChange = (newDays) => {
    const days = Math.max(1, parseInt(newDays) || 1);
    setAddItemsDays(days);
    
    // Recalcular precios de todos los items
    const updatedItems = addItemsSelected.map(item => ({
      ...item,
      days: days,
      unit_price: getAddItemsTariffPrice(item.item_type, days)
    }));
    setAddItemsSelected(updatedItems);
  };
  
  const confirmAddItems = async () => {
    if (addItemsSelected.length === 0) {
      toast.error("Selecciona al menos un artículo");
      return;
    }
    
    // Calcular total con lógica de packs
    const { total } = calculateAddItemsTotalWithPacks();
    
    setAddItemsProcessing(true);
    try {
      const response = await axios.post(
        `${API}/rentals/${addItemsRental.id}/add-items`,
        {
          items: addItemsSelected.map(item => ({
            barcode: item.barcode,
            unit_price: item.unit_price,
            person_name: item.person_name
          })),
          days: addItemsDays,
          charge_now: addItemsChargeNow,
          payment_method: addItemsPaymentMethod,
          // Enviar el total calculado con packs
          calculated_total: total
        },
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      const addedCount = response.data.items_added;
      const additionalAmount = response.data.additional_amount;
      
      if (response.data.charged_now) {
        toast.success(`✅ ${addedCount} artículo(s) añadido(s) y cobrado €${additionalAmount.toFixed(2)}`);
      } else {
        toast.success(`✅ ${addedCount} artículo(s) añadido(s). €${additionalAmount.toFixed(2)} marcado como pendiente`);
      }
      
      setAddItemsModalOpen(false);
      loadActiveRentals();
    } catch (error) {
      console.error("[AddItems] Error:", error);
      const errorMsg = error.response?.data?.detail || error.message || "Error al añadir artículos";
      toast.error(errorMsg);
    } finally {
      setAddItemsProcessing(false);
    }
  };

  // ============ LEGACY SWAP MODAL STATE (keeping for backward compatibility) ============
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapRental, setSwapRental] = useState(null); // The rental being swapped
  const [swapBarcode, setSwapBarcode] = useState(""); // Scanned barcode
  const [swapNewItem, setSwapNewItem] = useState(null); // New item detected
  const [swapOldItem, setSwapOldItem] = useState(null); // Old item to be replaced (auto-detected)
  const [swapDaysRemaining, setSwapDaysRemaining] = useState(0);
  const [swapNewDays, setSwapNewDays] = useState(""); // Optional new duration
  const [swapDelta, setSwapDelta] = useState(null); // Price difference for material
  const [swapPaymentMethod, setSwapPaymentMethod] = useState("cash");
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapComplete, setSwapComplete] = useState(false);
  const [swapAction, setSwapAction] = useState("swap"); // "swap" or "return"
  const swapInputRef = useRef(null);
  
  // ============ DATE ADJUSTMENT STATE (Combined with swap) ============
  const [dateAdjustActive, setDateAdjustActive] = useState(false);
  const [originalEndDate, setOriginalEndDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [originalDays, setOriginalDays] = useState(0);
  const [newTotalDays, setNewTotalDays] = useState(0);
  const [dateDelta, setDateDelta] = useState(0); // Price difference for date change
  const [combinedDelta, setCombinedDelta] = useState(0); // Material + Date combined

  // ============ PAYMENT METHOD EDITOR STATE ============
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [editingRental, setEditingRental] = useState(null);
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [savingPaymentMethod, setSavingPaymentMethod] = useState(false);

  // ============ GLOBAL BARCODE SCANNER ============
  // Ref para almacenar la función openChangeModal (evita dependencias circulares)
  const openChangeModalRef = useRef(null);
  
  // Handle global barcode scan - searches for rental by customer DNI or item barcode
  const handleGlobalScan = useCallback(async (scannedCode) => {
    console.log('[SCANNER] Global scan detected in ActiveRentals:', scannedCode);
    
    // Update search query for visual feedback
    setSearchQuery(scannedCode);
    
    // Search in current rentals by DNI or item barcode
    const code = scannedCode.toUpperCase().trim();
    
    // Filter rentals that match the scanned code
    const matched = rentals.filter(rental => {
      // Match by customer DNI
      if (rental.customer_dni?.toUpperCase().includes(code)) return true;
      
      // Match by item barcode or internal code
      if (rental.items?.some(item => 
        item.barcode?.toUpperCase().includes(code) ||
        item.internal_code?.toUpperCase().includes(code)
      )) return true;
      
      return false;
    });
    
    if (matched.length === 1) {
      // Single match - open the change modal directly
      toast.success(`Alquiler encontrado: ${matched[0].customer_name}`);
      if (openChangeModalRef.current) {
        openChangeModalRef.current(matched[0]);
      }
    } else if (matched.length > 1) {
      // Multiple matches - filter the list
      setFilteredRentals(matched);
      toast.info(`${matched.length} alquileres encontrados`);
    } else {
      // No matches found
      toast.error(`No se encontró ningún alquiler con: ${scannedCode}`);
      // Keep showing all rentals
      setFilteredRentals(rentals);
    }
  }, [rentals]);

  // Configure global scanner listener
  const { isScanning: globalScannerActive } = useScannerListener({
    onScan: handleGlobalScan,
    inputRef: searchInputRef,
    // Disable scanner when modals are open
    enabled: !changeModalOpen && !addItemsModalOpen && !quickPaymentModalOpen && !showCustomerModal,
    minLength: 3,
    maxTimeBetweenKeys: 50,
    scannerDetectionThreshold: 4,
    autoFocus: true,
  });

  useEffect(() => {
    loadActiveRentals();
  }, []);

  // Auto-focus search input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Filter rentals when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRentals(rentals);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = rentals.filter(r => 
        r.customer_name?.toLowerCase().includes(query) ||
        r.customer_dni?.toLowerCase().includes(query) ||
        r.items?.some(i => 
          i.internal_code?.toLowerCase().includes(query) ||
          i.barcode?.toLowerCase().includes(query)
        )
      );
      setFilteredRentals(filtered);
    }
  }, [searchQuery, rentals]);

  const loadActiveRentals = async () => {
    setLoading(true);
    try {
      const response = await rentalApi.getAll({ status: 'active' });
      setRentals(response.data);
      setFilteredRentals(response.data);
    } catch (error) {
      toast.error("Error al cargar alquileres");
    } finally {
      setLoading(false);
    }
  };

  // ============ QUICK PAYMENT FUNCTIONS ============
  
  const openQuickPaymentModal = (rental) => {
    setQuickPaymentRental(rental);
    setQuickPaymentAmount(rental.pending_amount || 0);
    setQuickPaymentMethod("cash");
    setQuickPaymentModalOpen(true);
  };

  const closeQuickPaymentModal = () => {
    setQuickPaymentModalOpen(false);
    setQuickPaymentRental(null);
    setQuickPaymentAmount(0);
  };

  const processQuickPayment = async () => {
    if (!quickPaymentRental || quickPaymentAmount <= 0) {
      toast.error("Importe inválido");
      return;
    }

    setQuickPaymentProcessing(true);
    try {
      // Call the existing payment endpoint
      const response = await axios.post(
        `${API}/rentals/${quickPaymentRental.id}/payment`,
        {
          amount: quickPaymentAmount,
          payment_method: quickPaymentMethod
        },
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );

      // Update local state to reflect the payment instantly
      const updatedRentals = rentals.map(r => {
        if (r.id === quickPaymentRental.id) {
          return {
            ...r,
            paid_amount: response.data.paid_amount,
            pending_amount: response.data.pending_amount,
            payment_method: response.data.pending_amount === 0 ? quickPaymentMethod : r.payment_method
          };
        }
        return r;
      });
      
      setRentals(updatedRentals);
      setFilteredRentals(updatedRentals.filter(r => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return r.customer_name?.toLowerCase().includes(query) ||
               r.customer_dni?.toLowerCase().includes(query) ||
               r.items?.some(i => 
                 i.internal_code?.toLowerCase().includes(query) ||
                 i.barcode?.toLowerCase().includes(query)
               );
      }));

      toast.success(`✅ Pago de €${quickPaymentAmount.toFixed(2)} registrado correctamente`);
      closeQuickPaymentModal();
      
    } catch (error) {
      console.error("[QuickPayment] Error:", error);
      const errorMsg = error.response?.data?.detail || "Error al procesar el pago";
      toast.error(errorMsg);
    } finally {
      setQuickPaymentProcessing(false);
    }
  };

  // ============ GESTIÓN DE CAMBIOS FUNCTIONS (Idéntico a Devoluciones) ============
  
  // Función para obtener el código interno de un item por su barcode
  const enrichItemsWithInternalCode = async (items) => {
    const barcodes = items.map(i => i.barcode).filter(Boolean);
    if (barcodes.length === 0) return items;
    
    try {
      // Buscar los items por sus barcodes para obtener internal_code
      const response = await axios.get(`${API_URL}/items/by-barcodes`, {
        params: { barcodes: barcodes.join(',') },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const itemsMap = {};
      (response.data || []).forEach(item => {
        itemsMap[item.barcode] = item;
      });
      
      // Enriquecer cada item con su internal_code
      return items.map(item => ({
        ...item,
        internal_code: itemsMap[item.barcode]?.internal_code || item.internal_code || ''
      }));
    } catch (error) {
      console.error('Error enriching items with internal_code:', error);
      return items;
    }
  };
  
  const openChangeModal = async (rental) => {
    const rentalDays = rental.days || 1;
    
    // Get all pending items from the rental
    let pendingItems = (rental.pending_items || rental.items || [])
      .filter(i => !i.returned)
      .map((item, idx) => ({
        ...item,
        originalIndex: idx,
        swapNewItem: null,
        swapDelta: 0,
        isSwapping: false,
        swapType: null // 'upgrade', 'downgrade', 'technical'
      }));
    
    // Enriquecer items con internal_code
    pendingItems = await enrichItemsWithInternalCode(pendingItems);
    
    // Calculate REAL days remaining: End Date - Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = rental.end_date ? new Date(rental.end_date) : new Date();
    endDate.setHours(0, 0, 0, 0);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysRemaining = Math.ceil((endDate - today) / msPerDay);
    
    setChangeRental({
      ...rental,
      days: rentalDays,
      pricePerDay: rental.total_amount / rentalDays
    });
    setChangeItems(pendingItems);
    setActiveSwapIndex(null);
    setChangeNewBarcode("");
    
    // Reset financial tracking
    setChangeMaterialDelta(0);
    setChangeTotalDelta(0);
    setChangeDiscountDays(0);  // Reset días a descontar
    setChangeRefundAmount(0);  // Reset importe a devolver
    
    // Set days remaining correctly
    setChangeDaysRemaining(daysRemaining);
    setChangeOriginalDays(rentalDays);
    setChangeNewTotalDays(rentalDays);
    setChangeNewEndDate(rental.end_date ? rental.end_date.split('T')[0] : "");
    setChangeAdjustDate(false);
    setChangeDateDelta(0);
    
    setChangeComplete(false);
    // SECURITY: Pre-select original payment method for refunds
    setChangePaymentMethod(rental.payment_method || "cash");
    setChangeModalOpen(true);
  };

  // Store ref for global scanner callback
  openChangeModalRef.current = openChangeModal;

  const closeChangeModal = () => {
    setChangeModalOpen(false);
    setChangeRental(null);
    setChangeItems([]);
    setActiveSwapIndex(null);
    setChangeMaterialDelta(0);
    setChangeTotalDelta(0);
    setChangeDiscountDays(0);  // Reset días a descontar
    setChangeRefundAmount(0);  // Reset importe a devolver
    setChangeComplete(false);
    // Auto-focus search input after closing modal
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  // Calculate time delta when days change in change modal
  const handleChangeDateAdjustment = (newEndDateStr, discountDays = changeDiscountDays) => {
    if (!changeRental || !newEndDateStr) return;
    
    setChangeNewEndDate(newEndDateStr);
    
    // Calculate new total days from original start date to new end date (Días Físicos)
    const startDate = new Date(changeRental.start_date);
    startDate.setHours(0, 0, 0, 0);
    const newEnd = new Date(newEndDateStr);
    newEnd.setHours(0, 0, 0, 0);
    const msPerDay = 24 * 60 * 60 * 1000;
    
    const physicalDays = Math.ceil((newEnd - startDate) / msPerDay) + 1;
    
    // Días a Cobrar = Días Físicos - Días a descontar
    const chargableDays = Math.max(1, physicalDays - discountDays);
    
    // Calculate price difference based on chargable days vs original days
    const daysDiff = chargableDays - changeOriginalDays;
    const pricePerDay = changeRental.total_amount / changeOriginalDays;
    const newDateDelta = daysDiff * pricePerDay;
    
    // Calculate refund amount from discount days (if already paid)
    const refundFromDiscount = discountDays * pricePerDay;
    
    setChangeNewTotalDays(physicalDays);
    setChangeDateDelta(newDateDelta);
    setChangeRefundAmount(refundFromDiscount);
    
    // Update days remaining
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newDaysRemaining = Math.ceil((newEnd - today) / msPerDay);
    setChangeDaysRemaining(newDaysRemaining);
    
    // Recalculate total delta
    recalculateChangeTotalDelta(newDateDelta, changeMaterialDelta);
  };

  // Handle change of discount days
  const handleChangeDiscountDays = (days) => {
    const validDays = Math.max(0, Math.min(days, changeNewTotalDays - 1));
    setChangeDiscountDays(validDays);
    
    // Recalculate with new discount days
    if (changeNewEndDate) {
      handleChangeDateAdjustment(changeNewEndDate, validDays);
    }
  };

  // Recalculate total delta
  const recalculateChangeTotalDelta = (dateDelta, materialDelta) => {
    setChangeTotalDelta(dateDelta + materialDelta);
  };

  // Recalculate material delta from all items
  const recalculateChangeMaterialDelta = (items) => {
    const total = items.reduce((sum, item) => {
      if (item.isSwapping && item.swapDelta) {
        return sum + item.swapDelta;
      }
      return sum;
    }, 0);
    setChangeMaterialDelta(total);
    recalculateChangeTotalDelta(changeDateDelta, total);
  };

  // Start swap mode for item
  const startItemSwap = (index) => {
    setActiveSwapIndex(index);
    setChangeNewBarcode("");
    setTimeout(() => changeInputRef.current?.focus(), 100);
  };

  // Cancel swap for item
  const cancelItemSwap = (index) => {
    const updated = [...changeItems];
    updated[index] = {
      ...updated[index],
      swapNewItem: null,
      swapDelta: 0,
      isSwapping: false,
      swapType: null
    };
    setChangeItems(updated);
    setActiveSwapIndex(null);
    recalculateChangeMaterialDelta(updated);
  };

  // Search and assign new item for swap in change modal
  const searchChangeSwapItem = async (code) => {
    if (!code.trim() || activeSwapIndex === null || !changeRental) return;
    
    setChangeLoading(true);
    try {
      const response = await axios.get(`${API}/items?search=${code}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const items = response.data;
      const foundItem = items.find(i => 
        i.barcode?.toUpperCase() === code.toUpperCase() || 
        i.internal_code?.toUpperCase() === code.toUpperCase()
      );

      if (!foundItem) {
        toast.error(`No se encontró artículo "${code}"`);
        return;
      }

      if (foundItem.status === 'rented') {
        toast.error("Este artículo ya está alquilado");
        return;
      }

      if (!['available', 'dirty'].includes(foundItem.status)) {
        toast.error(`Artículo no disponible (${foundItem.status})`);
        return;
      }

      // Calculate price delta for this swap
      const oldItem = changeItems[activeSwapIndex];
      const delta = await calculateChangeItemSwapDelta(oldItem, foundItem);
      
      // Determine swap type
      let swapType = 'technical';
      if (delta > 0) swapType = 'upgrade';
      else if (delta < 0) swapType = 'downgrade';

      // Update the item
      const updated = [...changeItems];
      updated[activeSwapIndex] = {
        ...updated[activeSwapIndex],
        swapNewItem: foundItem,
        swapDelta: delta,
        isSwapping: true,
        swapType
      };
      setChangeItems(updated);
      
      const swapTypeLabel = swapType === 'upgrade' ? '⬆️ Upgrade' : 
                           swapType === 'downgrade' ? '⬇️ Downgrade' : 
                           '🔄 Cambio técnico';
      toast.success(`${swapTypeLabel}: ${oldItem.internal_code || oldItem.barcode} → ${foundItem.internal_code || foundItem.barcode}`);
      
      setActiveSwapIndex(null);
      setChangeNewBarcode("");
      recalculateChangeMaterialDelta(updated);

    } catch (error) {
      toast.error("Error al buscar artículo");
    } finally {
      setChangeLoading(false);
    }
  };

  // Calculate delta for single item swap using tariffs
  const calculateChangeItemSwapDelta = async (oldItem, newItem) => {
    try {
      const tariffsRes = await axios.get(`${API}/tariffs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const tariffs = tariffsRes.data;
      
      // Calculate for remaining days
      const daysToCharge = Math.max(1, changeDaysRemaining);
      const dayField = daysToCharge <= 10 ? `day_${daysToCharge}` : 'day_11_plus';

      const oldTariff = tariffs.find(t => t.item_type?.toLowerCase() === oldItem.item_type?.toLowerCase());
      const oldPrice = oldTariff?.[dayField] || oldItem.unit_price || 0;

      const newTariff = tariffs.find(t => t.item_type?.toLowerCase() === newItem.item_type?.toLowerCase());
      const newPrice = newTariff?.[dayField] || newItem.rental_price || 0;

      return newPrice - oldPrice;
    } catch {
      return 0;
    }
  };

  // Execute all changes from change modal
  const executeAllChanges = async () => {
    if (!changeRental) {
      toast.error("Error: No hay contrato seleccionado");
      return;
    }

    const itemsToSwap = changeItems.filter(i => i.isSwapping && i.swapNewItem);
    const hasDateChange = changeAdjustDate && changeDateDelta !== 0;
    const hasDiscountDays = changeDiscountDays > 0;

    if (itemsToSwap.length === 0 && !hasDateChange && !hasDiscountDays) {
      toast.error("No hay cambios que procesar");
      return;
    }

    setChangeLoading(true);
    try {
      // Process each material swap
      for (const item of itemsToSwap) {
        await axios.post(`${API}/rentals/${changeRental.id}/central-swap`, {
          old_item_barcode: item.barcode || item.internal_code,
          new_item_barcode: item.swapNewItem.barcode || item.swapNewItem.internal_code,
          days_remaining: changeNewTotalDays,
          payment_method: changePaymentMethod,
          delta_amount: item.swapDelta || 0
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      }

      // Process date adjustment if active and has delta OR has discount days
      if (hasDateChange || hasDiscountDays) {
        const chargableDays = changeNewTotalDays - changeDiscountDays;
        const newTotal = (changeRental.total_amount / changeOriginalDays) * chargableDays;
        const differenceAmount = newTotal - changeRental.total_amount;
        
        await axios.patch(`${API}/rentals/${changeRental.id}/modify-duration`, {
          new_days: changeNewTotalDays,
          new_end_date: changeNewEndDate,
          new_total: newTotal,
          payment_method: changePaymentMethod,
          difference_amount: differenceAmount,
          discount_days: changeDiscountDays,
          refund_amount: changeRefundAmount,
          chargable_days: chargableDays,
          defer_refund: changeDiscountDays > 0  // Si hay días a descontar, diferir el reembolso
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      }

      // Success
      setChangeComplete(true);
      
      // Mensaje diferente si hay crédito diferido
      if (changeDiscountDays > 0) {
        toast.success(`✅ Cambios registrados. Crédito de €${changeRefundAmount.toFixed(2)} pendiente de abonar en devolución.`);
      } else {
        const totalDeltaWithDiscount = changeTotalDelta - changeRefundAmount;
        if (totalDeltaWithDiscount !== 0) {
          toast.success(`✅ Cambios completados. ${totalDeltaWithDiscount > 0 ? 'Total cobrado' : 'Total abonado'}: €${Math.abs(totalDeltaWithDiscount).toFixed(2)}`);
        } else {
          toast.success("✅ Cambios completados sin diferencia económica");
        }
      }

      // Reload rentals
      loadActiveRentals();

    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al procesar los cambios");
    } finally {
      setChangeLoading(false);
    }
  };

  // Print change ticket
  const printChangeTicket = () => {
    if (!changeRental) return;
    
    const itemsSwapped = changeItems.filter(i => i.isSwapping);
    const hasDateChange = changeAdjustDate && changeDateDelta !== 0;
    
    if (itemsSwapped.length === 0 && !hasDateChange) return;

    const oldItems = itemsSwapped.map(i => ({
      name: i.internal_code || i.barcode || 'Artículo anterior',
      item_type: i.item_type
    }));
    
    const newItems = itemsSwapped.map(i => ({
      name: i.swapNewItem?.internal_code || i.swapNewItem?.barcode || 'Artículo nuevo',
      item_type: i.swapNewItem?.item_type
    }));

    printTicket({
      settings: {
        companyLogo: settings?.companyLogo,
        ticketHeader: settings?.ticketHeader,
        ticketFooter: settings?.ticketFooter,
        ticketTerms: settings?.ticketTerms,
        showDniOnTicket: settings?.showDniOnTicket ?? true,
        showVatOnTicket: settings?.showVatOnTicket ?? false,
        defaultVat: settings?.defaultVat ?? 21,
        vatIncludedInPrices: settings?.vatIncludedInPrices ?? true,
        language: settings?.language ?? 'es'
      },
      ticketType: 'swap',
      data: {
        operationNumber: changeRental.operation_number || `C${String(Date.now()).slice(-6)}`,
        date: new Date().toLocaleDateString('es-ES'),
        customer: changeRental.customer_name,
        dni: changeRental.customer_dni || '',
        oldItems: oldItems,
        newItems: newItems,
        difference: changeTotalDelta,
        paymentMethod: changePaymentMethod
      }
    });
  };

  // ============ SMART SEARCH - REVERSE LOOKUP ============
  
  const handleSmartSearch = async (code) => {
    if (!code || code.trim().length < 2) return;
    
    setSearchLoading(true);
    try {
      const response = await axios.get(`${API}/lookup/${encodeURIComponent(code.trim())}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const result = response.data;
      
      if (result.found && result.type === "rented_item") {
        // Item is currently rented - auto-open CHANGE modal (same as Returns)
        toast.success(`✓ ${result.item?.internal_code || result.item?.barcode}: Cliente ${result.rental?.customer_name}`);
        
        // Find the rental in our list
        const rental = rentals.find(r => r.id === result.rental?.id);
        if (rental) {
          openChangeModal(rental);
        } else {
          // Use the rental data from lookup
          openChangeModal(result.rental);
        }
        setSearchQuery("");
      } else if (result.found && result.type === "customer") {
        // Customer found
        toast.success(`✓ Cliente: ${result.customer?.name}`);
        const rental = rentals.find(r => r.id === result.rental?.id);
        if (rental) {
          openChangeModal(rental);
        }
        setSearchQuery("");
      } else if (result.found && result.type === "available_item") {
        toast.info(`Artículo ${result.item?.internal_code || result.item?.barcode} está disponible (${result.item?.status})`);
      } else {
        // Not found via lookup - just filter the list
        toast.info("Filtrando lista...");
      }
    } catch (error) {
      // If lookup fails, just filter
      console.error("Lookup error:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      handleSmartSearch(searchQuery);
    }
  };

  // ============ UNIVERSAL SWAP MODAL FUNCTIONS ============
  
  const openSwapModalBlank = () => {
    // Open modal without pre-selected rental (operator will scan to identify)
    setSwapRental(null);
    setSwapBarcode("");
    setSwapNewItem(null);
    setSwapOldItem(null);
    setSwapDelta(null);
    setSwapComplete(false);
    setSwapPaymentMethod("cash");
    setSwapAction("swap");
    setSwapDaysRemaining(0);
    setSwapNewDays("");
    setSwapModalOpen(true);
    
    // Auto-focus input with select
    setTimeout(() => {
      if (swapInputRef.current) {
        swapInputRef.current.focus();
        swapInputRef.current.select();
      }
    }, 150);
  };

  const openSwapModalWithItem = (rental, triggerItem) => {
    setSwapRental(rental);
    setSwapBarcode("");
    setSwapNewItem(null);
    setSwapOldItem(triggerItem?.rental_item_data || triggerItem);
    setSwapDelta(null);
    setSwapComplete(false);
    // SECURITY: Pre-select original payment method for refunds
    setSwapPaymentMethod(rental.payment_method || "cash");
    setSwapAction("swap");
    
    // Calculate days remaining: End Date - Today
    const endDate = new Date(rental.end_date);
    endDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.max(0, Math.ceil((endDate - today) / msPerDay));
    setSwapDaysRemaining(daysLeft);
    setSwapNewDays(daysLeft.toString());
    
    // Initialize date adjustment state
    setDateAdjustActive(false);
    setOriginalEndDate(rental.end_date ? rental.end_date.split('T')[0] : "");
    setNewEndDate(rental.end_date ? rental.end_date.split('T')[0] : "");
    setOriginalDays(rental.days || 1);
    setNewTotalDays(rental.days || 1);
    setDateDelta(0);
    setCombinedDelta(0);
    
    setSwapModalOpen(true);
    
    // Auto-focus input with select
    setTimeout(() => {
      if (swapInputRef.current) {
        swapInputRef.current.focus();
        swapInputRef.current.select();
      }
    }, 150);
  };

  const openSwapModal = (rental) => {
    openSwapModalWithItem(rental, null);
  };

  const closeSwapModal = () => {
    setSwapModalOpen(false);
    setSwapRental(null);
    setSwapBarcode("");
    setSwapNewItem(null);
    setSwapOldItem(null);
    setSwapDelta(null);
    setSwapComplete(false);
    setDateAdjustActive(false);
    setDateDelta(0);
    setCombinedDelta(0);
    
    // Re-focus search input
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  // Handle date adjustment in swap modal
  const handleDateAdjustment = (newEndDateStr) => {
    if (!swapRental || !newEndDateStr) return;
    
    setNewEndDate(newEndDateStr);
    
    // Calculate new total days from original start date to new end date
    const startDate = new Date(swapRental.start_date);
    startDate.setHours(0, 0, 0, 0);
    const newEnd = new Date(newEndDateStr);
    newEnd.setHours(0, 0, 0, 0);
    const msPerDay = 24 * 60 * 60 * 1000;
    
    const calculatedNewDays = Math.ceil((newEnd - startDate) / msPerDay) + 1;
    const daysDiff = calculatedNewDays - originalDays;
    const pricePerDay = swapRental.total_amount / originalDays;
    const newDateDelta = daysDiff * pricePerDay;
    
    setNewTotalDays(calculatedNewDays);
    setDateDelta(newDateDelta);
    
    // Update days remaining
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newDaysRemaining = Math.ceil((newEnd - today) / msPerDay);
    setSwapDaysRemaining(newDaysRemaining);
    setSwapNewDays(calculatedNewDays.toString());
    
    // Calculate combined delta (material + date)
    const materialDelta = swapDelta?.delta || 0;
    setCombinedDelta(materialDelta + newDateDelta);
  };

  // Recalculate combined delta when material delta changes
  const updateCombinedDelta = (newMaterialDelta) => {
    setCombinedDelta(newMaterialDelta + dateDelta);
  };

  // HELPER: Re-focus swap input with text selection (for barcode scanner optimization)
  const refocusSwapInput = () => {
    setTimeout(() => {
      if (swapInputRef.current) {
        swapInputRef.current.focus();
        swapInputRef.current.select(); // Select all text so next scan overwrites
      }
    }, 50);
  };

  // Handle barcode scan/input
  const handleSwapBarcodeChange = async (e) => {
    const code = e.target.value.toUpperCase();
    setSwapBarcode(code);
    
    // Auto-search when code is long enough (or on Enter)
    if (code.length >= 3) {
      // Debounce - search after user stops typing
      setTimeout(() => {
        if (swapBarcode === code) {
          searchSwapItem(code);
        }
      }, 500);
    }
  };

  const handleSwapBarcodeKeyDown = (e) => {
    if (e.key === 'Enter' && swapBarcode.trim()) {
      e.preventDefault();
      searchSwapItem(swapBarcode);
    }
  };

  const searchSwapItem = async (code) => {
    if (!code.trim()) return;
    
    setSwapLoading(true);
    try {
      // CASE 1: Modal opened blank - need to identify rental first
      if (!swapRental) {
        // Use lookup to find if item is rented
        const lookupRes = await axios.get(`${API}/lookup/${encodeURIComponent(code.trim())}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        const result = lookupRes.data;
        
        if (result.found && result.type === "rented_item") {
          // Found rented item - set rental and old item
          setSwapRental(result.rental);
          setSwapOldItem(result.item?.rental_item_data || result.item);
          
          const endDate = new Date(result.rental.end_date);
          const today = new Date();
          const daysLeft = Math.max(1, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)) + 1);
          setSwapDaysRemaining(daysLeft);
          setSwapNewDays(daysLeft.toString());
          
          toast.success(`✓ Cliente identificado: ${result.rental.customer_name} - Artículo: ${result.item?.internal_code || result.item?.barcode}`);
          
          // Clear barcode for new item scan
          setSwapBarcode("");
          refocusSwapInput(); // Use helper with select
        } else if (result.found && result.type === "available_item") {
          toast.warning(`Artículo "${code}" está disponible, no alquilado. Escanea un artículo que el cliente quiera devolver.`);
        } else {
          toast.error(`No se encontró artículo "${code}" en ningún alquiler activo`);
        }
        return;
      }
      
      // CASE 2: Rental already identified - search for new item
      const response = await axios.get(`${API}/items?search=${code}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const items = response.data;
      const foundItem = items.find(i => 
        i.barcode === code || 
        i.internal_code === code ||
        i.barcode?.toUpperCase() === code ||
        i.internal_code?.toUpperCase() === code
      );

      if (!foundItem) {
        toast.error(`No se encontró ningún artículo con código "${code}"`);
        setSwapNewItem(null);
        return;
      }

      if (foundItem.status === 'rented') {
        toast.error("Este artículo ya está alquilado por otro cliente");
        return;
      }

      if (!['available', 'dirty'].includes(foundItem.status)) {
        toast.error(`Artículo no disponible (Estado: ${foundItem.status})`);
        return;
      }

      setSwapNewItem(foundItem);

      // INTELLIGENT AUTO-DETECTION: Find matching item in rental to replace
      if (!swapOldItem) {
        const rentalItems = swapRental.items.filter(i => !i.returned);
        const matchingOldItem = rentalItems.find(i => 
          i.item_type?.toLowerCase() === foundItem.item_type?.toLowerCase()
        );

        if (matchingOldItem) {
          setSwapOldItem(matchingOldItem);
          toast.success(`✓ Sustitución detectada: ${matchingOldItem.internal_code || matchingOldItem.barcode} → ${foundItem.internal_code || foundItem.barcode}`);
        } else {
          toast.warning(`No se encontró un artículo del mismo tipo (${foundItem.item_type}) en el alquiler`);
        }
      } else {
        toast.success(`✓ Nuevo artículo: ${foundItem.internal_code || foundItem.barcode}`);
      }
      
      // Calculate price delta
      if (swapOldItem) {
        await calculateSwapPriceDelta(swapOldItem, foundItem);
      }

    } catch (error) {
      toast.error("Error al buscar artículo");
    } finally {
      setSwapLoading(false);
    }
  };

  const calculateSwapPriceDelta = async (oldItem, newItem) => {
    if (!swapRental || !oldItem || !newItem) return;

    try {
      // Get tariffs to calculate proper prices
      const tariffsRes = await axios.get(`${API}/tariffs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const tariffs = tariffsRes.data;

      const days = parseInt(swapNewDays) || swapDaysRemaining;

      // Get price for old item (value not used = remaining value)
      const oldTariff = tariffs.find(t => t.item_type?.toLowerCase() === oldItem.item_type?.toLowerCase());
      const oldDayField = days <= 10 ? `day_${days}` : 'day_11_plus';
      const oldPriceForDays = oldTariff?.[oldDayField] || oldItem.unit_price || 0;

      // Get price for new item
      const newTariff = tariffs.find(t => t.item_type?.toLowerCase() === newItem.item_type?.toLowerCase());
      const newDayField = days <= 10 ? `day_${days}` : 'day_11_plus';
      const newPriceForDays = newTariff?.[newDayField] || newItem.rental_price || 0;

      // Calculate delta
      const delta = newPriceForDays - oldPriceForDays;

      setSwapDelta({
        oldPrice: oldPriceForDays,
        newPrice: newPriceForDays,
        delta,
        days,
        isUpgrade: delta > 0,
        isDowngrade: delta < 0,
        isEqual: delta === 0
      });
      
      // Update combined delta (material + date)
      setCombinedDelta(delta + dateDelta);

    } catch (error) {
      console.error("Error calculating swap price:", error);
      // Fallback to zero delta
      setSwapDelta({
        oldPrice: 0,
        newPrice: 0,
        delta: 0,
        days: swapDaysRemaining,
        isEqual: true
      });
      setCombinedDelta(dateDelta); // Only date delta if material fails
    }
  };

  // Handle days change
  const handleSwapDaysChange = (e) => {
    const newDaysValue = e.target.value;
    setSwapNewDays(newDaysValue);
    
    if (swapOldItem && swapNewItem) {
      calculateSwapPriceDelta(swapOldItem, swapNewItem);
    }
  };

  // Manual selection of old item to replace
  const selectOldItemToReplace = (item) => {
    setSwapOldItem(item);
    if (swapNewItem) {
      calculateSwapPriceDelta(item, swapNewItem);
    }
  };

  // CONFIRM SWAP - Execute the change (material and/or date)
  const executeSwap = async () => {
    if (!swapRental) {
      toast.error("No hay contrato seleccionado");
      return;
    }
    
    const hasMaterialChange = swapOldItem && swapNewItem;
    const hasDateChange = dateAdjustActive && dateDelta !== 0;
    
    if (!hasMaterialChange && !hasDateChange) {
      toast.error("No hay cambios que procesar. Selecciona artículos o ajusta la fecha.");
      return;
    }

    setSwapLoading(true);
    try {
      // Process material swap if items are set
      if (swapOldItem && swapNewItem) {
        await axios.post(`${API}/rentals/${swapRental.id}/central-swap`, {
          old_item_barcode: swapOldItem.barcode || swapOldItem.internal_code,
          new_item_barcode: swapNewItem.barcode || swapNewItem.internal_code,
          days_remaining: parseInt(swapNewDays) || swapDaysRemaining,
          payment_method: swapPaymentMethod,
          delta_amount: swapDelta?.delta || 0
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      }

      // Process date adjustment if active and has delta
      if (dateAdjustActive && dateDelta !== 0) {
        await axios.patch(`${API}/rentals/${swapRental.id}/modify-duration`, {
          new_days: newTotalDays,
          new_end_date: newEndDate,
          new_total: swapRental.total_amount + dateDelta,
          payment_method: swapPaymentMethod,
          difference_amount: dateDelta
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      }

      // Success
      setSwapComplete(true);
      
      // Build success message
      const materialMsg = (swapOldItem && swapNewItem) 
        ? (swapDelta?.isUpgrade ? `Material: +€${swapDelta.delta.toFixed(2)}` : 
           swapDelta?.isDowngrade ? `Material: -€${Math.abs(swapDelta.delta).toFixed(2)}` : 
           'Material: sin cambio')
        : '';
      const dateMsg = (dateAdjustActive && dateDelta !== 0)
        ? (dateDelta > 0 ? `Extensión: +€${dateDelta.toFixed(2)}` : `Reducción: €${dateDelta.toFixed(2)}`)
        : '';
      
      if (combinedDelta !== 0) {
        toast.success(`✅ Cambios completados. ${combinedDelta > 0 ? 'Total cobrado' : 'Total abonado'}: €${Math.abs(combinedDelta).toFixed(2)}`);
      } else {
        toast.success("✅ Cambios completados sin diferencia económica");
      }

      // Reload rentals
      loadActiveRentals();

    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al procesar los cambios");
    } finally {
      setSwapLoading(false);
    }
  };

  // ============ SOLO DEVOLUCIÓN - Devolver un artículo sin reemplazarlo ============
  const executeReturnOnly = async () => {
    if (!swapRental || !swapOldItem) {
      toast.error("No hay artículo seleccionado para devolver");
      return;
    }

    setSwapLoading(true);
    try {
      // Call the return endpoint for the single item
      const itemBarcode = swapOldItem.barcode || swapOldItem.internal_code;
      
      await axios.post(`${API}/rentals/${swapRental.id}/return-items`, {
        returned_items: [itemBarcode],
        payment_method: swapPaymentMethod
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      // Success
      setSwapComplete(true);
      setSwapAction("return");
      toast.success(`✅ Artículo ${itemBarcode} devuelto correctamente`);

      // Reload rentals
      loadActiveRentals();

    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al procesar la devolución");
    } finally {
      setSwapLoading(false);
    }
  };

  // Print swap ticket
  const printSwapTicket = () => {
    if (!swapRental) return;
    
    const hasMaterialChange = swapNewItem && swapOldItem && swapDelta;
    const hasDateChange = dateAdjustActive && dateDelta !== 0;
    
    if (!hasMaterialChange && !hasDateChange) return;

    // Build old and new items for the ticket
    const oldItems = hasMaterialChange ? [{
      name: swapOldItem.internal_code || swapOldItem.barcode || 'Artículo anterior',
      item_type: swapOldItem.item_type
    }] : [];
    
    const newItems = hasMaterialChange ? [{
      name: swapNewItem.internal_code || swapNewItem.barcode || 'Artículo nuevo',
      item_type: swapNewItem.item_type
    }] : [];

    // Use centralized ticket generator
    printTicket({
      settings: {
        companyLogo: settings?.companyLogo,
        ticketHeader: settings?.ticketHeader,
        ticketFooter: settings?.ticketFooter,
        ticketTerms: settings?.ticketTerms,
        showDniOnTicket: settings?.showDniOnTicket ?? true,
        showVatOnTicket: settings?.showVatOnTicket ?? false,
        defaultVat: settings?.defaultVat ?? 21,
        vatIncludedInPrices: settings?.vatIncludedInPrices ?? true,
        language: settings?.language ?? 'es'
      },
      ticketType: 'swap',
      data: {
        operationNumber: swapRental.operation_number || `C${String(Date.now()).slice(-6)}`,
        date: new Date().toLocaleDateString('es-ES'),
        customer: swapRental.customer_name,
        dni: swapRental.customer_dni || '',
        oldItems: oldItems,
        newItems: newItems,
        difference: combinedDelta,
        paymentMethod: swapPaymentMethod
      }
    });
  };

  // ============ HELPER FUNCTIONS ============

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  };

  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isOverdue = (endDate) => {
    return getDaysRemaining(endDate) < 0;
  };

  const openCustomerModal = async (rental) => {
    setCustomerLoading(true);
    setShowCustomerModal(true);
    
    try {
      let customerData = {
        name: rental.customer_name,
        dni: rental.customer_dni,
        phone: rental.customer_phone,
        email: rental.customer_email,
        hotel: rental.customer_hotel || rental.hotel,
        address: rental.customer_address || '',
        city: rental.customer_city || '',
        notes: rental.customer_notes,
        items: rental.items || [],
        rental_id: rental.id,
        customer_id: rental.customer_id,
        start_date: rental.start_date,
        end_date: rental.end_date,
        days: rental.days,
        total_amount: rental.total_amount,
        rental_history: [],
        customerHistory: null // Full history with financials
      };
      
      if (rental.customer_id) {
        try {
          // Load customer data
          const response = await axios.get(`${API}/customers/${rental.customer_id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          customerData = { 
            ...customerData, 
            ...response.data, 
            items: rental.items || [], 
            rental_id: rental.id,
            customer_id: rental.customer_id
          };
        } catch (error) {
          console.error("Error loading customer data:", error);
        }
      }
      
      setSelectedCustomer(customerData);
      setTechnicalDataForm({
        height: customerData.height || '',
        weight: customerData.weight || '',
        boot_size: customerData.boot_size || '',
        ski_level: customerData.ski_level || ''
      });
    } catch (error) {
      console.error("Error opening customer modal:", error);
      toast.error("Error al cargar datos del cliente");
    } finally {
      setCustomerLoading(false);
    }
  };

  // ============ PAYMENT METHOD EDITOR FUNCTIONS ============
  const openPaymentMethodDialog = (rental) => {
    setEditingRental(rental);
    setNewPaymentMethod(rental.payment_method || "cash");
    setShowPaymentMethodDialog(true);
  };

  const savePaymentMethod = async () => {
    if (!editingRental || !newPaymentMethod) return;
    
    setSavingPaymentMethod(true);
    try {
      const response = await axios.patch(
        `${API}/rentals/${editingRental.id}/payment-method`,
        { new_payment_method: newPaymentMethod },
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      
      toast.success(`✅ Método de pago actualizado: ${getPaymentMethodLabel(newPaymentMethod)}`);
      
      // Show reconciliation info if available
      if (response.data.reconciliation) {
        const { action, old_method, new_method, amount } = response.data.reconciliation;
        console.log(`Reconciliación: ${action} - ${old_method} → ${new_method} (€${amount})`);
      }
      
      setShowPaymentMethodDialog(false);
      loadActiveRentals(); // Reload to show updated data
    } catch (error) {
      console.error('Error updating payment method:', error);
      toast.error(error.response?.data?.detail || 'Error al actualizar método de pago');
    } finally {
      setSavingPaymentMethod(false);
    }
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'online': 'Pago Online',
      'deposit': 'Depósito',
      'other': 'Otro',
      'pending': 'Pendiente'
    };
    return labels[method] || method;
  };

  const getPaymentMethodBadge = (method, isPending = false) => {
    // Paid methods: Green
    const paidMethods = ['cash', 'card', 'online', 'deposit', 'other'];
    // Unpaid methods: Red
    const unpaidMethods = ['pending'];
    
    if (paidMethods.includes(method)) {
      return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    } else if (method === 'pending') {
      return 'bg-red-100 text-red-700 border-red-300';
    }
    
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const sendWhatsAppMessage = (phone, customerName) => {
    if (!phone) {
      toast.error("No hay teléfono registrado para este cliente");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${customerName}, te contactamos de la tienda de esquí. ¿En qué podemos ayudarte?`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const callPhone = (phone) => {
    if (!phone) {
      toast.error("No hay teléfono registrado");
      return;
    }
    window.open(`tel:${phone}`, '_self');
  };

  const sendEmail = (email, customerName) => {
    if (!email) {
      toast.error("No hay email registrado");
      return;
    }
    const subject = encodeURIComponent("Información sobre tu alquiler - Tienda de Esquí");
    const body = encodeURIComponent(`Hola ${customerName},\n\nTe contactamos desde la tienda de esquí respecto a tu alquiler.\n\nGracias.`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  // ============ TECHNICAL DATA FUNCTIONS ============
  const startEditingTechnicalData = () => {
    setTechnicalDataForm({
      boot_size: selectedCustomer?.boot_size || "",
      height: selectedCustomer?.height || "",
      weight: selectedCustomer?.weight || "",
      ski_level: selectedCustomer?.ski_level || "sin_especificar"
    });
    setEditingTechnicalData(true);
  };

  const cancelEditingTechnicalData = () => {
    setEditingTechnicalData(false);
    setTechnicalDataForm({
      boot_size: "",
      height: "",
      weight: "",
      ski_level: ""
    });
  };

  const saveTechnicalData = async () => {
    if (!selectedCustomer?.customer_id && !selectedCustomer?.id) {
      toast.error("No se puede guardar: cliente no identificado");
      return;
    }

    setSavingTechnicalData(true);
    try {
      const customerId = selectedCustomer.customer_id || selectedCustomer.id;
      await axios.patch(`${API}/customers/${customerId}/technical-data`, technicalDataForm, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      // Update local state
      setSelectedCustomer(prev => ({
        ...prev,
        boot_size: technicalDataForm.boot_size,
        height: technicalDataForm.height,
        weight: technicalDataForm.weight,
        ski_level: technicalDataForm.ski_level
      }));

      toast.success("Datos técnicos guardados correctamente");
      setEditingTechnicalData(false);
    } catch (error) {
      toast.error("Error al guardar datos técnicos");
    } finally {
      setSavingTechnicalData(false);
    }
  };

  const SKI_LEVELS = [
    { value: "sin_especificar", label: "Sin especificar" },
    { value: "principiante", label: "Principiante" },
    { value: "intermedio", label: "Intermedio" },
    { value: "avanzado", label: "Avanzado" },
    { value: "experto", label: "Experto" }
  ];

  return (
    <div className={`p-6 lg:p-8 min-h-screen transition-colors duration-300 ${darkMode ? 'bg-[#121212]' : 'bg-slate-50'}`} data-testid="active-rentals-page">
      {/* ============ STICKY HEADER WITH SEARCH & CAMBIOS BUTTON ============ */}
      <div className={`sticky top-0 z-20 pb-4 -mx-6 px-6 lg:-mx-8 lg:px-8 pt-2 border-b shadow-sm mb-6 transition-colors duration-300 ${
        darkMode ? 'bg-[#121212] border-[#333]' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col gap-4">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Alquileres Activos
            </h1>
            <Badge variant="outline" className={`shrink-0 ${darkMode ? 'border-[#444] text-slate-300' : ''}`}>
              {filteredRentals.length} de {rentals.length}
            </Badge>
          </div>
          
          {/* Search bar + CAMBIOS button */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Smart Search Input */}
            <div className="flex-1 relative">
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <Scan className="h-5 w-5" />
              </div>
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onKeyDown={handleSearchKeyDown}
                placeholder="Escanea código o escribe nombre del cliente..."
                className={`h-12 pl-12 pr-12 text-base font-mono border-2 rounded-xl ${
                  darkMode 
                    ? 'bg-[#1a1a1a] border-[#333] text-white focus:border-cyan-500 focus:bg-[#1e1e1e] placeholder:text-slate-500' 
                    : 'bg-slate-50 border-slate-200 focus:border-blue-400 focus:bg-white'
                } ${globalScannerActive ? 'ring-2 ring-green-400' : ''}`}
                data-testid="smart-search-input"
              />
              {globalScannerActive && (
                <div className="absolute -top-1 right-2 flex items-center gap-1.5 bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                  <Scan className="h-3 w-3 animate-pulse" />
                  Escáner Activo
                </div>
              )}
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 ${darkMode ? 'hover:bg-[#333]' : ''}`}
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {searchLoading && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2">
                  <Loader2 className={`h-4 w-4 animate-spin ${darkMode ? 'text-cyan-400' : 'text-blue-500'}`} />
                </div>
              )}
            </div>
          </div>
          
          {/* Quick help text */}
          <p className="text-xs text-slate-500">
            💡 Escanea un artículo alquilado para identificar al cliente y abrir el gestor de cambios automáticamente
          </p>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-slate-500" />
            Lista de Alquileres
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRentals.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{searchQuery ? `No se encontraron resultados para "${searchQuery}"` : "No hay alquileres activos"}</p>
              {searchQuery && (
                <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2">
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Artículos</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-center">Días</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead className="text-center">Pago</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRentals.map((rental) => {
                    const activeItems = rental.items.filter(i => !i.returned);
                    // Calcular UNIDADES totales, no líneas
                    const itemCount = activeItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
                    
                    return (
                      <TableRow key={rental.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div>
                            <button
                              onClick={() => openCustomerModal(rental)}
                              className="font-medium text-slate-900 hover:text-primary hover:underline text-left cursor-pointer"
                              data-testid={`customer-link-${rental.id}`}
                            >
                              {rental.customer_name}
                            </button>
                            <p className="text-sm text-slate-500 font-mono">{rental.customer_dni}</p>
                          </div>
                        </TableCell>
                        
                        {/* COMPACT: Badge with item count + Popover for details */}
                        <TableCell className="text-center">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto py-1 px-2 gap-1 hover:bg-slate-100"
                                data-testid={`items-badge-${rental.id}`}
                              >
                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                                  <Package className="h-3 w-3 mr-1" />
                                  {itemCount} art.
                                </Badge>
                                <Eye className="h-3 w-3 text-slate-400" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0" align="start">
                              <div className="bg-slate-50 px-3 py-2 border-b">
                                <p className="text-sm font-semibold text-slate-700">
                                  Artículos en Alquiler ({itemCount})
                                </p>
                              </div>
                              <div className="p-2 max-h-48 overflow-y-auto">
                                {activeItems.length === 0 ? (
                                  <p className="text-sm text-slate-500 p-2">Sin artículos activos</p>
                                ) : (
                                  <div className="space-y-1">
                                    {activeItems.map((item, idx) => (
                                      <div 
                                        key={idx} 
                                        className="flex items-center justify-between p-2 rounded-md bg-white border border-slate-100 hover:border-slate-200"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          {item.quantity > 1 && (
                                            <span className="font-bold text-xs text-blue-600 shrink-0">
                                              {item.quantity}x
                                            </span>
                                          )}
                                          <span className="font-mono text-xs font-medium text-blue-600 shrink-0">
                                            {item.internal_code || item.barcode?.substring(0, 10)}
                                          </span>
                                          <span className="text-xs text-slate-500 truncate">
                                            {item.item_type}
                                          </span>
                                        </div>
                                        {item.size && (
                                          <Badge variant="outline" className="text-xs shrink-0 ml-1">
                                            {item.size}
                                          </Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm whitespace-nowrap">
                            <span>{formatDate(rental.start_date)}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span>{formatDate(rental.end_date)}</span>
                          </div>
                          {isOverdue(rental.end_date) && (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs mt-1">
                              Retrasado {Math.abs(getDaysRemaining(rental.end_date))}d
                            </Badge>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-center">
                          <Badge className="bg-blue-100 text-blue-700">
                            {rental.days}d
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="text-right font-medium">
                          €{rental.total_amount.toFixed(2)}
                        </TableCell>
                        
                        <TableCell className="text-right">
                          <span className={`font-medium ${rental.pending_amount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            €{rental.pending_amount.toFixed(2)}
                          </span>
                          {/* Mostrar crédito pendiente si existe */}
                          {rental.pending_refund > 0 && (
                            <div className="mt-1">
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                                💳 -€{rental.pending_refund.toFixed(2)}
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        
                        {/* PAYMENT METHOD with Edit Button */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Badge className={getPaymentMethodBadge(rental.payment_method)}>
                              {getPaymentMethodLabel(rental.payment_method || 'cash')}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => openPaymentMethodDialog(rental)}
                              title="Editar método de pago"
                            >
                              <Edit2 className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                            </Button>
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* QUICK PAYMENT BUTTON - Only show if pending amount > 0 */}
                            {rental.pending_amount > 0 && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => openQuickPaymentModal(rental)}
                                className="gap-1 bg-amber-500 hover:bg-amber-600 text-white h-8"
                                data-testid={`quick-pay-btn-${rental.id}`}
                                title={`Cobrar €${rental.pending_amount.toFixed(2)} pendiente`}
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">COBRAR</span>
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openChangeModal(rental)}
                              className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-400 h-8"
                              data-testid={`change-btn-${rental.id}`}
                              title="Gestionar cambios del contrato"
                            >
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">CAMBIOS</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAddItemsModal(rental)}
                              className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 h-8"
                              title="Añadir artículos al alquiler"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">AÑADIR</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openCustomerModal(rental)}
                              className="h-8 w-8"
                              title="Ver ficha del cliente"
                            >
                              <User className="h-4 w-4" />
                            </Button>
                            {/* REMOVED: Edit button - All modifications go through CAMBIOS modal */}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ UNIVERSAL SWAP/CAMBIOS MODAL ============ */}
      <Dialog open={swapModalOpen} onOpenChange={closeSwapModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ArrowLeftRight className="h-6 w-6 text-orange-500" />
              Gestor Universal de Cambios
            </DialogTitle>
            {swapRental ? (
              <DialogDescription className="text-base">
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge className="bg-slate-100 text-slate-800 px-3 py-1">
                    <User className="h-4 w-4 mr-1" />
                    {swapRental.customer_name}
                  </Badge>
                  <Badge variant="outline">{swapRental.customer_dni}</Badge>
                  <Badge className="bg-blue-100 text-blue-700">
                    {swapDaysRemaining} días restantes
                  </Badge>
                </div>
              </DialogDescription>
            ) : (
              <DialogDescription className="text-base text-slate-500">
                Escanea el artículo que el cliente quiere devolver para identificarlo automáticamente
              </DialogDescription>
            )}
          </DialogHeader>

          {!swapComplete ? (
            <div className="space-y-5 py-4">
              {/* SCANNER INPUT - Auto-focused */}
              <div className="relative">
                <Label className="text-base font-semibold flex items-center gap-2 mb-2">
                  <Scan className="h-5 w-5 text-orange-500" />
                  {!swapRental 
                    ? "Escanear Artículo a Devolver" 
                    : swapOldItem 
                      ? "Escanear Nuevo Artículo" 
                      : "Escanear Artículo"}
                </Label>
                <p className="text-sm text-slate-500 mb-3">
                  {!swapRental 
                    ? "Escanea el artículo que el cliente entrega para identificarlo" 
                    : swapOldItem 
                      ? "Escanea el nuevo artículo que reemplazará al anterior"
                      : "Escanea con el lector láser o escribe el código"}
                </p>
                <div className="flex gap-2">
                  <Input
                    ref={swapInputRef}
                    value={swapBarcode}
                    onChange={handleSwapBarcodeChange}
                    onKeyDown={handleSwapBarcodeKeyDown}
                    placeholder={!swapRental ? "Escanea artículo del cliente..." : "SKI-001, BOT-002..."}
                    className="h-14 text-xl font-mono flex-1 border-2 border-orange-200 focus:border-orange-400"
                    autoFocus
                    data-testid="swap-barcode-input"
                  />
                  <Button 
                    onClick={() => searchSwapItem(swapBarcode)}
                    disabled={swapLoading || !swapBarcode.trim()}
                    className="h-14 px-6 bg-orange-500 hover:bg-orange-600"
                  >
                    {swapLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Scan className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              {/* Show identified customer when rental is set */}
              {swapRental && swapOldItem && !swapNewItem && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-700 font-semibold mb-2">✓ Cliente y artículo identificados</p>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Package className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-mono font-bold">{swapOldItem.internal_code || swapOldItem.barcode}</p>
                      <p className="text-sm text-slate-600">{swapOldItem.item_type}</p>
                    </div>
                  </div>
                  
                  {/* Action options */}
                  <div className="mt-4 pt-3 border-t border-blue-200">
                    <p className="text-xs text-slate-600 mb-3">¿Qué desea hacer?</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-white border-2 border-dashed border-blue-300 text-center">
                        <Scan className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                        <p className="text-sm font-medium text-slate-700">Escanee nuevo artículo</p>
                        <p className="text-xs text-slate-500">para SUSTITUIR</p>
                      </div>
                      <Button
                        variant="outline"
                        className="h-auto py-3 flex-col gap-1 border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                        onClick={executeReturnOnly}
                        disabled={swapLoading}
                        data-testid="return-only-btn"
                      >
                        {swapLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                        ) : (
                          <RotateCcw className="h-5 w-5 text-emerald-600" />
                        )}
                        <span className="text-sm font-medium text-emerald-700">Solo DEVOLVER</span>
                        <span className="text-xs text-emerald-600">sin reemplazo</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* SWAP PREVIEW - When items are detected */}
              {swapNewItem && swapOldItem && (
                <div className="grid grid-cols-2 gap-4">
                  {/* OLD ITEM (to return) */}
                  <div className="p-4 rounded-lg bg-red-50 border-2 border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-red-600 text-lg">❌</span>
                      <span className="font-bold text-red-700">DEVUELVE</span>
                    </div>
                    <p className="font-mono text-lg font-bold">{swapOldItem.internal_code || swapOldItem.barcode}</p>
                    <p className="text-sm text-slate-600">{swapOldItem.item_type}</p>
                    <p className="text-xs text-slate-500">{swapOldItem.brand} {swapOldItem.model}</p>
                    {swapDelta && (
                      <p className="text-sm font-semibold mt-2 text-slate-700">Valor: €{swapDelta.oldPrice.toFixed(2)}</p>
                    )}
                  </div>

                  {/* NEW ITEM (to receive) */}
                  <div className="p-4 rounded-lg bg-green-50 border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-600 text-lg">✅</span>
                      <span className="font-bold text-green-700">RECIBE</span>
                    </div>
                    <p className="font-mono text-lg font-bold">{swapNewItem.internal_code || swapNewItem.barcode}</p>
                    <p className="text-sm text-slate-600">{swapNewItem.item_type}</p>
                    <p className="text-xs text-slate-500">{swapNewItem.brand} {swapNewItem.model}</p>
                    {swapDelta && (
                      <p className="text-sm font-semibold mt-2 text-slate-700">Valor: €{swapDelta.newPrice.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Manual selection if no match found */}
              {swapNewItem && !swapOldItem && swapRental && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="font-semibold text-amber-800 mb-2">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Selecciona el artículo a reemplazar:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {swapRental.items.filter(i => !i.returned).map((item, idx) => (
                      <Button
                        key={idx}
                        variant={swapOldItem?.barcode === item.barcode ? "default" : "outline"}
                        className="justify-start text-left"
                        onClick={() => selectOldItemToReplace(item)}
                      >
                        <span className="font-mono">{item.internal_code || item.barcode}</span>
                        <span className="ml-2 text-xs opacity-70">{item.item_type}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* ============ DATE ADJUSTMENT SECTION (Prominente) ============ */}
              {swapRental && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <CalendarPlus className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">Ajuste de Calendario</p>
                        <p className="text-xs text-slate-500">Extensión o devolución anticipada</p>
                      </div>
                    </div>
                    <Button
                      variant={dateAdjustActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateAdjustActive(!dateAdjustActive)}
                      className={dateAdjustActive ? "bg-blue-600" : ""}
                    >
                      {dateAdjustActive ? '✓ Activo' : 'Activar'}
                    </Button>
                  </div>
                  
                  {dateAdjustActive && (
                    <div className="space-y-4 mt-4 pt-4 border-t border-blue-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-slate-600">Fecha fin original</Label>
                          <p className="text-lg font-bold text-slate-700">
                            {originalEndDate ? new Date(originalEndDate).toLocaleDateString('es-ES') : '-'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-slate-600">Nueva fecha de fin</Label>
                          <Input
                            type="date"
                            value={newEndDate}
                            onChange={(e) => handleDateAdjustment(e.target.value)}
                            className="h-10 font-semibold"
                          />
                        </div>
                      </div>
                      
                      {/* Days comparison */}
                      <div className="p-3 rounded-lg bg-white/80 border border-blue-200">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-xs text-slate-500 uppercase">Días Originales</p>
                            <p className="text-2xl font-bold text-slate-700">{originalDays}</p>
                          </div>
                          <div className="flex items-center justify-center">
                            <ArrowRight className="h-6 w-6 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase">Días Nuevos</p>
                            <p className={`text-2xl font-bold ${
                              newTotalDays > originalDays ? 'text-orange-600' :
                              newTotalDays < originalDays ? 'text-emerald-600' : 'text-slate-700'
                            }`}>{newTotalDays}</p>
                          </div>
                        </div>
                        
                        {dateDelta !== 0 && (
                          <div className={`mt-3 p-2 rounded text-center ${
                            dateDelta > 0 ? 'bg-orange-100' : 'bg-emerald-100'
                          }`}>
                            <p className="text-xs text-slate-600">
                              {dateDelta > 0 ? 'Suplemento por extensión' : 'Abono por reducción'}
                            </p>
                            <p className={`text-lg font-bold ${
                              dateDelta > 0 ? 'text-orange-700' : 'text-emerald-700'
                            }`}>
                              {dateDelta > 0 ? '+' : ''}€{dateDelta.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ============ MATERIAL DELTA (if swap active) ============ */}
              {swapDelta && swapNewItem && swapOldItem && (
                <div className={`p-4 rounded-xl border-2 ${
                  swapDelta.isUpgrade ? 'bg-emerald-50 border-emerald-300' :
                  swapDelta.isDowngrade ? 'bg-red-50 border-red-300' :
                  'bg-slate-50 border-slate-300'
                }`}>
                  <p className="text-sm font-medium text-slate-700 mb-2">🔄 Diferencia por Material</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      {swapDelta.isUpgrade ? 'Upgrade' : swapDelta.isDowngrade ? 'Downgrade' : 'Sin cambio'}
                    </span>
                    <p className={`text-2xl font-bold ${
                      swapDelta.isUpgrade ? 'text-emerald-600' :
                      swapDelta.isDowngrade ? 'text-red-600' :
                      'text-slate-600'
                    }`}>
                      {swapDelta.delta > 0 ? '+' : swapDelta.delta < 0 ? '-' : ''}€{Math.abs(swapDelta.delta).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* ============ COMBINED TOTAL DELTA ============ */}
              {(combinedDelta !== 0 || (swapDelta && swapDelta.delta !== 0) || dateDelta !== 0) && (
                <div className={`p-5 rounded-xl border-2 ${
                  combinedDelta > 0 ? 'bg-orange-50 border-orange-300' :
                  combinedDelta < 0 ? 'bg-emerald-50 border-emerald-300' :
                  'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {combinedDelta > 0 ? '⬆️ TOTAL A COBRAR' : 
                         combinedDelta < 0 ? '⬇️ TOTAL A ABONAR' : 
                         '↔️ SIN DIFERENCIA'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {swapNewItem && swapOldItem && 'Cambio material'}
                        {swapNewItem && swapOldItem && dateAdjustActive && dateDelta !== 0 && ' + '}
                        {dateAdjustActive && dateDelta !== 0 && (dateDelta > 0 ? 'extensión' : 'reducción')}
                      </p>
                    </div>
                    <p className={`text-3xl font-bold ${
                      combinedDelta > 0 ? 'text-orange-600' :
                      combinedDelta < 0 ? 'text-emerald-600' :
                      'text-slate-500'
                    }`}>
                      {combinedDelta > 0 ? '+' : combinedDelta < 0 ? '-' : ''}€{Math.abs(combinedDelta).toFixed(2)}
                    </p>
                  </div>
                  
                  {/* Payment method selection */}
                  {combinedDelta !== 0 && (
                    <div className="mt-4 pt-4 border-t border-current/20">
                      <Label className="text-sm mb-2 block">
                        Método de {combinedDelta > 0 ? 'cobro' : 'abono'}
                      </Label>
                      
                      {/* If positive (cobro), allow choice. If negative (abono), lock to original */}
                      {combinedDelta > 0 ? (
                        <div className="flex gap-2">
                          <Button
                            variant={swapPaymentMethod === "cash" ? "default" : "outline"}
                            onClick={() => setSwapPaymentMethod("cash")}
                            className="flex-1"
                            size="sm"
                          >
                            <Banknote className="h-4 w-4 mr-1" />
                            Efectivo
                          </Button>
                          <Button
                            variant={swapPaymentMethod === "card" ? "default" : "outline"}
                            onClick={() => setSwapPaymentMethod("card")}
                            className="flex-1"
                            size="sm"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Tarjeta
                          </Button>
                        </div>
                      ) : (
                        /* LOCKED for refunds/abonos */
                        <>
                          <div className="h-10 px-3 flex items-center justify-between rounded-md border border-slate-300 bg-slate-100 cursor-not-allowed">
                            <div className="flex items-center gap-2">
                              {(swapRental?.payment_method || 'cash') === 'cash' ? (
                                <>
                                  <Banknote className="h-4 w-4 text-emerald-600" />
                                  <span className="font-medium text-slate-700">Efectivo</span>
                                </>
                              ) : (
                                <>
                                  <CreditCard className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium text-slate-700">Tarjeta</span>
                                </>
                              )}
                            </div>
                            <Lock className="h-4 w-4 text-slate-400" />
                          </div>
                          <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-xs text-amber-800 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 flex-shrink-0" />
                              <span>Por seguridad, el abono se realiza al mismo método de pago original.</span>
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* SUCCESS STATE */
            <div className="text-center py-8">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                swapAction === 'return' ? 'bg-blue-100' : 'bg-emerald-100'
              }`}>
                <CheckCircle className={`h-10 w-10 ${
                  swapAction === 'return' ? 'text-blue-600' : 'text-emerald-600'
                }`} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${
                swapAction === 'return' ? 'text-blue-800' : 'text-emerald-800'
              }`}>
                {swapAction === 'return' ? '¡Devolución Completada!' : '¡Cambio Completado!'}
              </h3>
              <p className="text-slate-600">
                {swapAction === 'return' 
                  ? 'El artículo ha sido devuelto y el inventario actualizado.' 
                  : 'El material ha sido intercambiado y el inventario actualizado.'}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            {!swapComplete ? (
              <>
                <Button variant="outline" onClick={closeSwapModal}>
                  Cancelar
                </Button>
                <Button 
                  onClick={executeSwap}
                  disabled={swapLoading || ((!swapNewItem || !swapOldItem) && !(dateAdjustActive && dateDelta !== 0))}
                  className={`min-w-[200px] ${
                    combinedDelta > 0 ? 'bg-orange-600 hover:bg-orange-700' :
                    combinedDelta < 0 ? 'bg-emerald-600 hover:bg-emerald-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                  data-testid="confirm-swap-btn"
                >
                  {swapLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : combinedDelta !== 0 ? (
                    <DollarSign className="h-4 w-4 mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  {combinedDelta > 0 ? `Cobrar €${combinedDelta.toFixed(2)} y Confirmar` :
                   combinedDelta < 0 ? `Abonar €${Math.abs(combinedDelta).toFixed(2)} y Confirmar` :
                   'Confirmar Cambio'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={closeSwapModal}>
                  Cerrar
                </Button>
                <Button onClick={printSwapTicket}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Comprobante
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modification Dialog - Multi-step */}
      {/* Customer Info Modal */}
      {/* ============ CUSTOMER FULL INFO MODAL ============ */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              Ficha Completa del Cliente
            </DialogTitle>
            <DialogDescription>
              Información detallada e historial completo
            </DialogDescription>
          </DialogHeader>
          
          {customerLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedCustomer && (
            <div className="space-y-6">
              {/* ===== SECTION 1: PERSONAL DATA ===== */}
              <Card className="border-slate-200 bg-slate-50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500">Nombre Completo</Label>
                      <p className="text-lg font-semibold text-slate-900">{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">DNI/Pasaporte</Label>
                      <p className="text-lg font-mono font-semibold text-slate-900">{selectedCustomer.dni || '-'}</p>
                    </div>
                  </div>

                  {/* ===== TECHNICAL DATA - COLLAPSIBLE ACCORDION ===== */}
                  <div className="mt-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 overflow-hidden">
                    {/* HEADER - Always visible with summary */}
                    <div 
                      className={`p-3 flex items-center justify-between cursor-pointer hover:bg-blue-100/50 transition-colors ${technicalDataExpanded ? 'border-b border-blue-200' : ''}`}
                      onClick={() => !editingTechnicalData && setTechnicalDataExpanded(!technicalDataExpanded)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                          <Mountain className="h-4 w-4 text-blue-600" />
                        </div>
                        
                        {/* COMPACT SUMMARY - One line with key data */}
                        <div className="flex items-center gap-3 flex-wrap text-sm min-w-0">
                          {selectedCustomer.height && (
                            <span className="flex items-center gap-1 text-slate-700">
                              <Ruler className="h-3 w-3 text-blue-500" />
                              <strong>{selectedCustomer.height}</strong>cm
                            </span>
                          )}
                          {selectedCustomer.weight && (
                            <span className="flex items-center gap-1 text-slate-700">
                              <Scale className="h-3 w-3 text-blue-500" />
                              <strong>{selectedCustomer.weight}</strong>kg
                            </span>
                          )}
                          {selectedCustomer.boot_size && (
                            <span className="flex items-center gap-1 text-slate-700">
                              <Package className="h-3 w-3 text-blue-500" />
                              Pie <strong>{selectedCustomer.boot_size}</strong>
                            </span>
                          )}
                          {selectedCustomer.ski_level && selectedCustomer.ski_level !== 'sin_especificar' && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-300 capitalize text-xs">
                              {selectedCustomer.ski_level}
                            </Badge>
                          )}
                          {!selectedCustomer.height && !selectedCustomer.weight && !selectedCustomer.boot_size && (
                            <span className="text-slate-400 italic text-xs">Sin datos técnicos</span>
                          )}
                        </div>
                      </div>
                      
                      {/* EXPAND/COLLAPSE BUTTON */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-blue-600 hover:bg-blue-100 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!editingTechnicalData) setTechnicalDataExpanded(!technicalDataExpanded);
                        }}
                      >
                        {technicalDataExpanded ? (
                          <>
                            <ChevronDown className="h-4 w-4 rotate-180 transition-transform" />
                            <span className="hidden sm:inline text-xs">Cerrar</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs">Editar</span>
                            <ChevronDown className="h-4 w-4 transition-transform" />
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {/* EXPANDED CONTENT */}
                    {technicalDataExpanded && (
                      <div className="p-4 pt-3">
                        {/* Edit/Save buttons */}
                        <div className="flex justify-end mb-3">
                          {!editingTechnicalData ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={startEditingTechnicalData}
                              className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-100"
                              data-testid="edit-technical-data-btn"
                            >
                              <Edit3 className="h-3 w-3" />
                              Editar datos
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  cancelEditingTechnicalData();
                                }}
                                className="gap-1"
                              >
                                <X className="h-3 w-3" />
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={saveTechnicalData}
                                disabled={savingTechnicalData}
                                className="gap-1 bg-blue-600 hover:bg-blue-700"
                                data-testid="save-technical-data-btn"
                              >
                                {savingTechnicalData ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3" />
                                )}
                                Guardar
                              </Button>
                            </div>
                          )}
                        </div>

                        {!editingTechnicalData ? (
                          /* VIEW MODE - Badges */
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3 bg-white rounded-lg border border-blue-100 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Package className="h-4 w-4 text-blue-500" />
                                <span className="text-xs text-slate-500 font-medium">Talla Bota</span>
                              </div>
                              <p className="text-xl font-bold text-slate-900">
                                {selectedCustomer.boot_size || '-'}
                              </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-blue-100 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Ruler className="h-4 w-4 text-blue-500" />
                                <span className="text-xs text-slate-500 font-medium">Altura</span>
                              </div>
                              <p className="text-xl font-bold text-slate-900">
                                {selectedCustomer.height ? `${selectedCustomer.height} cm` : '-'}
                              </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-blue-100 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Scale className="h-4 w-4 text-blue-500" />
                                <span className="text-xs text-slate-500 font-medium">Peso</span>
                              </div>
                              <p className="text-xl font-bold text-slate-900">
                                {selectedCustomer.weight ? `${selectedCustomer.weight} kg` : '-'}
                              </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-blue-100 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Mountain className="h-4 w-4 text-blue-500" />
                                <span className="text-xs text-slate-500 font-medium">Nivel</span>
                              </div>
                              <p className="text-xl font-bold text-slate-900 capitalize">
                                {selectedCustomer.ski_level || '-'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          /* EDIT MODE - Inputs */
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs text-slate-600">Talla Bota</Label>
                              <Input
                                value={technicalDataForm.boot_size}
                                onChange={(e) => setTechnicalDataForm(prev => ({ ...prev, boot_size: e.target.value }))}
                                placeholder="Ej: 42, 27.5"
                                className="h-10 mt-1 text-center font-bold"
                                data-testid="boot-size-input"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Altura (cm)</Label>
                              <Input
                                value={technicalDataForm.height}
                                onChange={(e) => setTechnicalDataForm(prev => ({ ...prev, height: e.target.value }))}
                                placeholder="Ej: 175"
                                className="h-10 mt-1 text-center font-bold"
                                data-testid="height-input"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Peso (kg)</Label>
                              <Input
                                value={technicalDataForm.weight}
                                onChange={(e) => setTechnicalDataForm(prev => ({ ...prev, weight: e.target.value }))}
                                placeholder="Ej: 70"
                                className="h-10 mt-1 text-center font-bold"
                                data-testid="weight-input"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Nivel Esquí</Label>
                              <Select
                                value={technicalDataForm.ski_level}
                                onValueChange={(v) => setTechnicalDataForm(prev => ({ ...prev, ski_level: v }))}
                              >
                                <SelectTrigger className="h-10 mt-1" data-testid="ski-level-select">
                                  <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {SKI_LEVELS.map(level => (
                                    <SelectItem key={level.value} value={level.value}>
                                      {level.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {/* Show historical preferred sizes if available */}
                        {selectedCustomer.customerHistory?.preferred_sizes && 
                         Object.keys(selectedCustomer.customerHistory.preferred_sizes).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                              <History className="h-3 w-3" />
                              Tallas usadas anteriormente:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(selectedCustomer.customerHistory.preferred_sizes).map(([type, sizes]) => (
                                <Badge key={type} variant="outline" className="text-xs bg-white">
                                  {type}: {Array.isArray(sizes) ? sizes.slice(0, 3).join(", ") : sizes}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Current Rental Reference */}
                  {selectedCustomer.rental_id && (
                    <div className="mt-4 p-3 rounded-lg bg-emerald-100 border border-emerald-300">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-emerald-700" />
                        <span className="text-sm font-semibold text-emerald-800">
                          Alquiler Activo: #{selectedCustomer.rental_id.substring(0, 8).toUpperCase()}
                        </span>
                        <Badge className="bg-emerald-200 text-emerald-800 ml-auto">
                          {selectedCustomer.days} días • €{selectedCustomer.total_amount?.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* ===== CONTACT ACTIONS ===== */}
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                    {/* Phone */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-xs text-emerald-600 font-medium">Teléfono</p>
                          <p className="font-semibold text-slate-900">{selectedCustomer.phone || 'No registrado'}</p>
                        </div>
                      </div>
                      {selectedCustomer.phone && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                            onClick={() => callPhone(selectedCustomer.phone)}
                          >
                            <Phone className="h-3 w-3" />
                            Llamar
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => sendWhatsAppMessage(selectedCustomer.phone, selectedCustomer.name)}
                            data-testid="customer-modal-whatsapp-btn"
                          >
                            <MessageCircle className="h-3 w-3" />
                            WhatsApp
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    {selectedCustomer.email && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-xs text-blue-600 font-medium">Email</p>
                            <p className="font-semibold text-slate-900">{selectedCustomer.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-100"
                          onClick={() => sendEmail(selectedCustomer.email, selectedCustomer.name)}
                        >
                          <Mail className="h-3 w-3" />
                          Enviar Email
                        </Button>
                      </div>
                    )}

                    {/* Address/Hotel/City */}
                    {(selectedCustomer.hotel || selectedCustomer.address || selectedCustomer.city) && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-purple-600" />
                          <div>
                            <p className="text-xs text-purple-600 font-medium">
                              {selectedCustomer.hotel ? 'Hotel / Ubicación' : 'Población / Dirección'}
                            </p>
                            <p className="font-semibold text-slate-900">
                              {selectedCustomer.hotel || selectedCustomer.city || 'No registrado'}
                              {selectedCustomer.hotel && selectedCustomer.city && ` • ${selectedCustomer.city}`}
                              {selectedCustomer.address && ` - ${selectedCustomer.address}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Total Rentals Count */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <Label className="text-xs text-slate-500">Total Alquileres</Label>
                    <p className="text-base font-semibold text-slate-900">
                      {selectedCustomer.customerHistory?.total_rentals || selectedCustomer.rental_history?.length || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* ===== SECTION 2: NOTES & ALERTS ===== */}
              {selectedCustomer.notes && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="h-5 w-5" />
                      Notas y Alertas Internas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-amber-900 whitespace-pre-wrap">{selectedCustomer.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* ===== SECTION 3: FINANCIAL SUMMARY ===== */}
              {selectedCustomer.customerHistory?.financial_summary && (
                <Card className="border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-slate-600" />
                      Resumen Financiero
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50">
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-1">Total Pagado</p>
                        <p className="text-xl font-bold text-emerald-600">
                          €{selectedCustomer.customerHistory.financial_summary.total_paid?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-1">Devoluciones</p>
                        <p className="text-xl font-bold text-orange-600">
                          €{selectedCustomer.customerHistory.financial_summary.total_refunded?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-1">Ingreso Neto</p>
                        <p className="text-xl font-bold text-slate-900">
                          €{selectedCustomer.customerHistory.financial_summary.net_revenue?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>

                    {/* Transactions List */}
                    {selectedCustomer.customerHistory?.transactions && selectedCustomer.customerHistory.transactions.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                          <History className="h-4 w-4" />
                          Últimas Transacciones
                        </p>
                        <div className="max-h-[200px] overflow-y-auto space-y-2">
                          {selectedCustomer.customerHistory.transactions.slice(0, 10).map((tx, idx) => (
                            <div 
                              key={idx}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                tx.type === 'income' 
                                  ? 'bg-emerald-50 border-emerald-200' 
                                  : 'bg-orange-50 border-orange-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {tx.type === 'income' ? (
                                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                                  </div>
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                                    <ArrowDownLeft className="h-4 w-4 text-orange-600" />
                                  </div>
                                )}
                                <div>
                                  <p className={`font-medium text-sm ${
                                    tx.type === 'income' ? 'text-emerald-900' : 'text-orange-900'
                                  }`}>
                                    {tx.type === 'income' ? 'Pago' : 'Devolución'}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {new Date(tx.date).toLocaleDateString('es-ES', { 
                                      day: '2-digit', 
                                      month: '2-digit',
                                      year: 'numeric'
                                    })} • {tx.payment_method}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-bold ${
                                  tx.type === 'income' ? 'text-emerald-700' : 'text-orange-700'
                                }`}>
                                  {tx.type === 'income' ? '+' : '-'}€{tx.amount?.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ===== SECTION 4: RENTAL HISTORY ===== */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historial de Alquileres ({selectedCustomer.rental_history?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!selectedCustomer.rental_history || selectedCustomer.rental_history.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">Sin alquileres previos registrados</p>
                  ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto">
                      {selectedCustomer.rental_history.map((rental, idx) => (
                        <div 
                          key={rental.id || idx}
                          className={`p-4 rounded-lg border hover:bg-slate-50/50 transition-colors ${
                            rental.status === 'active' || rental.status === 'partial'
                              ? 'border-emerald-300 bg-emerald-50/30'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-500" />
                              <span className="font-medium text-slate-900">
                                {new Date(rental.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                {' - '}
                                {new Date(rental.end_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                              <Badge variant="outline">
                                {rental.days} {rental.days === 1 ? 'día' : 'días'}
                              </Badge>
                              {(rental.status === 'active' || rental.status === 'partial') && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                                  Activo
                                </Badge>
                              )}
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <DollarSign className="h-3 w-3 mr-1" />
                              €{(rental.total_amount || 0).toFixed(2)}
                            </Badge>
                          </div>
                          
                          {/* Items in this rental */}
                          {rental.items && rental.items.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Package className="h-4 w-4" />
                                <span className="font-medium">Equipos alquilados:</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                                {rental.items.slice(0, 6).map((item, itemIdx) => (
                                  <div key={itemIdx} className="flex items-center justify-between p-2 rounded bg-slate-50 text-sm">
                                    <span className="text-slate-700 truncate">
                                      {item.quantity > 1 && (
                                        <span className="font-bold text-blue-600 mr-1">{item.quantity}x</span>
                                      )}
                                      {item.item_type} {item.brand && `- ${item.brand}`} {item.model && item.model}
                                    </span>
                                    {item.size && (
                                      <Badge variant="secondary" className="text-xs shrink-0 ml-1">
                                        Talla {item.size}
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                                {rental.items.length > 6 && (
                                  <p className="text-xs text-slate-500 ml-2">
                                    + {rental.items.length - 6} más...
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                            <span>Método: {rental.payment_method || 'N/A'}</span>
                            <span className={rental.payment_status === 'paid' ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                              {rental.payment_status === 'paid' ? '✓ Pagado' : '⏳ Pendiente'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total Historical Stats */}
                  {selectedCustomer.rental_history && selectedCustomer.rental_history.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-slate-100 border border-slate-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Total Histórico de Alquileres</span>
                        <span className="font-bold text-slate-800">
                          €{selectedCustomer.rental_history.reduce((sum, r) => sum + (r.total_amount || 0), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          )}

          <DialogFooter className="flex gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCustomerModal(false);
                setEditingTechnicalData(false);
              }}
              data-testid="close-customer-modal-btn"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ PAYMENT METHOD EDITOR DIALOG ============ */}
      <Dialog open={showPaymentMethodDialog} onOpenChange={setShowPaymentMethodDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              Editar Método de Pago
            </DialogTitle>
            <DialogDescription>
              Cambiar la forma de cobro del alquiler. El sistema actualizará automáticamente la caja.
            </DialogDescription>
          </DialogHeader>

          {editingRental && (
            <div className="space-y-4 py-4">
              {/* Customer Info */}
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm font-semibold text-slate-700">{editingRental.customer_name}</p>
                <p className="text-xs text-slate-500">Alquiler #{editingRental.id.substring(0, 8).toUpperCase()}</p>
              </div>

              {/* Current Payment Method */}
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Método Actual:</Label>
                <Badge className={getPaymentMethodBadge(editingRental.payment_method || 'cash')}>
                  {getPaymentMethodLabel(editingRental.payment_method || 'cash')}
                </Badge>
              </div>

              {/* New Payment Method Selector */}
              <div className="space-y-2">
                <Label htmlFor="new-payment-method">Nuevo Método de Pago *</Label>
                <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                  <SelectTrigger id="new-payment-method" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Efectivo</SelectItem>
                    <SelectItem value="card">💳 Tarjeta</SelectItem>
                    <SelectItem value="online">🌐 Pago Online</SelectItem>
                    <SelectItem value="deposit">🏦 Depósito</SelectItem>
                    <SelectItem value="other">📝 Otro</SelectItem>
                    <SelectItem value="pending">🔴 Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Info Alert */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <p className="font-semibold mb-1">💡 Reconciliación Automática:</p>
                <p>• De ingreso a ingreso: Mueve entre cajas</p>
                <p>• De ingreso a deuda: Resta de la caja</p>
                <p>• De deuda a ingreso: Suma a la caja</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentMethodDialog(false)}
              disabled={savingPaymentMethod}
            >
              Cancelar
            </Button>
            <Button
              onClick={savePaymentMethod}
              disabled={savingPaymentMethod || !newPaymentMethod}
              className="gap-2"
            >
              {savingPaymentMethod ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Guardar Cambio
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ MODAL DE GESTIÓN DE CAMBIOS (Idéntico a Devoluciones) ============ */}
      <Dialog open={changeModalOpen} onOpenChange={closeChangeModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ArrowLeftRight className="h-6 w-6 text-orange-500" />
              Gestión de Contrato Completo
            </DialogTitle>
            <DialogDescription>
              Gestiona todos los artículos del cliente - Cambios de material y ajuste de fecha
            </DialogDescription>
          </DialogHeader>
          
          {changeRental && !changeComplete && (
            <div className="space-y-4 py-4">
              {/* Customer Info Header */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{changeRental.customer_name}</p>
                    <p className="text-sm text-slate-500">{changeRental.customer_dni}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-blue-100 text-blue-700 mb-1">
                      {changeDaysRemaining} días restantes
                    </Badge>
                    <p className="text-xs text-slate-500">Total: €{changeRental.total_amount?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>

              {/* ALL ITEMS FROM CONTRACT */}
              <div className="space-y-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5 text-slate-500" />
                  Artículos del Contrato ({changeItems.length})
                </Label>
                
                <div className="space-y-2 max-h-64 overflow-y-auto p-2 bg-slate-50 rounded-lg">
                  {changeItems.map((item, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        item.isSwapping 
                          ? 'bg-orange-50 border-orange-300' 
                          : activeSwapIndex === index
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm">
                              {item.internal_code || item.barcode}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {item.item_type}
                            </Badge>
                            {item.size && (
                              <span className="text-xs text-slate-500">Talla {item.size}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {item.brand} {item.model}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {item.isSwapping ? (
                            <>
                              <div className="text-right mr-2">
                                <p className="text-xs text-orange-600 font-medium">→ {item.swapNewItem?.internal_code || item.swapNewItem?.barcode}</p>
                                <p className="text-xs text-slate-500">
                                  Delta: {item.swapDelta >= 0 ? '+' : ''}€{item.swapDelta?.toFixed(2)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelItemSwap(index)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : activeSwapIndex === index ? (
                            <div className="flex gap-2 items-center">
                              <Input
                                ref={changeInputRef}
                                value={changeNewBarcode}
                                onChange={(e) => setChangeNewBarcode(e.target.value.toUpperCase())}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (changeNewBarcode.trim() && !changeLoading) {
                                      searchChangeSwapItem(changeNewBarcode);
                                    }
                                  } else if (e.key === 'Escape') {
                                    setActiveSwapIndex(null);
                                  }
                                }}
                                placeholder="Escanear código..."
                                className="h-8 w-40 text-sm font-mono"
                                autoFocus
                              />
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  if (changeNewBarcode.trim()) {
                                    searchChangeSwapItem(changeNewBarcode);
                                  }
                                }}
                                disabled={!changeNewBarcode.trim() || changeLoading}
                                className="h-8 px-2 bg-blue-600 hover:bg-blue-700"
                              >
                                {changeLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveSwapIndex(null)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startItemSwap(index)}
                              className="gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                            >
                              <Scan className="h-3 w-3" />
                              Sustituir
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DATE ADJUSTMENT */}
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarPlus className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-slate-900">Ajuste de Fecha</p>
                      <p className="text-xs text-slate-500">Extensión o devolución anticipada</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant={changeAdjustDate ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChangeAdjustDate(!changeAdjustDate)}
                      className={changeAdjustDate ? "bg-blue-600" : ""}
                    >
                      {changeAdjustDate ? 'Activado' : 'Activar'}
                    </Button>
                  </div>
                </div>
                
                {changeAdjustDate && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-slate-600">Fecha fin original</Label>
                        <p className="text-lg font-semibold text-slate-700">
                          {changeRental?.end_date ? new Date(changeRental.end_date).toLocaleDateString('es-ES') : '-'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-slate-600">Nueva fecha de fin</Label>
                        <Input
                          type="date"
                          value={changeNewEndDate}
                          onChange={(e) => handleChangeDateAdjustment(e.target.value)}
                          className="h-10 font-semibold"
                        />
                      </div>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-white border border-blue-200">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-medium">Días Originales</p>
                          <p className="text-2xl font-bold text-slate-700">{changeOriginalDays}</p>
                        </div>
                        <div className="flex items-center justify-center">
                          <ArrowRight className="h-6 w-6 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-medium">Días Nuevos</p>
                          <p className={`text-2xl font-bold ${
                            changeNewTotalDays > changeOriginalDays ? 'text-orange-600' :
                            changeNewTotalDays < changeOriginalDays ? 'text-emerald-600' : 'text-slate-700'
                          }`}>{changeNewTotalDays}</p>
                        </div>
                      </div>
                      
                      {/* Días a descontar (no facturables) */}
                      <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-amber-800">Días a descontar (No facturables)</p>
                            <p className="text-xs text-amber-600">Por cierre de estación, enfermedad, etc.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleChangeDiscountDays(changeDiscountDays - 1)}
                              disabled={changeDiscountDays <= 0}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              max={changeNewTotalDays - 1}
                              value={changeDiscountDays}
                              onChange={(e) => handleChangeDiscountDays(parseInt(e.target.value) || 0)}
                              className="w-16 h-8 text-center font-bold text-lg"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleChangeDiscountDays(changeDiscountDays + 1)}
                              disabled={changeDiscountDays >= changeNewTotalDays - 1}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {changeDiscountDays > 0 && (
                          <div className="mt-2 text-xs text-amber-700 flex justify-between">
                            <span>Días a cobrar: {changeNewTotalDays - changeDiscountDays}</span>
                            <span className="font-medium">Crédito: €{changeRefundAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      
                      {(changeDateDelta !== 0 || changeDiscountDays > 0) && (
                        <div className={`mt-3 p-2 rounded text-center ${
                          changeDateDelta > 0 ? 'bg-orange-100' : 'bg-amber-100'
                        }`}>
                          <p className="text-xs text-slate-600">
                            {changeDateDelta > 0 ? 'Suplemento por extensión' : 
                             changeDiscountDays > 0 ? 'Crédito por días no disfrutados' :
                             'Abono por devolución anticipada'}
                          </p>
                          <p className={`text-lg font-bold ${
                            changeDateDelta > 0 ? 'text-orange-700' : 'text-amber-700'
                          }`}>
                            {changeDateDelta > 0 ? '+' : ''}€{Math.abs(changeDateDelta).toFixed(2)}
                          </p>
                          {changeDiscountDays > 0 && (
                            <p className="text-xs text-amber-600 mt-1 font-medium">
                              💳 Se aplicará en la devolución final
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* TOTAL DELTA SUMMARY */}
              <div className={`p-5 rounded-xl border-2 ${
                changeDiscountDays > 0
                  ? 'bg-amber-50 border-amber-300'
                  : changeTotalDelta > 0 
                  ? 'bg-orange-50 border-orange-300' 
                  : changeTotalDelta < 0 
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      {changeDiscountDays > 0 ? '💳 CRÉDITO PENDIENTE' :
                       changeTotalDelta > 0 ? '⬆️ TOTAL A COBRAR' : 
                       changeTotalDelta < 0 ? '⬇️ TOTAL A ABONAR' : 
                       '↔️ SIN DIFERENCIA'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {changeDiscountDays > 0 
                        ? 'Se abonará en la devolución final'
                        : (<>
                            {changeItems.filter(i => i.isSwapping).length > 0 && 
                              `${changeItems.filter(i => i.isSwapping).length} cambio(s) de material`}
                            {changeItems.filter(i => i.isSwapping).length > 0 && changeAdjustDate && changeDateDelta !== 0 && ' + '}
                            {changeAdjustDate && changeDateDelta !== 0 && 
                              (changeDateDelta > 0 ? 'extensión de fecha' : 'devolución anticipada')}
                          </>)
                      }
                    </p>
                  </div>
                  <p className={`text-3xl font-bold ${
                    changeDiscountDays > 0 ? 'text-amber-600' :
                    changeTotalDelta > 0 ? 'text-orange-600' : 
                    changeTotalDelta < 0 ? 'text-emerald-600' : 'text-slate-500'
                  }`}>
                    {changeDiscountDays > 0 ? `-€${changeRefundAmount.toFixed(2)}` :
                     (changeTotalDelta > 0 ? '+' : changeTotalDelta < 0 ? '-' : '') + '€' + Math.abs(changeTotalDelta).toFixed(2)}
                  </p>
                </div>
                {changeDiscountDays > 0 && (
                  <p className="text-xs text-amber-700 mt-2 bg-amber-100 p-2 rounded">
                    ℹ️ El cliente tiene €{changeRefundAmount.toFixed(2)} a su favor por {changeDiscountDays} día(s) no disfrutado(s). 
                    Este crédito se descontará automáticamente en la devolución.
                  </p>
                )}
              </div>

              {/* Payment Method - Solo mostrar si NO hay días a descontar */}
              {changeTotalDelta !== 0 && changeDiscountDays === 0 && (
                <div className="space-y-2">
                  <Label className="shrink-0">Método de {changeTotalDelta > 0 ? 'cobro' : 'abono'}:</Label>
                  
                  {changeTotalDelta > 0 ? (
                    <div className="flex gap-2">
                      <Button
                        variant={changePaymentMethod === "cash" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setChangePaymentMethod("cash")}
                        className="gap-1"
                      >
                        <Banknote className="h-4 w-4" />
                        Efectivo
                      </Button>
                      <Button
                        variant={changePaymentMethod === "card" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setChangePaymentMethod("card")}
                        className="gap-1"
                      >
                        <CreditCard className="h-4 w-4" />
                        Tarjeta
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="h-10 px-3 flex items-center justify-between rounded-md border border-slate-300 bg-slate-100 cursor-not-allowed max-w-xs">
                        <div className="flex items-center gap-2">
                          {(changeRental?.payment_method || 'cash') === 'cash' ? (
                            <>
                              <Banknote className="h-4 w-4 text-emerald-600" />
                              <span className="font-medium text-slate-700">Efectivo</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-slate-700">Tarjeta</span>
                            </>
                          )}
                        </div>
                        <Lock className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 max-w-md">
                        <p className="text-xs text-amber-800 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                          <span>Por seguridad, el abono se realiza al mismo método de pago original.</span>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {changeComplete && (
            <div className="py-8 text-center">
              <CheckCircle className={`h-16 w-16 mx-auto mb-4 ${changeDiscountDays > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {changeDiscountDays > 0 ? '¡Crédito Registrado!' : '¡Cambios Procesados!'}
              </h3>
              <p className="text-slate-600 mb-4">
                {changeItems.filter(i => i.isSwapping).length > 0 && 
                  `${changeItems.filter(i => i.isSwapping).length} artículo(s) sustituido(s)`}
                {changeItems.filter(i => i.isSwapping).length > 0 && changeAdjustDate && changeDateDelta !== 0 && ' + '}
                {changeAdjustDate && changeDateDelta !== 0 && 'ajuste de fecha aplicado'}
              </p>
              {changeDiscountDays > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 max-w-md mx-auto">
                  <p className="text-amber-800 font-medium">
                    💳 Crédito pendiente: €{changeRefundAmount.toFixed(2)}
                  </p>
                  <p className="text-amber-700 text-sm mt-1">
                    Se abonará automáticamente en la devolución final del equipo.
                  </p>
                </div>
              )}
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={printChangeTicket}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Ticket
                </Button>
                <Button onClick={closeChangeModal}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            {!changeComplete && (
              <>
                <Button variant="outline" onClick={closeChangeModal}>
                  Cancelar
                </Button>
                <Button 
                  onClick={executeAllChanges}
                  disabled={changeLoading || (changeItems.filter(i => i.isSwapping).length === 0 && !changeAdjustDate && changeDiscountDays === 0)}
                  className={`min-w-[180px] ${
                    changeDiscountDays > 0 ? 'bg-amber-600 hover:bg-amber-700' :
                    changeTotalDelta > 0 ? 'bg-orange-600 hover:bg-orange-700' :
                    changeTotalDelta < 0 ? 'bg-emerald-600 hover:bg-emerald-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {changeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  {changeDiscountDays > 0 ? `Registrar Crédito €${changeRefundAmount.toFixed(2)}` :
                   changeTotalDelta > 0 ? `Cobrar €${changeTotalDelta.toFixed(2)}` :
                   changeTotalDelta < 0 ? `Abonar €${Math.abs(changeTotalDelta).toFixed(2)}` :
                   'Confirmar Cambio'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ============ MODAL AÑADIR ARTÍCULOS ============ */}
      <Dialog open={addItemsModalOpen} onOpenChange={setAddItemsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="add-items-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              Añadir Artículos al Alquiler
            </DialogTitle>
            <DialogDescription>
              Cliente: <strong>{addItemsRental?.customer_name}</strong> | 
              Alquiler hasta: <strong>{addItemsRental?.end_date?.split('T')[0]}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Items existentes del alquiler */}
            {addItemsExistingItems.length > 0 && (
              <div className="bg-slate-50 border rounded-lg p-3">
                <p className="text-sm font-medium text-slate-600 mb-2">
                  Material actual en el alquiler ({addItemsExistingItems.length}):
                </p>
                <div className="flex flex-wrap gap-1">
                  {addItemsExistingItems.map(item => (
                    <Badge key={item.barcode} variant="secondary" className="text-xs">
                      {item.item_type} {item.size && `(${item.size})`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Días para los nuevos artículos - CON REACTIVIDAD */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label>Días de alquiler para los nuevos artículos</Label>
                <Input
                  type="number"
                  value={addItemsDays}
                  onChange={(e) => handleAddItemsDaysChange(e.target.value)}
                  min="1"
                  className="h-11 mt-1"
                  data-testid="add-items-days-input"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Por defecto: días restantes hasta el fin del alquiler original
                </p>
              </div>
            </div>
            
            {/* Búsqueda de artículos */}
            <div>
              <Label>Buscar artículo disponible</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  ref={addItemsSearchRef}
                  placeholder="Escanea código o busca por nombre/tipo/marca..."
                  value={addItemsSearch}
                  onChange={handleAddItemsSearchChange}
                  onKeyDown={handleAddItemsSearchKeyDown}
                  className="h-11 mt-1 pl-10"
                  autoFocus
                  data-testid="add-items-search-input"
                />
                {addItemsSearchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                💡 Escanea con Enter para añadir directamente | Busca por nombre, tipo, marca o modelo
              </p>
            </div>
            
            {/* Lista de artículos disponibles encontrados */}
            {addItemsSearchResults.length > 0 && (
              <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto bg-slate-50">
                <p className="text-sm font-medium mb-2 text-slate-700">
                  Artículos disponibles ({addItemsSearchResults.length}):
                </p>
                <div className="space-y-1">
                  {addItemsSearchResults.map(item => (
                    <div 
                      key={item.barcode} 
                      className="flex items-center justify-between p-2 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                      onClick={() => addItemToRental(item)}
                      data-testid={`add-item-result-${item.barcode}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {item.name || item.item_type}
                          {item.size && <span className="text-slate-500 ml-2">({item.size})</span>}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {item.internal_code || item.barcode}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          €{getAddItemsTariffPrice(item.item_type, addItemsDays).toFixed(2)}
                        </span>
                        <Button size="sm" variant="ghost" className="shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Mensaje si no hay resultados */}
            {addItemsSearch.length >= 2 && !addItemsSearchLoading && addItemsSearchResults.length === 0 && (
              <div className="border rounded-lg p-4 text-center text-slate-500 bg-slate-50">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No se encontraron artículos disponibles para "{addItemsSearch}"</p>
              </div>
            )}
            
            {/* Packs detectados */}
            {(() => {
              const { detectedPacks } = calculateAddItemsTotalWithPacks();
              if (detectedPacks.length === 0) return null;
              
              return (
                <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
                  <p className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Packs detectados:
                  </p>
                  <div className="space-y-2">
                    {detectedPacks.map((dp, idx) => (
                      <div key={dp.instanceId || idx} className="bg-white rounded p-2 border border-purple-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium text-purple-900">{dp.pack.name}</span>
                            {dp.isMixedPack && (
                              <Badge variant="outline" className="ml-2 text-xs border-purple-400 text-purple-600">
                                Completa pack existente
                              </Badge>
                            )}
                          </div>
                          <span className="font-bold text-purple-700">
                            €{getAddItemsPackPrice(dp.pack, addItemsDays).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-purple-600 mt-1">
                          Componentes: {dp.pack.items.join(' + ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            
            {/* Artículos seleccionados para añadir */}
            {addItemsSelected.length > 0 && (
              <div className="border-2 border-emerald-300 rounded-lg p-3 bg-emerald-50" data-testid="add-items-selected-list">
                <p className="text-sm font-semibold mb-2 text-emerald-800">
                  Artículos a añadir ({addItemsSelected.length}):
                </p>
                <div className="space-y-2">
                  {(() => {
                    const { detectedPacks } = calculateAddItemsTotalWithPacks();
                    const itemsInPacks = new Set();
                    detectedPacks.forEach(dp => dp.items.forEach(bc => itemsInPacks.add(bc)));
                    
                    return addItemsSelected.map((item) => {
                      const isInPack = itemsInPacks.has(item.barcode);
                      
                      return (
                        <div key={item.barcode} className={`flex items-center justify-between p-2 bg-white rounded border ${isInPack ? 'border-purple-300' : 'border-emerald-200'}`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900">
                              {item.name}
                              {isInPack && <Package className="inline h-3 w-3 ml-1 text-purple-500" />}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              {item.internal_code || item.barcode} | {item.size && `Talla: ${item.size} | `}{addItemsDays} días
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!isInPack && (
                              <span className="text-emerald-700 font-bold">€{item.unit_price.toFixed(2)}</span>
                            )}
                            {isInPack && (
                              <span className="text-xs text-purple-500">(en pack)</span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeItemFromAddList(item.barcode)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                              data-testid={`remove-item-${item.barcode}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                
                {/* Resumen de cobro con lógica de packs */}
                <div className="mt-3 p-3 bg-white rounded border-2 border-emerald-400">
                  {(() => {
                    const { total } = calculateAddItemsTotalWithPacks();
                    return (
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-semibold text-slate-700">Total adicional:</span>
                        <span className="text-2xl font-bold text-emerald-700" data-testid="add-items-total">
                          €{total.toFixed(2)}
                        </span>
                      </div>
                    );
                  })()}
                  
                  {/* Selector de método de pago */}
                  <div className="mt-2">
                    <Label className="text-xs text-slate-600 mb-2 block">¿Cómo desea pagar?</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={addItemsPaymentMethod === "cash" && addItemsChargeNow ? "default" : "outline"}
                        onClick={() => {
                          setAddItemsPaymentMethod("cash");
                          setAddItemsChargeNow(true);
                        }}
                        className={addItemsPaymentMethod === "cash" && addItemsChargeNow ? "bg-emerald-600 hover:bg-emerald-700 flex-1" : "flex-1"}
                        data-testid="add-items-payment-cash"
                      >
                        <Banknote className="h-4 w-4 mr-1" /> Efectivo
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={addItemsPaymentMethod === "card" && addItemsChargeNow ? "default" : "outline"}
                        onClick={() => {
                          setAddItemsPaymentMethod("card");
                          setAddItemsChargeNow(true);
                        }}
                        className={addItemsPaymentMethod === "card" && addItemsChargeNow ? "bg-blue-600 hover:bg-blue-700 flex-1" : "flex-1"}
                        data-testid="add-items-payment-card"
                      >
                        <CreditCard className="h-4 w-4 mr-1" /> Tarjeta
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={!addItemsChargeNow ? "default" : "outline"}
                        onClick={() => {
                          setAddItemsPaymentMethod("pending");
                          setAddItemsChargeNow(false);
                        }}
                        className={!addItemsChargeNow ? "bg-amber-600 hover:bg-amber-700 flex-1" : "flex-1"}
                        data-testid="add-items-payment-pending"
                      >
                        <Clock className="h-4 w-4 mr-1" /> Pendiente
                      </Button>
                    </div>
                    
                    {!addItemsChargeNow && (
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        El importe se sumará al saldo pendiente y se cobrará en la devolución
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmAddItems}
              disabled={addItemsSelected.length === 0 || addItemsProcessing}
              className={addItemsChargeNow ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"}
              data-testid="add-items-confirm-btn"
            >
              {addItemsProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {addItemsChargeNow 
                ? `Cobrar €${calculateAddItemsTotalWithPacks().total.toFixed(2)} y Añadir`
                : `Añadir (€${calculateAddItemsTotalWithPacks().total.toFixed(2)} pendiente)`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ QUICK PAYMENT MODAL ============ */}
      <Dialog open={quickPaymentModalOpen} onOpenChange={closeQuickPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-6 w-6 text-amber-500" />
              Cobro Rápido
            </DialogTitle>
            {quickPaymentRental && (
              <DialogDescription className="text-base">
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge className="bg-slate-100 text-slate-800 px-3 py-1">
                    <User className="h-4 w-4 mr-1" />
                    {quickPaymentRental.customer_name}
                  </Badge>
                  <Badge variant="outline">{quickPaymentRental.customer_dni}</Badge>
                </div>
              </DialogDescription>
            )}
          </DialogHeader>

          {quickPaymentRental && (
            <div className="space-y-4 py-4">
              {/* Resumen del alquiler */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total alquiler:</span>
                  <span className="font-medium">€{quickPaymentRental.total_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Ya pagado:</span>
                  <span className="font-medium text-emerald-600">€{quickPaymentRental.paid_amount?.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold text-red-600">Pendiente:</span>
                  <span className="font-bold text-red-600 text-lg">€{quickPaymentRental.pending_amount?.toFixed(2)}</span>
                </div>
              </div>

              {/* Importe a cobrar */}
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Importe a cobrar</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">€</span>
                  <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={quickPaymentRental.pending_amount}
                    value={quickPaymentAmount}
                    onChange={(e) => setQuickPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="pl-8 text-lg font-semibold text-center"
                    data-testid="quick-payment-amount"
                  />
                </div>
                {quickPaymentAmount < quickPaymentRental.pending_amount && quickPaymentAmount > 0 && (
                  <p className="text-xs text-amber-600">
                    Quedará pendiente: €{(quickPaymentRental.pending_amount - quickPaymentAmount).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Método de pago */}
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <div className="flex gap-2">
                  <Button
                    variant={quickPaymentMethod === "cash" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuickPaymentMethod("cash")}
                    className={`flex-1 gap-2 ${quickPaymentMethod === "cash" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                    data-testid="quick-payment-cash"
                  >
                    <Banknote className="h-4 w-4" />
                    Efectivo
                  </Button>
                  <Button
                    variant={quickPaymentMethod === "card" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuickPaymentMethod("card")}
                    className={`flex-1 gap-2 ${quickPaymentMethod === "card" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                    data-testid="quick-payment-card"
                  >
                    <CreditCard className="h-4 w-4" />
                    Tarjeta
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeQuickPaymentModal}>
              Cancelar
            </Button>
            <Button
              onClick={processQuickPayment}
              disabled={quickPaymentProcessing || quickPaymentAmount <= 0}
              className="bg-amber-500 hover:bg-amber-600 min-w-[140px]"
              data-testid="quick-payment-confirm"
            >
              {quickPaymentProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Cobrar €{quickPaymentAmount.toFixed(2)}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
