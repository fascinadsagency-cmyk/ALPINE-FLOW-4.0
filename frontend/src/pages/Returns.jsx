import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { rentalApi } from "@/lib/api";
import { printTicket } from "@/lib/ticketGenerator";
import axios from "axios";
import { 
  RotateCcw, 
  Check, 
  X, 
  AlertTriangle, 
  Loader2,
  Barcode,
  User,
  Calendar,
  DollarSign,
  Phone,
  RefreshCcw,
  Banknote,
  Zap,
  Mail,
  MapPin,
  IdCard,
  MessageCircle,
  ExternalLink,
  Package,
  Filter,
  ArrowLeftRight,
  ArrowRight,
  Scan,
  CreditCard,
  CheckCircle,
  Printer,
  CalendarPlus,
  Lock,
  AlertCircle,
  Clock,
  CheckCheck,
  ArrowDownToLine,
  Wrench,
  Search,
  Users,
  PackageCheck
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
];

export default function Returns() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [rental, setRental] = useState(null);
  const [scannedBarcodes, setScannedBarcodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [pendingReturns, setPendingReturns] = useState({ today: [], other_days: [] });
  const [typeFilter, setTypeFilter] = useState(searchParams.get('filter') || "");
  const [itemTypes, setItemTypes] = useState([]);
  
  // Refund dialog state
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundDays, setRefundDays] = useState(1);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundMethod, setRefundMethod] = useState("cash");
  const [refundReason, setRefundReason] = useState("");
  const [processingRefund, setProcessingRefund] = useState(false);
  
  // Customer modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  
  // ============ GESTIONAR CAMBIO MODAL STATE ============
  const [changeModal, setChangeModal] = useState(false);
  const [changeRental, setChangeRental] = useState(null);
  const [changeItems, setChangeItems] = useState([]); // Array of items with swap info
  const [activeSwapIndex, setActiveSwapIndex] = useState(null);
  const [changeNewBarcode, setChangeNewBarcode] = useState("");
  
  // Financial tracking
  const [timeDelta, setTimeDelta] = useState(0); // + extension, - reduction
  const [materialDelta, setMaterialDelta] = useState(0); // + upgrade, - downgrade
  const [totalDelta, setTotalDelta] = useState(0); // Net total
  
  // Day adjustment
  const [originalDays, setOriginalDays] = useState(0);
  const [newDays, setNewDays] = useState(0);
  const [adjustDays, setAdjustDays] = useState(false);
  
  // Additional change modal state
  const [changeAdjustDate, setChangeAdjustDate] = useState(false);
  const [changeNewEndDate, setChangeNewEndDate] = useState("");
  const [changeDaysRemaining, setChangeDaysRemaining] = useState(0);
  const [changeOriginalDays, setChangeOriginalDays] = useState(0);
  const [changeNewTotalDays, setChangeNewTotalDays] = useState(0);
  const [changeDateDelta, setChangeDateDelta] = useState(0);
  const [changeTotalDelta, setChangeTotalDelta] = useState(0);
  
  const [changePaymentMethod, setChangePaymentMethod] = useState("cash");
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeComplete, setChangeComplete] = useState(false);
  const changeInputRef = useRef(null);
  
  const barcodeRef = useRef(null);

  // ============ GESTIONAR CAMBIO FUNCTIONS ============
  
  const openChangeModal = async (rental) => {
    const rentalDays = rental.days || 1;
    
    // Get all pending items from the rental
    const pendingItems = (rental.pending_items || rental.items || [])
      .filter(i => !i.returned)
      .map((item, idx) => ({
        ...item,
        originalIndex: idx,
        swapNewItem: null,
        swapDelta: 0,
        isSwapping: false,
        swapType: null // 'upgrade', 'downgrade', 'technical'
      }));
    
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
    setTimeDelta(0);
    setMaterialDelta(0);
    setTotalDelta(0);
    
    // Day settings - Real calculation
    setOriginalDays(rentalDays);
    setNewDays(rentalDays);
    setAdjustDays(false);
    
    // Set days remaining correctly
    setChangeDaysRemaining(daysRemaining);
    setChangeOriginalDays(rentalDays);
    setChangeNewTotalDays(rentalDays);
    setChangeNewEndDate(rental.end_date ? rental.end_date.split('T')[0] : "");
    setChangeAdjustDate(false);
    setChangeDateDelta(0);
    setChangeTotalDelta(0);
    
    setChangeComplete(false);
    // SECURITY: Pre-select original payment method for refunds
    setChangePaymentMethod(rental.payment_method || "cash");
    setChangeModal(true);
  };

  const closeChangeModal = () => {
    setChangeModal(false);
    setChangeRental(null);
    setChangeItems([]);
    setActiveSwapIndex(null);
    setTimeDelta(0);
    setMaterialDelta(0);
    setTotalDelta(0);
    setChangeComplete(false);
    // Auto-focus barcode input after closing modal
    refocusBarcodeInput();
  };

  // Calculate time delta when days change
  const handleDaysChange = (days) => {
    const newDaysNum = parseInt(days) || originalDays;
    setNewDays(newDaysNum);
    
    if (!changeRental) return;
    
    const dayDiff = newDaysNum - originalDays;
    const pricePerDay = changeRental.pricePerDay || 0;
    const newTimeDelta = dayDiff * pricePerDay;
    
    setTimeDelta(newTimeDelta);
    recalculateTotal(newTimeDelta, materialDelta);
  };

  // Handle date adjustment - calculates new total days and delta
  const handleDateAdjustment = (newEndDateStr) => {
    if (!changeRental || !newEndDateStr) return;
    
    setChangeNewEndDate(newEndDateStr);
    
    // Calculate new total days from original start date to new end date
    const startDate = new Date(changeRental.start_date);
    startDate.setHours(0, 0, 0, 0);
    const newEndDate = new Date(newEndDateStr);
    newEndDate.setHours(0, 0, 0, 0);
    const msPerDay = 24 * 60 * 60 * 1000;
    
    const newTotalDays = Math.ceil((newEndDate - startDate) / msPerDay) + 1; // +1 includes both start and end day
    const daysDiff = newTotalDays - changeOriginalDays;
    const pricePerDay = changeRental.pricePerDay || 0;
    const dateDelta = daysDiff * pricePerDay;
    
    setChangeNewTotalDays(newTotalDays);
    setChangeDateDelta(dateDelta);
    
    // Update days remaining
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newDaysRemaining = Math.ceil((newEndDate - today) / msPerDay);
    setChangeDaysRemaining(newDaysRemaining);
    
    // Recalculate total with material delta
    recalculateChangeTotalDelta(dateDelta, materialDelta);
  };

  // Recalculate total from date + material changes
  const recalculateChangeTotalDelta = (dateDelta, materialDelta) => {
    setChangeTotalDelta(dateDelta + materialDelta);
  };

  // Recalculate total from time + material
  const recalculateTotal = (time, material) => {
    setTotalDelta(time + material);
  };

  // Recalculate material delta from all items
  const recalculateMaterialDelta = (items) => {
    const total = items.reduce((sum, item) => {
      if (item.isSwapping && item.swapDelta) {
        return sum + item.swapDelta;
      }
      return sum;
    }, 0);
    setMaterialDelta(total);
    recalculateTotal(timeDelta, total);
    // Also update the change total delta with date delta
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
    recalculateMaterialDelta(updated);
  };

  // Search and assign new item for swap
  const searchSwapItem = async (code) => {
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
      const delta = await calculateItemSwapDelta(oldItem, foundItem);
      
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
      recalculateMaterialDelta(updated);

    } catch (error) {
      toast.error("Error al buscar artículo");
    } finally {
      setChangeLoading(false);
    }
  };

  // Calculate delta for single item swap using tariffs
  const calculateItemSwapDelta = async (oldItem, newItem) => {
    try {
      const tariffsRes = await axios.get(`${API}/tariffs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const tariffs = tariffsRes.data;
      
      // Calculate for remaining days
      const daysToCharge = Math.max(1, newDays - (originalDays - (changeRental?.days || originalDays)));
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

  // Execute all changes
  const executeAllChanges = async () => {
    if (!changeRental) {
      toast.error("Error: No hay contrato seleccionado");
      return;
    }

    const itemsToSwap = changeItems.filter(i => i.isSwapping && i.swapNewItem);
    const hasDateChange = changeAdjustDate && changeDateDelta !== 0;

    if (itemsToSwap.length === 0 && !hasDateChange) {
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

      // Process date change if needed
      if (hasDateChange) {
        await axios.patch(`${API}/rentals/${changeRental.id}/modify-duration`, {
          new_days: changeNewTotalDays,
          new_end_date: changeNewEndDate,
          new_total: changeRental.total_amount + changeDateDelta,
          payment_method: changePaymentMethod,
          difference_amount: changeDateDelta
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      }

      setChangeComplete(true);
      toast.success(`✅ Regularización completada`);
      loadPendingReturns();

    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al procesar los cambios");
    } finally {
      setChangeLoading(false);
    }
  };

  // ============ IMPRIMIR TICKET DE REGULARIZACIÓN (USA GENERADOR MAESTRO) ============
  const printRegularizationTicket = () => {
    if (!changeRental) return;
    
    const itemsSwapped = changeItems.filter(i => i.isSwapping && i.swapNewItem);
    const hasDateChange = changeAdjustDate && changeDateDelta !== 0;
    
    // Preparar datos para el generador maestro
    const ticketData = {
      operationNumber: changeRental.operation_number || null,
      date: new Date().toISOString(),
      customer: changeRental.customer_name,
      dni: changeRental.customer_dni,
      contractId: changeRental.id,
      // Items cambiados
      oldItems: itemsSwapped.map(item => ({
        name: `${item.internal_code || item.barcode} - ${item.item_type}`,
        item_type: item.item_type
      })),
      newItems: itemsSwapped.map(item => ({
        name: `${item.swapNewItem.internal_code || item.swapNewItem.barcode} - ${item.swapNewItem.item_type}`,
        item_type: item.swapNewItem.item_type
      })),
      // Ajuste de fechas
      dateAdjustment: hasDateChange,
      originalDays: changeOriginalDays,
      newDays: changeNewTotalDays,
      daysDelta: changeDateDelta,
      // Totales
      materialDelta: materialDelta,
      difference: changeTotalDelta,
      paymentMethod: changePaymentMethod
    };
    
    // Usar generador maestro
    const success = printTicket({
      ticketType: 'swap',
      data: ticketData
    });
    
    if (!success) {
      toast.error("No se pudo abrir ventana de impresión. Permite los popups.");
    }
  };

  // Print ticket for all changes - Uses centralized template
  const printMultiChangeTicket = () => {
    printRegularizationTicket();
  };

  const quickReturn = async (rentalId, customerName) => {
    // Acción RÁPIDA - Ejecutar inmediatamente sin confirmación
    setLoading(true);
    try {
      await axios.post(`${API}/rentals/${rentalId}/quick-return`, {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      toast.success(`✅ Devolución procesada con éxito - ${customerName}`);
      loadPendingReturns();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error en devolución rápida");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (barcodeRef.current) {
      barcodeRef.current.focus();
    }
    loadPendingReturns();
    loadItemTypes();
    
    // Check URL filter
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      setTypeFilter(filterParam);
    }
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadPendingReturns();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadItemTypes = async () => {
    try {
      const response = await axios.get(`${API}/item-types`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setItemTypes(response.data || []);
    } catch (error) {
      console.error("Error loading item types:", error);
    }
  };

  const loadPendingReturns = async () => {
    try {
      const response = await axios.get(`${API}/rentals/pending/returns`);
      setPendingReturns(response.data);
    } catch (error) {
      console.error("Error loading pending returns:", error);
    }
  };

  const clearFilter = () => {
    setTypeFilter("");
    setSearchParams({});
  };

  const getTypeLabel = (typeValue) => {
    const found = itemTypes.find(t => t.value === typeValue);
    return found ? found.label : typeValue;
  };

  // Filter rentals by item type
  const filterRentalsByType = (rentals) => {
    if (!typeFilter) return rentals;
    
    return rentals.filter(rental => 
      rental.items?.some(item => item.item_type === typeFilter)
    );
  };

  const filteredToday = filterRentalsByType(pendingReturns.today || []);
  const filteredOtherDays = filterRentalsByType(pendingReturns.other_days || []);

  const handleBarcodeScan = async (e) => {
    if (e.key !== 'Enter' || !barcodeInput.trim()) return;
    
    const barcode = barcodeInput.trim();
    setBarcodeInput("");
    
    // If no rental loaded, find rental by barcode
    if (!rental) {
      setLoading(true);
      try {
        const response = await rentalApi.getByBarcode(barcode);
        setRental(response.data);
        setScannedBarcodes([barcode]);
        toast.success(`Alquiler encontrado: ${response.data.customer_name}`);
      } catch (error) {
        toast.error("No se encontró alquiler activo para este artículo");
      } finally {
        setLoading(false);
        refocusBarcodeInput(); // Re-focus for next scan
      }
      return;
    }
    
    // Rental loaded, add barcode to scanned list
    const item = rental.items.find(i => i.barcode === barcode);
    if (!item) {
      toast.error("Este artículo no pertenece a este alquiler");
      refocusBarcodeInput();
      return;
    }
    
    if (item.returned) {
      toast.info("Este artículo ya fue devuelto");
      refocusBarcodeInput();
      return;
    }
    
    if (scannedBarcodes.includes(barcode)) {
      toast.info("Artículo ya escaneado");
      refocusBarcodeInput();
      return;
    }
    
    setScannedBarcodes([...scannedBarcodes, barcode]);
    toast.success(`${item.brand} ${item.model} escaneado`);
    refocusBarcodeInput(); // Re-focus for next scan
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

  const processReturn = async () => {
    if (!rental || scannedBarcodes.length === 0) return;
    
    setProcessing(true);
    try {
      const response = await rentalApi.processReturn(rental.id, scannedBarcodes);
      
      if (response.data.status === 'returned') {
        toast.success("Devolución completada");
        resetForm();
        loadPendingReturns();
      } else {
        toast.warning(`Devolución parcial: ${response.data.pending_items.length} artículos pendientes`);
        const updatedRental = await rentalApi.getById(rental.id);
        setRental(updatedRental.data);
        setScannedBarcodes([]);
        loadPendingReturns();
      }
    } catch (error) {
      toast.error("Error al procesar devolución");
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setRental(null);
    setScannedBarcodes([]);
    setBarcodeInput("");
    refocusBarcodeInput(); // Use helper with select
  };

  const loadRentalById = async (rentalId) => {
    try {
      const response = await rentalApi.getById(rentalId);
      setRental(response.data);
      toast.success("Alquiler cargado");
    } catch (error) {
      toast.error("Error al cargar alquiler");
    }
  };

  const contactCustomer = (phone) => {
    if (!phone) {
      toast.error("No hay teléfono registrado para este cliente");
      return;
    }
    // Clean phone number and open WhatsApp
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  // Open customer info modal
  const openCustomerModal = async (rentalData) => {
    setCustomerLoading(true);
    setShowCustomerModal(true);
    
    try {
      // Get full customer data if we have customer_id
      let customerData = {
        name: rentalData.customer_name,
        dni: rentalData.customer_dni,
        phone: rentalData.customer_phone,
        email: rentalData.customer_email,
        hotel: rentalData.customer_hotel || rentalData.hotel,
        notes: rentalData.customer_notes,
        pending_items: rentalData.pending_items || [],
        rental_id: rentalData.id,
        end_date: rentalData.end_date,
        days_overdue: rentalData.days_overdue || 0
      };
      
      // Try to get more customer details from API
      if (rentalData.customer_id) {
        try {
          const response = await axios.get(`${API}/customers/${rentalData.customer_id}`);
          customerData = {
            ...customerData,
            ...response.data,
            pending_items: rentalData.pending_items || [],
            rental_id: rentalData.id,
            end_date: rentalData.end_date,
            days_overdue: rentalData.days_overdue || 0
          };
        } catch (e) {
          // Continue with rental data if customer fetch fails
        }
      }
      
      setSelectedCustomer(customerData);
    } catch (error) {
      toast.error("Error al cargar datos del cliente");
    } finally {
      setCustomerLoading(false);
    }
  };

  // Send WhatsApp with predefined message
  const sendWhatsAppMessage = (phone, customerName) => {
    if (!phone) {
      toast.error("No hay teléfono registrado para este cliente");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hola ${customerName}, te contactamos de la tienda de esquí por la devolución del material. ¿Cuándo podrías pasarte a devolverlo? Gracias.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  // Call phone directly
  const callPhone = (phone) => {
    if (!phone) {
      toast.error("No hay teléfono registrado");
      return;
    }
    window.open(`tel:${phone}`, '_self');
  };

  // Send email
  const sendEmail = (email, customerName) => {
    if (!email) {
      toast.error("No hay email registrado");
      return;
    }
    const subject = encodeURIComponent("Recordatorio de devolución de material - Tienda de Esquí");
    const body = encodeURIComponent(
      `Hola ${customerName},\n\nTe contactamos desde la tienda de esquí para recordarte la devolución del material alquilado.\n\nPor favor, contacta con nosotros para coordinar la devolución.\n\nGracias.`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  // Calculate refund amount based on days
  const calculateRefundAmount = (days) => {
    if (!rental || days <= 0) return 0;
    
    // Simple calculation: proportional to the total
    const pricePerDay = rental.total_amount / rental.days;
    return pricePerDay * days;
  };

  // Open refund dialog
  const openRefundDialog = () => {
    if (!rental) return;
    
    // Calculate remaining days that could be refunded
    const today = new Date();
    const endDate = new Date(rental.end_date);
    const startDate = new Date(rental.start_date);
    
    // Calculate days used
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysElapsed = Math.max(1, Math.ceil((today - startDate) / msPerDay));
    const maxRefundDays = Math.max(0, rental.days - daysElapsed);
    
    if (maxRefundDays === 0) {
      toast.error("No hay días disponibles para reembolsar");
      return;
    }
    
    setRefundDays(1);
    setRefundAmount(calculateRefundAmount(1));
    setRefundReason("");
    // SECURITY: Pre-select original payment method (forced, not editable)
    setRefundMethod(rental.payment_method || "cash");
    setShowRefundDialog(true);
  };

  // Handle refund days change
  const handleRefundDaysChange = (days) => {
    const numDays = parseInt(days) || 1;
    setRefundDays(numDays);
    setRefundAmount(calculateRefundAmount(numDays));
  };

  // Process the refund
  const processRefund = async () => {
    if (!rental || refundDays <= 0 || refundAmount <= 0) {
      toast.error("Verifica los datos del reembolso");
      return;
    }
    
    setProcessingRefund(true);
    try {
      const response = await axios.post(`${API}/rentals/${rental.id}/refund`, {
        days_to_refund: refundDays,
        refund_amount: refundAmount,
        payment_method: refundMethod,
        reason: refundReason
      });
      
      toast.success(`Reembolso de €${refundAmount.toFixed(2)} procesado correctamente`);
      setShowRefundDialog(false);
      
      // Reload the rental data
      const updatedRental = await rentalApi.getById(rental.id);
      setRental(updatedRental.data);
      loadPendingReturns();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al procesar reembolso");
    } finally {
      setProcessingRefund(false);
    }
  };

  // Calculate max refundable days
  const getMaxRefundDays = () => {
    if (!rental) return 0;
    const today = new Date();
    const startDate = new Date(rental.start_date);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysElapsed = Math.max(1, Math.ceil((today - startDate) / msPerDay));
    return Math.max(0, rental.days - daysElapsed);
  };

  const pendingItems = rental?.items.filter(i => !i.returned && !scannedBarcodes.includes(i.barcode)) || [];
  const returnedItems = rental?.items.filter(i => i.returned) || [];
  const toReturnItems = rental?.items.filter(i => !i.returned && scannedBarcodes.includes(i.barcode)) || [];
  const maxRefundDays = getMaxRefundDays();

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  };

  // Marcar TODOS los items pendientes como listos para devolver
  const markAllForReturn = () => {
    if (!rental) return;
    const allPendingBarcodes = rental.items
      .filter(i => !i.returned)
      .map(i => i.barcode);
    setScannedBarcodes(allPendingBarcodes);
    toast.success(`${allPendingBarcodes.length} artículos marcados para devolver`);
  };

  // Calcular si todos están listos
  const allItemsReady = rental && toReturnItems.length > 0 && pendingItems.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" data-testid="returns-page">
      
      {/* ============================================== */}
      {/* ZONA SUPERIOR: MOSTRADOR DE RECEPCIÓN         */}
      {/* ============================================== */}
      <div className="bg-white border-b-2 border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          
          {/* TÍTULO Y CAMPO DE BÚSQUEDA CENTRAL */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-slate-900 mb-2 flex items-center justify-center gap-3" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              <ArrowDownToLine className="h-8 w-8 text-emerald-600" />
              Mostrador de Recepción
            </h1>
            <p className="text-slate-500">Escanea cualquier código de barras para cargar el contrato</p>
          </div>
          
          {/* CAMPO DE ESCANEO GRANDE Y CENTRADO */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="relative">
              <Scan className="absolute left-5 top-1/2 -translate-y-1/2 h-7 w-7 text-emerald-500" />
              <Input
                ref={barcodeRef}
                placeholder="🔫 Escanear código de barras..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeScan}
                className="h-16 pl-14 pr-6 text-xl font-mono text-center bg-emerald-50 border-2 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-200 rounded-2xl shadow-inner"
                data-testid="return-barcode-input"
                autoFocus
              />
              {loading && (
                <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 h-6 w-6 animate-spin text-emerald-600" />
              )}
            </div>
            <p className="text-center text-sm text-slate-400 mt-2">
              Escanea o escribe el código y presiona Enter
            </p>
          </div>

          {/* ======= ÁREA DE CONTRATO ACTIVO ======= */}
          {rental && (
            <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-200 shadow-inner">
              <div className="grid grid-cols-12 gap-6">
                
                {/* COLUMNA IZQUIERDA: FICHA DEL CLIENTE */}
                <div className="col-span-4">
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm h-full">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16 border-2 border-emerald-200">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">
                          {rental.customer_name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900">{rental.customer_name}</h3>
                        <p className="text-sm text-slate-500 font-mono">{rental.customer_dni}</p>
                        <Badge variant="outline" className="mt-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                          Contrato #{rental.id?.substring(0, 8)}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Info Rápida del Contrato */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="p-3 rounded-lg bg-slate-50 text-center">
                        <Calendar className="h-4 w-4 mx-auto text-slate-400 mb-1" />
                        <p className="text-xs text-slate-500">Período</p>
                        <p className="font-bold text-slate-800">{rental.days} días</p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 text-center">
                        <DollarSign className="h-4 w-4 mx-auto text-slate-400 mb-1" />
                        <p className="text-xs text-slate-500">Total</p>
                        <p className="font-bold text-slate-800">€{rental.total_amount?.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    {/* Alerta de pago pendiente */}
                    {rental.pending_amount > 0 && (
                      <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <span className="text-sm font-medium text-red-700">
                          Pendiente: €{rental.pending_amount?.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* COLUMNA DERECHA: LISTADO DE ARTÍCULOS */}
                <div className="col-span-8">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    
                    {/* Header con contador */}
                    <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        <span className="font-bold">Artículos del Contrato</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-emerald-500">
                          {toReturnItems.length} listos
                        </Badge>
                        <Badge className="bg-slate-600">
                          {pendingItems.length} pendientes
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Grid de Artículos */}
                    <div className="p-4 grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto">
                      {rental.items.filter(i => !i.returned).map((item, idx) => {
                        const isScanned = scannedBarcodes.includes(item.barcode);
                        return (
                          <div 
                            key={idx}
                            onClick={() => {
                              if (!isScanned) {
                                setScannedBarcodes(prev => [...prev, item.barcode]);
                                toast.success(`${item.item_type} marcado ✓`);
                              }
                            }}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                              isScanned 
                                ? 'bg-emerald-50 border-emerald-400 shadow-md ring-2 ring-emerald-200' 
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className={`font-bold ${isScanned ? 'text-emerald-800' : 'text-slate-700'}`}>
                                  {item.item_type || 'Artículo'}
                                </p>
                                <p className="text-xs font-mono text-slate-500 mt-1">
                                  {item.internal_code || item.barcode}
                                </p>
                                {item.brand && (
                                  <p className="text-xs text-slate-400 mt-1">{item.brand} {item.model}</p>
                                )}
                              </div>
                              <div className={`p-2 rounded-full ${
                                isScanned 
                                  ? 'bg-emerald-500 text-white' 
                                  : 'bg-slate-200 text-slate-400'
                              }`}>
                                {isScanned ? <Check className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                              </div>
                            </div>
                            {isScanned && (
                              <div className="mt-2 flex items-center gap-1 text-emerald-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-xs font-semibold">LISTO PARA DEVOLVER</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* ======= BOTONERA DE ACCIÓN RÁPIDA ======= */}
              <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-slate-300">
                {/* Devolución Masiva */}
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={markAllForReturn}
                  className="h-14 px-6 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold"
                  disabled={pendingItems.length === 0}
                >
                  <CheckCheck className="h-5 w-5 mr-2" />
                  Marcar TODO ({rental.items.filter(i => !i.returned).length})
                </Button>
                
                {/* Cambio/Sustitución */}
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => openChangeModal(rental)}
                  className="h-14 px-6 border-2 border-orange-300 text-orange-700 hover:bg-orange-50 font-semibold"
                >
                  <ArrowLeftRight className="h-5 w-5 mr-2" />
                  Cambio/Sustitución
                </Button>
                
                {/* Procesar Devolución */}
                <Button 
                  size="lg"
                  onClick={processQuickReturn}
                  disabled={toReturnItems.length === 0 || processing}
                  className={`h-14 px-8 font-bold text-lg ${
                    allItemsReady 
                      ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse' 
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {processing ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <PackageCheck className="h-5 w-5 mr-2" />
                  )}
                  PROCESAR DEVOLUCIÓN ({toReturnItems.length})
                </Button>
                
                {/* Cancelar */}
                <Button 
                  variant="ghost" 
                  size="lg"
                  onClick={resetForm}
                  className="h-14 px-6 text-slate-500 hover:text-slate-700"
                >
                  <X className="h-5 w-5 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================== */}
      {/* ZONA INFERIOR: COLAS DE TRABAJO               */}
      {/* ============================================== */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* TABLA 1: PENDIENTES DE HOY (Prioridad Alta) */}
          <Card className="border-2 border-red-200 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  PENDIENTES DE HOY
                </CardTitle>
                <Badge className="bg-white text-red-600 font-bold text-lg px-3">
                  {pendingReturns.today?.length || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pendingReturns.today?.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {pendingReturns.today.map((r, idx) => (
                    <div 
                      key={r.id || idx}
                      onClick={() => quickReturn(r.id, r.customer_name)}
                      className="p-4 hover:bg-red-50 cursor-pointer transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-red-200">
                          <AvatarFallback className="bg-red-100 text-red-700 font-bold">
                            {r.customer_name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-slate-900">{r.customer_name}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Package className="h-3 w-3" />
                            <span>{r.pending_items?.length || r.items?.filter(i => !i.returned).length || '?'} artículos</span>
                            <span className="text-slate-300">•</span>
                            <span>€{r.total_amount?.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          HOY
                        </Badge>
                        <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-red-500 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-300" />
                  <p className="font-medium">¡Sin devoluciones pendientes hoy!</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* TABLA 2: RESTO DE DEVOLUCIONES (Futuras y Atrasadas) */}
          <Card className="border-2 border-slate-200 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  OTRAS DEVOLUCIONES
                </CardTitle>
                <Badge className="bg-white text-slate-700 font-bold text-lg px-3">
                  {pendingReturns.other_days?.length || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pendingReturns.other_days?.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {pendingReturns.other_days.map((r, idx) => {
                    const endDate = new Date(r.end_date);
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    endDate.setHours(0,0,0,0);
                    const isOverdue = endDate < today;
                    
                    return (
                      <div 
                        key={r.id || idx}
                        onClick={() => quickReturn(r.id, r.customer_name)}
                        className={`p-4 cursor-pointer transition-colors flex items-center justify-between group ${
                          isOverdue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className={`h-12 w-12 border-2 ${isOverdue ? 'border-red-300' : 'border-slate-200'}`}>
                            <AvatarFallback className={`font-bold ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                              {r.customer_name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-slate-900">{r.customer_name}</p>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Package className="h-3 w-3" />
                              <span>{r.pending_items?.length || r.items?.filter(i => !i.returned).length || '?'} artículos</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={`${
                            isOverdue 
                              ? 'bg-red-100 text-red-700 border-red-300' 
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {isOverdue ? '⚠️ ATRASADO' : formatDate(r.end_date)}
                          </Badge>
                          <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">Sin otras devoluciones programadas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Filtro por tipo */}
        <div className="mt-6 flex items-center gap-4">
          <Filter className="h-5 w-5 text-slate-400" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {itemTypes.map(type => (
                <SelectItem key={type.id || type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {typeFilter && typeFilter !== "all" && (
            <Button variant="ghost" size="sm" onClick={() => setTypeFilter("all")}>
              <X className="h-4 w-4 mr-1" />
              Limpiar filtro
            </Button>
          )}
        </div>
      </div>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-orange-600" />
              Reembolso Parcial
            </DialogTitle>
            <DialogDescription>
              Devuelve el importe por días no disfrutados
            </DialogDescription>
          </DialogHeader>
          
          {rental && (
            <div className="space-y-4 py-4">
              {/* Rental Info */}
              <div className="p-4 rounded-xl bg-slate-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600">Cliente</span>
                  <span className="font-semibold">{rental.customer_name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600">Días contratados</span>
                  <span className="font-semibold">{rental.days} días</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600">Importe total</span>
                  <span className="font-semibold">€{rental.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Ya pagado</span>
                  <span className="font-semibold text-emerald-600">€{rental.paid_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Days to refund */}
              <div>
                <Label>Días a reembolsar (máx. {maxRefundDays})</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Input
                    type="number"
                    min="1"
                    max={maxRefundDays}
                    value={refundDays}
                    onChange={(e) => handleRefundDaysChange(e.target.value)}
                    className="h-12 w-24 text-xl text-center font-bold"
                  />
                  <div className="flex gap-1">
                    {[1, 2, 3].filter(d => d <= maxRefundDays).map(d => (
                      <Button
                        key={d}
                        variant={refundDays === d ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleRefundDaysChange(d)}
                      >
                        {d}d
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Refund Amount */}
              <div>
                <Label>Importe a devolver</Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-500">€</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={refundAmount.toFixed(2)}
                    onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                    className="h-12 pl-8 text-xl font-bold text-orange-600"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Calculado: €{(rental.total_amount / rental.days).toFixed(2)}/día × {refundDays} días
                </p>
              </div>

              {/* Payment Method - LOCKED for security */}
              <div>
                <Label>Método de devolución</Label>
                <div className="mt-1 h-11 px-3 flex items-center justify-between rounded-md border border-slate-300 bg-slate-100 cursor-not-allowed">
                  <div className="flex items-center gap-2">
                    {refundMethod === 'cash' ? (
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
                    <span>Por seguridad, la devolución se realiza al mismo método de pago original.</span>
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div>
                <Label>Motivo (opcional)</Label>
                <Textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Ej: Devuelve antes por mal tiempo..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-700">Reembolso a realizar</p>
                    <p className="text-2xl font-bold text-orange-700">€{refundAmount.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-orange-700">Nuevo período</p>
                    <p className="text-lg font-semibold text-orange-800">{rental.days - refundDays} días</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={processRefund} 
              disabled={processingRefund || refundAmount <= 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {processingRefund ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Banknote className="h-4 w-4 mr-2" />
              )}
              Confirmar Reembolso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Info Modal */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Ficha del Cliente
            </DialogTitle>
            <DialogDescription>
              Información de contacto y material pendiente
            </DialogDescription>
          </DialogHeader>
          
          {customerLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedCustomer && (
            <div className="space-y-4 py-4">
              {/* Customer Name & Status */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedCustomer.name}</h3>
                    {selectedCustomer.days_overdue > 0 && (
                      <Badge className="bg-red-100 text-red-700 border-red-200 mt-2">
                        ⚠️ Retrasado {selectedCustomer.days_overdue} {selectedCustomer.days_overdue === 1 ? 'día' : 'días'}
                      </Badge>
                    )}
                  </div>
                  {selectedCustomer.dni && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500">DNI/Pasaporte</p>
                      <p className="font-mono font-semibold text-slate-700">{selectedCustomer.dni}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
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
                        data-testid="whatsapp-btn"
                      >
                        <MessageCircle className="h-3 w-3" />
                        WhatsApp
                      </Button>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-blue-600 font-medium">Email</p>
                      <p className="font-semibold text-slate-900">{selectedCustomer.email || 'No registrado'}</p>
                    </div>
                  </div>
                  {selectedCustomer.email && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => sendEmail(selectedCustomer.email, selectedCustomer.name)}
                    >
                      <Mail className="h-3 w-3" />
                      Enviar Email
                    </Button>
                  )}
                </div>

                {/* Hotel/Address */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-purple-600 font-medium">Hotel / Alojamiento</p>
                      <p className="font-semibold text-slate-900">{selectedCustomer.hotel || 'No registrado'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending Items */}
              {selectedCustomer.pending_items && selectedCustomer.pending_items.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-5 w-5 text-amber-600" />
                    <p className="font-semibold text-amber-800">Material Pendiente de Devolver</p>
                  </div>
                  <div className="space-y-2">
                    {selectedCustomer.pending_items.map((item, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-200"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{item.brand} {item.model}</p>
                          <p className="text-xs text-slate-500">
                            {item.item_type} • Talla {item.size}
                            {item.barcode && <span className="font-mono ml-2">#{item.barcode}</span>}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          Pendiente
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedCustomer.notes && (
                <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Observaciones</p>
                  <p className="text-sm text-slate-700">{selectedCustomer.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerModal(false)}>
              Cerrar
            </Button>
            {selectedCustomer?.phone && (
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => sendWhatsAppMessage(selectedCustomer.phone, selectedCustomer.name)}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contactar por WhatsApp
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change/Extension Modal */}
      {/* ============ MULTI-ITEM CHANGE/EXTENSION MODAL ============ */}
      <Dialog open={changeModal} onOpenChange={closeChangeModal}>
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
                                <p className="text-xs text-orange-600 font-medium">→ {item.swapNewItem?.internal_code}</p>
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
                                  if (e.key === 'Enter' && changeNewBarcode.trim()) {
                                    searchSwapItem(changeNewBarcode);
                                  } else if (e.key === 'Escape') {
                                    setActiveSwapIndex(null);
                                  }
                                }}
                                placeholder="Código (ej: BOT-102)"
                                className="h-8 w-40 text-sm font-mono"
                                autoFocus
                              />
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  if (changeNewBarcode.trim()) {
                                    searchSwapItem(changeNewBarcode);
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

              {/* DATE ADJUSTMENT - Allows both extension and early return */}
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
                    {/* Date picker and info */}
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
                          onChange={(e) => handleDateAdjustment(e.target.value)}
                          className="h-10 font-semibold"
                        />
                      </div>
                    </div>
                    
                    {/* Clear visualization of days */}
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
                      
                      {/* Economic difference */}
                      {changeDateDelta !== 0 && (
                        <div className={`mt-3 p-2 rounded text-center ${
                          changeDateDelta > 0 ? 'bg-orange-100' : 'bg-emerald-100'
                        }`}>
                          <p className="text-xs text-slate-600">
                            {changeDateDelta > 0 ? 'Suplemento por extensión' : 'Abono por devolución anticipada'}
                          </p>
                          <p className={`text-lg font-bold ${
                            changeDateDelta > 0 ? 'text-orange-700' : 'text-emerald-700'
                          }`}>
                            {changeDateDelta > 0 ? '+' : ''}€{changeDateDelta.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* TOTAL DELTA SUMMARY */}
              <div className={`p-5 rounded-xl border-2 ${
                changeTotalDelta > 0 
                  ? 'bg-orange-50 border-orange-300' 
                  : changeTotalDelta < 0 
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      {changeTotalDelta > 0 ? '⬆️ TOTAL A COBRAR' : 
                       changeTotalDelta < 0 ? '⬇️ TOTAL A ABONAR' : 
                       '↔️ SIN DIFERENCIA'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {changeItems.filter(i => i.isSwapping).length > 0 && 
                        `${changeItems.filter(i => i.isSwapping).length} cambio(s) de material`}
                      {changeItems.filter(i => i.isSwapping).length > 0 && changeAdjustDate && changeDateDelta !== 0 && ' + '}
                      {changeAdjustDate && changeDateDelta !== 0 && 
                        (changeDateDelta > 0 ? 'extensión de fecha' : 'devolución anticipada')}
                    </p>
                  </div>
                  <p className={`text-3xl font-bold ${
                    changeTotalDelta > 0 ? 'text-orange-600' : 
                    changeTotalDelta < 0 ? 'text-emerald-600' : 'text-slate-500'
                  }`}>
                    {changeTotalDelta > 0 ? '+' : changeTotalDelta < 0 ? '-' : ''}€{Math.abs(changeTotalDelta).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Payment Method - Only if there's a delta */}
              {changeTotalDelta !== 0 && (
                <div className="space-y-2">
                  <Label className="shrink-0">Método de {changeTotalDelta > 0 ? 'cobro' : 'abono'}:</Label>
                  
                  {/* If positive (cobro), allow choice. If negative (abono), lock to original */}
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
                    /* LOCKED for refunds/abonos */
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
              <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                ¡Cambios Procesados!
              </h3>
              <p className="text-slate-600 mb-6">
                {changeItems.filter(i => i.isSwapping).length > 0 && 
                  `${changeItems.filter(i => i.isSwapping).length} artículo(s) sustituido(s)`}
                {changeItems.filter(i => i.isSwapping).length > 0 && changeAdjustDate && changeDateDelta !== 0 && ' + '}
                {changeAdjustDate && changeDateDelta !== 0 && 'ajuste de fecha aplicado'}
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={printMultiChangeTicket}
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
                  disabled={changeLoading || (changeItems.filter(i => i.isSwapping).length === 0 && (!changeAdjustDate || changeDateDelta === 0))}
                  className={`min-w-[180px] ${
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
                  {changeTotalDelta > 0 ? `Cobrar €${changeTotalDelta.toFixed(2)}` :
                   changeTotalDelta < 0 ? `Abonar €${Math.abs(changeTotalDelta).toFixed(2)}` :
                   'Procesar Cambios'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
