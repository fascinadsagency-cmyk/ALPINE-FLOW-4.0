import { useState, useEffect, useRef } from "react";
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
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "card", label: "Tarjeta", icon: CreditCard },
];

export default function ActiveRentals() {
  const navigate = useNavigate();
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

  // ============ UNIVERSAL SWAP MODAL STATE ============
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
        // Item is currently rented - auto-open swap modal
        toast.success(`✓ ${result.item?.internal_code || result.item?.barcode}: Cliente ${result.rental?.customer_name}`);
        
        // Find the rental in our list
        const rental = rentals.find(r => r.id === result.rental?.id);
        if (rental) {
          openSwapModalWithItem(rental, result.item);
        } else {
          // Use the rental data from lookup
          openSwapModalWithItem(result.rental, result.item);
        }
        setSearchQuery("");
      } else if (result.found && result.type === "customer") {
        // Customer found
        toast.success(`✓ Cliente: ${result.customer?.name}`);
        const rental = rentals.find(r => r.id === result.rental?.id);
        if (rental) {
          openSwapModalWithItem(rental, null);
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
    
    // Auto-focus input
    setTimeout(() => {
      swapInputRef.current?.focus();
    }, 150);
  };

  const openSwapModalWithItem = (rental, triggerItem) => {
    setSwapRental(rental);
    setSwapBarcode("");
    setSwapNewItem(null);
    setSwapOldItem(triggerItem?.rental_item_data || triggerItem);
    setSwapDelta(null);
    setSwapComplete(false);
    setSwapPaymentMethod("cash");
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
    
    // Auto-focus input
    setTimeout(() => {
      swapInputRef.current?.focus();
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
          setTimeout(() => swapInputRef.current?.focus(), 100);
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

  // CONFIRM SWAP - Execute the change
  const executeSwap = async () => {
    if (!swapRental || !swapNewItem || !swapOldItem) {
      toast.error("Faltan datos para realizar el cambio");
      return;
    }

    setSwapLoading(true);
    try {
      const response = await axios.post(`${API}/rentals/${swapRental.id}/central-swap`, {
        old_item_barcode: swapOldItem.barcode || swapOldItem.internal_code,
        new_item_barcode: swapNewItem.barcode || swapNewItem.internal_code,
        days_remaining: parseInt(swapNewDays) || swapDaysRemaining,
        payment_method: swapPaymentMethod,
        delta_amount: swapDelta?.delta || 0
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      // Success
      setSwapComplete(true);
      
      if (swapDelta?.isUpgrade) {
        toast.success(`✅ Cambio completado. Suplemento: +€${swapDelta.delta.toFixed(2)}`);
      } else if (swapDelta?.isDowngrade) {
        toast.success(`✅ Cambio completado. Abono: -€${Math.abs(swapDelta.delta).toFixed(2)}`);
      } else {
        toast.success("✅ Cambio completado sin diferencia de precio");
      }

      // Reload rentals
      loadActiveRentals();

    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al procesar el cambio");
    } finally {
      setSwapLoading(false);
    }
  };

  // Print swap ticket
  const printSwapTicket = () => {
    if (!swapRental || !swapNewItem || !swapOldItem || !swapDelta) return;

    const ticketWindow = window.open('', '_blank', 'width=400,height=600');
    ticketWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket de Cambio</title>
        <style>
          @media print { @page { margin: 0; size: 80mm auto; } body { margin: 0; } }
          body { font-family: 'Courier New', monospace; width: 80mm; padding: 5mm; margin: 0 auto; font-size: 11px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 14px; }
          .section { border-bottom: 1px dashed #ccc; padding: 8px 0; margin-bottom: 8px; }
          .row { display: flex; justify-content: space-between; padding: 3px 0; }
          .label { color: #666; }
          .value { font-weight: bold; }
          .delta-box { text-align: center; padding: 15px; margin: 10px 0; border-radius: 4px; }
          .delta-positive { background: #dcfce7; color: #166534; }
          .delta-negative { background: #fee2e2; color: #991b1b; }
          .delta-zero { background: #f3f4f6; color: #374151; }
          .delta-amount { font-size: 24px; font-weight: bold; }
          .footer { text-align: center; margin-top: 15px; font-size: 9px; color: #666; }
          .print-btn { display: block; width: 100%; padding: 10px; margin-top: 15px; background: #2563eb; color: white; border: none; cursor: pointer; font-size: 12px; border-radius: 4px; }
          @media print { .print-btn { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>COMPROBANTE DE CAMBIO</h1>
          <p>Regularización de material</p>
        </div>
        
        <div class="section">
          <div class="row"><span class="label">Cliente:</span><span class="value">${swapRental.customer_name}</span></div>
          <div class="row"><span class="label">DNI:</span><span class="value">${swapRental.customer_dni || '-'}</span></div>
          <div class="row"><span class="label">Alquiler:</span><span class="value">#${swapRental.id.substring(0, 8).toUpperCase()}</span></div>
        </div>
        
        <div class="section">
          <p style="font-weight: bold; margin: 0 0 8px 0;">❌ MATERIAL DEVUELTO</p>
          <div class="row"><span>${swapOldItem.internal_code || swapOldItem.barcode}</span><span>€${swapDelta.oldPrice.toFixed(2)}</span></div>
          <div style="font-size: 10px; color: #666;">${swapOldItem.item_type} - ${swapOldItem.brand || ''} ${swapOldItem.model || ''}</div>
        </div>
        
        <div class="section">
          <p style="font-weight: bold; margin: 0 0 8px 0;">✅ MATERIAL ENTREGADO</p>
          <div class="row"><span>${swapNewItem.internal_code || swapNewItem.barcode}</span><span>€${swapDelta.newPrice.toFixed(2)}</span></div>
          <div style="font-size: 10px; color: #666;">${swapNewItem.item_type} - ${swapNewItem.brand || ''} ${swapNewItem.model || ''}</div>
        </div>
        
        <div class="delta-box ${swapDelta.isUpgrade ? 'delta-positive' : swapDelta.isDowngrade ? 'delta-negative' : 'delta-zero'}">
          <p style="margin: 0 0 5px 0; font-size: 10px;">${swapDelta.isUpgrade ? 'SUPLEMENTO COBRADO' : swapDelta.isDowngrade ? 'ABONO AL CLIENTE' : 'SIN DIFERENCIA'}</p>
          <p class="delta-amount">${swapDelta.delta > 0 ? '+' : swapDelta.delta < 0 ? '-' : ''}€${Math.abs(swapDelta.delta).toFixed(2)}</p>
          <p style="margin: 5px 0 0 0; font-size: 10px;">Método: ${swapPaymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}</p>
        </div>
        
        <div class="footer">
          <p>Fecha: ${new Date().toLocaleString('es-ES')}</p>
          <p>Días restantes: ${swapDelta.days}</p>
          <p style="margin-top: 8px;">Gracias por su confianza</p>
        </div>
        
        <button class="print-btn" onclick="window.print(); setTimeout(() => window.close(), 500);">IMPRIMIR</button>
      </body>
      </html>
    `);
    ticketWindow.document.close();
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
        notes: rental.customer_notes,
        items: rental.items || [],
        rental_id: rental.id,
        start_date: rental.start_date,
        end_date: rental.end_date,
        days: rental.days,
        total_amount: rental.total_amount,
        rental_history: [] // Will be loaded
      };
      
      if (rental.customer_id) {
        try {
          // Load customer data
          const response = await axios.get(`${API}/customers/${rental.customer_id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          customerData = { ...customerData, ...response.data, items: rental.items || [], rental_id: rental.id };
          
          // Load rental history for this customer
          const historyResponse = await axios.get(`${API}/rentals?customer_id=${rental.customer_id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          customerData.rental_history = historyResponse.data || [];
        } catch (e) {
          // Customer might not exist in database, use rental data
          console.log("Customer lookup failed, using rental data");
        }
      }
      
      setSelectedCustomer(customerData);
    } catch (error) {
      toast.error("Error al cargar datos del cliente");
    } finally {
      setCustomerLoading(false);
    }
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

  return (
    <div className="p-6 lg:p-8" data-testid="active-rentals-page">
      {/* ============ STICKY HEADER WITH SEARCH & CAMBIOS BUTTON ============ */}
      <div className="sticky top-0 z-20 bg-white pb-4 -mx-6 px-6 lg:-mx-8 lg:px-8 pt-2 border-b border-slate-200 shadow-sm mb-6">
        <div className="flex flex-col gap-4">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Alquileres Activos
            </h1>
            <Badge variant="outline" className="shrink-0">
              {filteredRentals.length} de {rentals.length}
            </Badge>
          </div>
          
          {/* Search bar + CAMBIOS button */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Smart Search Input */}
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-400">
                <Scan className="h-5 w-5" />
              </div>
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onKeyDown={handleSearchKeyDown}
                placeholder="Escanea código o escribe nombre del cliente..."
                className="h-12 pl-12 pr-12 text-base font-mono bg-slate-50 border-2 border-slate-200 focus:border-blue-400 focus:bg-white rounded-xl"
                data-testid="smart-search-input"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {searchLoading && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                </div>
              )}
            </div>
            
            {/* CAMBIOS Button - Prominent */}
            <Button
              onClick={openSwapModalBlank}
              className="h-12 px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold text-base shadow-lg hover:shadow-xl transition-all shrink-0"
              data-testid="cambios-btn"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              CAMBIOS
            </Button>
          </div>
          
          {/* Quick help text */}
          <p className="text-xs text-slate-500">
            💡 Escanea un artículo para identificar al cliente automáticamente, o pulsa <strong>CAMBIOS</strong> para abrir el gestor manualmente
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
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRentals.map((rental) => {
                    const activeItems = rental.items.filter(i => !i.returned);
                    const itemCount = activeItems.length;
                    
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
                        </TableCell>
                        
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openSwapModal(rental)}
                              className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-400 h-8"
                              data-testid={`swap-btn-${rental.id}`}
                              title="Cambiar material"
                            >
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">CAMBIOS</span>
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
                    <div>
                      <p className="font-mono font-bold">{swapOldItem.internal_code || swapOldItem.barcode}</p>
                      <p className="text-sm text-slate-600">{swapOldItem.item_type}</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-3">Ahora escanea el NUEVO artículo que entregará al cliente</p>
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

              {/* PRICE DELTA DISPLAY */}
              {swapDelta && swapNewItem && swapOldItem && (
                <div className={`p-5 rounded-xl border-2 text-center ${
                  swapDelta.isUpgrade ? 'bg-emerald-50 border-emerald-300' :
                  swapDelta.isDowngrade ? 'bg-red-50 border-red-300' :
                  'bg-slate-50 border-slate-300'
                }`}>
                  <p className="text-sm font-medium mb-2">
                    {swapDelta.isUpgrade ? '⬆️ UPGRADE - Suplemento a cobrar al cliente' :
                     swapDelta.isDowngrade ? '⬇️ DOWNGRADE - Abono al cliente' :
                     '↔️ MISMO PRECIO - Sin diferencia económica'}
                  </p>
                  <p className={`text-4xl font-bold ${
                    swapDelta.isUpgrade ? 'text-emerald-600' :
                    swapDelta.isDowngrade ? 'text-red-600' :
                    'text-slate-600'
                  }`}>
                    {swapDelta.delta > 0 ? '+' : swapDelta.delta < 0 ? '-' : ''}€{Math.abs(swapDelta.delta).toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">para {swapDelta.days} días restantes</p>
                </div>
              )}

              {/* DAYS ADJUSTMENT */}
              {swapNewItem && swapOldItem && (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-sm">Ajustar días (opcional)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={swapNewDays}
                      onChange={handleSwapDaysChange}
                      className="h-10 w-24"
                    />
                  </div>
                  
                  {/* Payment method if delta != 0 */}
                  {swapDelta && swapDelta.delta !== 0 && (
                    <div className="flex-1">
                      <Label className="text-sm">Método de {swapDelta.isUpgrade ? 'cobro' : 'abono'}</Label>
                      <div className="flex gap-2 mt-1">
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
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* SUCCESS STATE */
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-emerald-800 mb-2">¡Cambio Completado!</h3>
              <p className="text-slate-600">El material ha sido intercambiado y el inventario actualizado.</p>
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
                  disabled={swapLoading || !swapNewItem || !swapOldItem}
                  className={`min-w-[200px] ${
                    swapDelta?.isUpgrade ? 'bg-emerald-600 hover:bg-emerald-700' :
                    swapDelta?.isDowngrade ? 'bg-red-600 hover:bg-red-700' :
                    ''
                  }`}
                  data-testid="confirm-swap-btn"
                >
                  {swapLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  {swapDelta?.isUpgrade ? `Cobrar €${swapDelta.delta.toFixed(2)} y Cambiar` :
                   swapDelta?.isDowngrade ? `Abonar €${Math.abs(swapDelta.delta).toFixed(2)} y Cambiar` :
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
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Ficha del Cliente
            </DialogTitle>
          </DialogHeader>
          
          {customerLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedCustomer && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedCustomer.name}</h3>
                    {selectedCustomer.rental_id && (
                      <p className="text-sm text-slate-500 mt-1">
                        Alquiler #{selectedCustomer.rental_id.substring(0, 8).toUpperCase()}
                      </p>
                    )}
                  </div>
                  {selectedCustomer.dni && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500">DNI</p>
                      <p className="font-mono font-semibold">{selectedCustomer.dni}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {selectedCustomer.phone && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="text-xs text-emerald-600">Teléfono</p>
                        <p className="font-semibold">{selectedCustomer.phone}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => callPhone(selectedCustomer.phone)}>
                        <Phone className="h-3 w-3" />
                      </Button>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => sendWhatsAppMessage(selectedCustomer.phone, selectedCustomer.name)}>
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {selectedCustomer.email && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-blue-600">Email</p>
                        <p className="font-semibold">{selectedCustomer.email}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => sendEmail(selectedCustomer.email, selectedCustomer.name)}>
                      <Mail className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {selectedCustomer.hotel && (
                  <div className="flex items-center p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <MapPin className="h-5 w-5 text-purple-600 mr-3" />
                    <div>
                      <p className="text-xs text-purple-600">Hotel</p>
                      <p className="font-semibold">{selectedCustomer.hotel}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Rental History Section */}
              {selectedCustomer.rental_history && selectedCustomer.rental_history.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Historial de Alquileres ({selectedCustomer.rental_history.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedCustomer.rental_history.slice(0, 10).map((rental, idx) => (
                      <div 
                        key={rental.id || idx}
                        className={`p-3 rounded-lg border text-sm ${
                          rental.status === 'active' || rental.status === 'partial' 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-800">
                              {new Date(rental.start_date).toLocaleDateString('es-ES')} 
                              {rental.days && ` • ${rental.days} días`}
                            </p>
                            <p className="text-xs text-slate-500">
                              {rental.items?.length || 0} artículos
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">€{(rental.total_amount || 0).toFixed(2)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              rental.status === 'active' || rental.status === 'partial'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              {rental.status === 'active' || rental.status === 'partial' ? 'Activo' : 'Cerrado'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Total stats */}
                  <div className="mt-3 p-3 rounded-lg bg-slate-100 border border-slate-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total Histórico</span>
                      <span className="font-bold text-slate-800">
                        €{selectedCustomer.rental_history.reduce((sum, r) => sum + (r.total_amount || 0), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCustomerModal(false)}>Cerrar</Button>
            {selectedCustomer?.id && (
              <Button 
                onClick={() => {
                  setShowCustomerModal(false);
                  navigate(`/clientes?highlight=${selectedCustomer.id}`);
                }}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Ver Ficha Completa
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
