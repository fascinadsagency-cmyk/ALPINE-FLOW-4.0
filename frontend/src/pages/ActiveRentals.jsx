import { useState, useEffect, useRef } from "react";
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
  DollarSign, 
  Edit2,
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
  X
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "card", label: "Tarjeta", icon: CreditCard },
];

export default function ActiveRentals() {
  const [rentals, setRentals] = useState([]);
  const [filteredRentals, setFilteredRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ============ SMART SEARCH STATE ============
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef(null);
  
  // Step-based modification flow
  const [editingRental, setEditingRental] = useState(null);
  const [newDays, setNewDays] = useState("");
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [updating, setUpdating] = useState(false);
  const [modificationResult, setModificationResult] = useState(null);

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
  const [swapDelta, setSwapDelta] = useState(null); // Price difference
  const [swapPaymentMethod, setSwapPaymentMethod] = useState("cash");
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapComplete, setSwapComplete] = useState(false);
  const [swapAction, setSwapAction] = useState("swap"); // "swap" or "return"
  const swapInputRef = useRef(null);

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
    
    // Calculate days remaining
    const endDate = new Date(rental.end_date);
    const today = new Date();
    const daysLeft = Math.max(1, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)) + 1);
    setSwapDaysRemaining(daysLeft);
    setSwapNewDays(daysLeft.toString());
    
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
    setSwapRental(null);
    setSwapBarcode("");
    setSwapNewItem(null);
    setSwapOldItem(null);
    setSwapDelta(null);
    setSwapComplete(false);
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
    if (!code.trim() || !swapRental) return;
    
    setSwapLoading(true);
    try {
      // Search for the new item by barcode or internal_code
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
        setSwapOldItem(null);
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
      const rentalItems = swapRental.items.filter(i => !i.returned);
      const matchingOldItem = rentalItems.find(i => 
        i.item_type?.toLowerCase() === foundItem.item_type?.toLowerCase()
      );

      if (matchingOldItem) {
        setSwapOldItem(matchingOldItem);
        toast.success(`✓ Sustitución detectada: ${matchingOldItem.internal_code || matchingOldItem.barcode} → ${foundItem.internal_code || foundItem.barcode}`);
        
        // Calculate price delta
        await calculateSwapPriceDelta(matchingOldItem, foundItem);
      } else {
        // No matching type found - let user select manually
        toast.warning(`No se encontró un artículo del mismo tipo (${foundItem.item_type}) en el alquiler`);
        setSwapOldItem(null);
        setSwapDelta(null);
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

  // ============ MODIFICATION DIALOG FUNCTIONS ============

  const openEditDialog = (rental) => {
    setEditingRental(rental);
    setNewDays(rental.days.toString());
    setStep(1);
    setPaymentMethod("cash");
    setModificationResult(null);
  };

  const closeDialog = () => {
    setEditingRental(null);
    setNewDays("");
    setStep(1);
    setPaymentMethod("cash");
    setModificationResult(null);
  };

  const calculateNewTotal = () => {
    if (!editingRental || newDays === "") return editingRental?.total_amount || 0;
    const daysInt = parseInt(newDays);
    if (isNaN(daysInt) || daysInt < 0) return editingRental.total_amount;
    if (daysInt === 0) return 0;
    const pricePerDay = editingRental.total_amount / editingRental.days;
    return pricePerDay * daysInt;
  };

  const calculateDifference = () => {
    const newTotal = calculateNewTotal();
    return newTotal - editingRental?.total_amount || 0;
  };

  const calculateNewEndDate = () => {
    if (!editingRental || newDays === "") return "";
    const daysInt = parseInt(newDays);
    if (isNaN(daysInt) || daysInt < 0) return "";
    const startDate = new Date(editingRental.start_date);
    if (daysInt === 0) return startDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + daysInt - 1);
    return endDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getDifferenceLabel = () => {
    const diff = calculateDifference();
    if (diff > 0) return { text: "A COBRAR", color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" };
    if (diff < 0) return { text: "A DEVOLVER", color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-200" };
    return { text: "SIN CAMBIOS", color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200" };
  };

  const proceedToPayment = () => {
    const daysInt = parseInt(newDays);
    if (isNaN(daysInt) || daysInt < 0) {
      toast.error("Introduce un número válido de días (0 o más)");
      return;
    }
    if (daysInt === editingRental.days) {
      toast.error("El número de días no ha cambiado");
      return;
    }
    setStep(2);
  };

  const processModification = async () => {
    if (!editingRental) return;
    const daysInt = parseInt(newDays);
    const newTotal = calculateNewTotal();
    const difference = calculateDifference();

    setUpdating(true);
    try {
      await axios.patch(
        `${API}/rentals/${editingRental.id}/modify-duration`,
        {
          new_days: daysInt,
          new_total: newTotal,
          payment_method: paymentMethod,
          difference_amount: difference
        },
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      setModificationResult({
        rental: editingRental,
        oldDays: editingRental.days,
        newDays: daysInt,
        oldTotal: editingRental.total_amount,
        newTotal: newTotal,
        difference: difference,
        paymentMethod: paymentMethod,
        timestamp: new Date().toISOString()
      });
      
      toast.success("Modificación registrada correctamente");
      setStep(3);
      loadActiveRentals();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al procesar la modificación");
    } finally {
      setUpdating(false);
    }
  };

  const printModificationTicket = () => {
    if (!modificationResult) return;
    const r = modificationResult;
    const paymentLabel = PAYMENT_METHODS.find(p => p.value === r.paymentMethod)?.label || r.paymentMethod;
    const isRefund = r.difference < 0;
    const startDate = new Date(r.rental.start_date).toLocaleDateString('es-ES');
    const oldEndDate = new Date(r.rental.end_date).toLocaleDateString('es-ES');
    const newEndDate = calculateNewEndDate();
    
    const ticketWindow = window.open('', '_blank', 'width=400,height=700');
    ticketWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante Modificación</title>
        <style>
          @media print { @page { margin: 0; size: 80mm auto; } body { margin: 0; } }
          body { font-family: 'Courier New', monospace; width: 80mm; padding: 5mm; margin: 0 auto; font-size: 11px; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 16px; }
          .type-badge { display: inline-block; padding: 6px 16px; border-radius: 4px; font-weight: bold; font-size: 12px; margin: 10px 0; }
          .cobro { background: #dcfce7; color: #166534; }
          .devolucion { background: #ffedd5; color: #9a3412; }
          .section { border-bottom: 1px dashed #ccc; padding: 8px 0; margin-bottom: 8px; }
          .section-title { font-weight: bold; text-transform: uppercase; font-size: 10px; color: #666; margin-bottom: 5px; }
          .row { display: flex; justify-content: space-between; padding: 2px 0; }
          .row .label { color: #666; }
          .row .value { font-weight: bold; }
          .old-value { text-decoration: line-through; color: #999; }
          .new-value { color: #166534; font-weight: bold; }
          .total { border-top: 2px dashed #000; margin-top: 10px; padding-top: 10px; text-align: center; }
          .total-amount { font-size: 24px; font-weight: bold; }
          .total-amount.cobro { color: #166534; }
          .total-amount.devolucion { color: #9a3412; }
          .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #000; font-size: 9px; color: #666; }
          .print-btn { display: block; width: 100%; padding: 12px; margin-top: 20px; background: #2563eb; color: white; border: none; cursor: pointer; font-size: 14px; border-radius: 4px; }
          @media print { .print-btn { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>COMPROBANTE DE MODIFICACIÓN</h1>
        </div>
        <div style="text-align: center;">
          <span class="type-badge ${isRefund ? 'devolucion' : 'cobro'}">${isRefund ? 'DEVOLUCIÓN' : 'COBRO ADICIONAL'}</span>
        </div>
        <div class="section">
          <div class="section-title">Datos del Cliente</div>
          <div class="row"><span class="label">Cliente:</span><span class="value">${r.rental.customer_name}</span></div>
          <div class="row"><span class="label">DNI:</span><span class="value">${r.rental.customer_dni || '-'}</span></div>
          <div class="row"><span class="label">Alquiler:</span><span class="value">#${r.rental.id.substring(0, 8).toUpperCase()}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Modificación de Fechas</div>
          <div class="row"><span class="label">Fecha inicio:</span><span class="value">${startDate}</span></div>
          <div class="row"><span class="label">Fecha fin anterior:</span><span class="old-value">${oldEndDate}</span></div>
          <div class="row"><span class="label">Nueva fecha fin:</span><span class="new-value">${newEndDate}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Detalle Económico</div>
          <div class="row"><span class="label">Días anteriores:</span><span class="old-value">${r.oldDays} días</span></div>
          <div class="row"><span class="label">Nuevos días:</span><span class="new-value">${r.newDays} días</span></div>
          <div class="row"><span class="label">Importe anterior:</span><span class="old-value">€${r.oldTotal.toFixed(2)}</span></div>
          <div class="row"><span class="label">Nuevo importe:</span><span class="new-value">€${r.newTotal.toFixed(2)}</span></div>
          <div class="row"><span class="label">Método de pago:</span><span class="value">${paymentLabel}</span></div>
        </div>
        <div class="total">
          <p style="margin: 0; font-size: 10px; color: #666;">${isRefund ? 'IMPORTE DEVUELTO' : 'IMPORTE COBRADO'}</p>
          <p class="total-amount ${isRefund ? 'devolucion' : 'cobro'}">${isRefund ? '-' : '+'}€${Math.abs(r.difference).toFixed(2)}</p>
        </div>
        <div class="footer">
          <p>Fecha: ${new Date(r.timestamp).toLocaleString('es-ES')}</p>
          <p style="margin-top: 8px;">Gracias por su confianza</p>
        </div>
        <button class="print-btn" onclick="window.print(); setTimeout(() => window.close(), 500);">IMPRIMIR COMPROBANTE</button>
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
        total_amount: rental.total_amount
      };
      
      if (rental.customer_id) {
        try {
          const response = await axios.get(`${API}/customers/${rental.customer_id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          customerData = { ...customerData, ...response.data, items: rental.items || [], rental_id: rental.id };
        } catch (e) {}
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

  const diffInfo = editingRental ? getDifferenceLabel() : null;

  return (
    <div className="p-6 lg:p-8" data-testid="active-rentals-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Alquileres Activos
        </h1>
        <Badge variant="outline" className="w-fit">
          {rentals.length} alquileres activos
        </Badge>
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
          ) : rentals.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay alquileres activos</p>
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
                  {rentals.map((rental) => {
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(rental)}
                              className="h-8 w-8"
                              data-testid={`edit-rental-${rental.id}`}
                              title="Modificar duración"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
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

      {/* ============ NEW CENTRALIZED SWAP MODAL ============ */}
      <Dialog open={!!swapRental} onOpenChange={closeSwapModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ArrowLeftRight className="h-6 w-6 text-blue-600" />
              Gestión de Cambios
            </DialogTitle>
            {swapRental && (
              <DialogDescription className="text-base">
                Cliente: <strong>{swapRental.customer_name}</strong> | 
                DNI: <strong>{swapRental.customer_dni}</strong> | 
                Días restantes: <Badge className="ml-1 bg-blue-100 text-blue-700">{swapDaysRemaining}</Badge>
              </DialogDescription>
            )}
          </DialogHeader>

          {!swapComplete ? (
            <div className="space-y-5 py-4">
              {/* SCANNER INPUT - Auto-focused */}
              <div className="relative">
                <Label className="text-base font-semibold flex items-center gap-2 mb-2">
                  <Scan className="h-5 w-5 text-blue-600" />
                  Escanear Nuevo Artículo
                </Label>
                <p className="text-sm text-slate-500 mb-3">
                  Escanea con el lector láser o escribe el código del material nuevo
                </p>
                <div className="flex gap-2">
                  <Input
                    ref={swapInputRef}
                    value={swapBarcode}
                    onChange={handleSwapBarcodeChange}
                    onKeyDown={handleSwapBarcodeKeyDown}
                    placeholder="SKI-001, BOT-002..."
                    className="h-14 text-xl font-mono flex-1"
                    autoFocus
                    data-testid="swap-barcode-input"
                  />
                  <Button 
                    onClick={() => searchSwapItem(swapBarcode)}
                    disabled={swapLoading || !swapBarcode.trim()}
                    className="h-14 px-6"
                  >
                    {swapLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Scan className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

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
      {editingRental && (
        <Dialog open={!!editingRental} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {step === 1 && <><Edit2 className="h-5 w-5" /> Modificar Duración</>}
                {step === 2 && <><DollarSign className="h-5 w-5" /> Confirmar Pago</>}
                {step === 3 && <><Printer className="h-5 w-5" /> Imprimir Comprobante</>}
              </DialogTitle>
              <DialogDescription>
                Cliente: {editingRental.customer_name} | Alquiler #{editingRental.id.substring(0, 8).toUpperCase()}
              </DialogDescription>
            </DialogHeader>

            {/* Step indicators */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step >= s ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                  </div>
                  {s < 3 && <div className={`w-12 h-1 ${step > s ? 'bg-primary' : 'bg-slate-200'}`} />}
                </div>
              ))}
            </div>

            {/* STEP 1: Select new days */}
            {step === 1 && (
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Días actuales</p>
                      <p className="font-bold text-2xl text-slate-900">{editingRental.days}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Total actual</p>
                      <p className="font-bold text-2xl text-slate-900">€{editingRental.total_amount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
                    Período: {formatDate(editingRental.start_date)} → {formatDate(editingRental.end_date)}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold">Nuevo número de días</Label>
                  <p className="text-xs text-slate-500 mb-2">Introduce 0 para devolución el mismo día</p>
                  <Input
                    type="number"
                    min="0"
                    value={newDays}
                    onChange={(e) => setNewDays(e.target.value)}
                    className="h-16 text-3xl font-bold text-center"
                    autoFocus
                    data-testid="new-days-input"
                  />
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {[0, 1, 2, 3, 5, 7].map((d) => (
                    <Button
                      key={d}
                      variant={newDays === d.toString() ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewDays(d.toString())}
                      className="w-12"
                    >
                      {d}d
                    </Button>
                  ))}
                </div>

                {newDays !== "" && parseInt(newDays) !== editingRental.days && (
                  <div className={`p-4 rounded-lg ${diffInfo?.bgColor} border ${diffInfo?.borderColor} space-y-3`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {calculateDifference() > 0 ? (
                          <ArrowUpRight className={`h-5 w-5 ${diffInfo?.color}`} />
                        ) : (
                          <ArrowDownLeft className={`h-5 w-5 ${diffInfo?.color}`} />
                        )}
                        <span className={`font-bold ${diffInfo?.color}`}>{diffInfo?.text}</span>
                      </div>
                      <span className={`text-2xl font-bold ${diffInfo?.color}`}>
                        {calculateDifference() > 0 ? '+' : ''}€{calculateDifference().toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-current/20">
                      <div>
                        <p className="text-slate-600">Nuevos días</p>
                        <p className="font-bold text-lg">{newDays}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Nuevo total</p>
                        <p className="font-bold text-lg">€{calculateNewTotal().toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-600">Nueva fecha fin: {calculateNewEndDate()}</p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Confirm payment */}
            {step === 2 && (
              <div className="space-y-4 py-4">
                <div className={`p-6 rounded-xl ${diffInfo?.bgColor} border-2 ${diffInfo?.borderColor}`}>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-600 mb-1">
                      {calculateDifference() > 0 ? 'IMPORTE A COBRAR' : 'IMPORTE A DEVOLVER'}
                    </p>
                    <p className={`text-4xl font-bold ${diffInfo?.color}`}>
                      {calculateDifference() > 0 ? '+' : '-'}€{Math.abs(calculateDifference()).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    {calculateDifference() > 0 ? '¿Cómo paga el cliente?' : '¿Cómo se devuelve?'}
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      return (
                        <Button
                          key={method.value}
                          variant={paymentMethod === method.value ? "default" : "outline"}
                          className={`h-20 flex-col gap-2`}
                          onClick={() => setPaymentMethod(method.value)}
                        >
                          <Icon className="h-6 w-6" />
                          <span className="font-semibold">{method.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Print ticket */}
            {step === 3 && modificationResult && (
              <div className="space-y-4 py-4">
                <div className="text-center p-6 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                  <CheckCircle className="h-16 w-16 text-emerald-600 mx-auto mb-3" />
                  <p className="text-lg font-bold text-emerald-800">Modificación Completada</p>
                </div>
              </div>
            )}

            <DialogFooter>
              {step === 1 && (
                <>
                  <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
                  <Button onClick={proceedToPayment} disabled={newDays === "" || parseInt(newDays) === editingRental.days}>
                    Continuar <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              )}
              {step === 2 && (
                <>
                  <Button variant="outline" onClick={() => setStep(1)}>Volver</Button>
                  <Button onClick={processModification} disabled={updating}>
                    {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {calculateDifference() > 0 ? 'Cobrar' : 'Devolver'} €{Math.abs(calculateDifference()).toFixed(2)}
                  </Button>
                </>
              )}
              {step === 3 && (
                <>
                  <Button variant="outline" onClick={closeDialog}>Cerrar</Button>
                  <Button onClick={printModificationTicket}>
                    <Printer className="h-4 w-4 mr-2" /> Imprimir
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerModal(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
