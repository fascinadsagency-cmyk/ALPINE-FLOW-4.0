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
import { rentalApi } from "@/lib/api";
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
  Scan,
  CreditCard,
  CheckCircle,
  Printer,
  CalendarPlus
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
  
  // ============ MULTI-ITEM CHANGE/EXTENSION MODAL STATE ============
  const [changeModal, setChangeModal] = useState(false);
  const [changeRental, setChangeRental] = useState(null);
  const [changeItems, setChangeItems] = useState([]); // Array of items with swap info
  const [activeSwapIndex, setActiveSwapIndex] = useState(null); // Which item is being swapped
  const [changeNewBarcode, setChangeNewBarcode] = useState("");
  const [changeTotalDelta, setChangeTotalDelta] = useState(0);
  const [changeNewDays, setChangeNewDays] = useState("");
  const [changeDaysRemaining, setChangeDaysRemaining] = useState(0);
  const [changePaymentMethod, setChangePaymentMethod] = useState("cash");
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeComplete, setChangeComplete] = useState(false);
  const [changeExtendDays, setChangeExtendDays] = useState(false); // Toggle for day extension
  const changeInputRef = useRef(null);
  
  const barcodeRef = useRef(null);

  // ============ MULTI-ITEM CHANGE FUNCTIONS ============
  
  const openChangeModal = (rental, triggerItem = null) => {
    const rentalDays = rental.days || rental.duration || 1;
    
    // Get all pending items from the rental
    const pendingItems = (rental.pending_items || rental.items || [])
      .filter(i => !i.returned)
      .map((item, index) => ({
        ...item,
        index,
        swapNewItem: null, // Will hold the new item if swapping
        swapDelta: 0, // Price difference for this item
        isSwapping: false // Whether this item is marked for swap
      }));
    
    setChangeRental({
      ...rental,
      days: rentalDays
    });
    setChangeItems(pendingItems);
    setActiveSwapIndex(null);
    setChangeNewBarcode("");
    setChangeTotalDelta(0);
    setChangeComplete(false);
    setChangePaymentMethod("cash");
    setChangeExtendDays(false);
    
    // Calculate days remaining
    const endDate = new Date(rental.end_date);
    const today = new Date();
    const daysLeft = Math.max(1, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)) + 1);
    setChangeDaysRemaining(daysLeft);
    setChangeNewDays(rentalDays.toString());
    
    setChangeModal(true);
    
    setTimeout(() => {
      changeInputRef.current?.focus();
    }, 150);
  };

  const closeChangeModal = () => {
    setChangeModal(false);
    setChangeRental(null);
    setChangeItems([]);
    setActiveSwapIndex(null);
    setChangeTotalDelta(0);
    setChangeComplete(false);
  };

  // Start swap mode for a specific item
  const startItemSwap = (index) => {
    setActiveSwapIndex(index);
    setChangeNewBarcode("");
    setTimeout(() => changeInputRef.current?.focus(), 100);
  };

  // Cancel swap for a specific item
  const cancelItemSwap = (index) => {
    const updated = [...changeItems];
    updated[index] = {
      ...updated[index],
      swapNewItem: null,
      swapDelta: 0,
      isSwapping: false
    };
    setChangeItems(updated);
    setActiveSwapIndex(null);
    recalculateTotalDelta(updated);
  };

  // Search and assign new item for swap
  const searchSwapItem = async (code) => {
    if (!code.trim() || activeSwapIndex === null) return;
    
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
      const delta = await calculateItemDelta(oldItem, foundItem);

      // Update the item in array
      const updated = [...changeItems];
      updated[activeSwapIndex] = {
        ...updated[activeSwapIndex],
        swapNewItem: foundItem,
        swapDelta: delta,
        isSwapping: true
      };
      setChangeItems(updated);
      
      toast.success(`✓ ${oldItem.internal_code || oldItem.barcode} → ${foundItem.internal_code || foundItem.barcode}`);
      setActiveSwapIndex(null);
      setChangeNewBarcode("");
      
      recalculateTotalDelta(updated);

    } catch (error) {
      toast.error("Error al buscar artículo");
    } finally {
      setChangeLoading(false);
    }
  };

  // Calculate delta for a single item swap
  const calculateItemDelta = async (oldItem, newItem) => {
    try {
      const tariffsRes = await axios.get(`${API}/tariffs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const tariffs = tariffsRes.data;

      const oldTariff = tariffs.find(t => t.item_type?.toLowerCase() === oldItem.item_type?.toLowerCase());
      const dayField = changeDaysRemaining <= 10 ? `day_${changeDaysRemaining}` : 'day_11_plus';
      const oldPrice = oldTariff?.[dayField] || oldItem.unit_price || 0;

      const newTariff = tariffs.find(t => t.item_type?.toLowerCase() === newItem.item_type?.toLowerCase());
      const newPrice = newTariff?.[dayField] || newItem.rental_price || 0;

      return newPrice - oldPrice;
    } catch {
      return 0;
    }
  };

  // Recalculate total delta from all swaps + day extension
  const recalculateTotalDelta = (items) => {
    let total = 0;
    
    // Sum all swap deltas
    items.forEach(item => {
      if (item.isSwapping && item.swapDelta) {
        total += item.swapDelta;
      }
    });
    
    // Add day extension cost if enabled
    if (changeExtendDays && changeRental) {
      const newDaysNum = parseInt(changeNewDays) || changeRental.days;
      const oldDaysNum = changeRental.days;
      if (newDaysNum > oldDaysNum) {
        const extraDays = newDaysNum - oldDaysNum;
        const pricePerDay = changeRental.total_amount / oldDaysNum;
        total += pricePerDay * extraDays;
      }
    }
    
    setChangeTotalDelta(total);
  };

  // Effect to recalculate when days change
  useEffect(() => {
    if (changeModal && changeRental) {
      recalculateTotalDelta(changeItems);
    }
  }, [changeNewDays, changeExtendDays]);

  // Execute all changes
  const executeAllChanges = async () => {
    if (!changeRental) {
      toast.error("Faltan datos para el cambio");
      return;
    }

    const itemsToSwap = changeItems.filter(i => i.isSwapping && i.swapNewItem);
    const hasSwaps = itemsToSwap.length > 0;
    const hasDayExtension = changeExtendDays && parseInt(changeNewDays) !== changeRental.days;

    if (!hasSwaps && !hasDayExtension) {
      toast.error("No hay cambios que procesar");
      return;
    }

    setChangeLoading(true);
    try {
      // Process each swap
      for (const item of itemsToSwap) {
        await axios.post(`${API}/rentals/${changeRental.id}/central-swap`, {
          old_item_barcode: item.barcode || item.internal_code,
          new_item_barcode: item.swapNewItem.barcode || item.swapNewItem.internal_code,
          days_remaining: changeDaysRemaining,
          payment_method: changePaymentMethod,
          delta_amount: item.swapDelta || 0
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      }

      // Process day extension if needed
      if (hasDayExtension) {
        const newDaysNum = parseInt(changeNewDays);
        const extraDays = newDaysNum - changeRental.days;
        const extensionCost = (changeRental.total_amount / changeRental.days) * extraDays;
        
        await axios.patch(`${API}/rentals/${changeRental.id}/modify-duration`, {
          new_days: newDaysNum,
          new_total: changeRental.total_amount + extensionCost,
          payment_method: changePaymentMethod,
          difference_amount: extensionCost
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      }

      setChangeComplete(true);
      toast.success(`✅ ${itemsToSwap.length} cambio(s) procesado(s) correctamente`);
      loadPendingReturns();

    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al procesar los cambios");
    } finally {
      setChangeLoading(false);
    }
  };

  // Print ticket for all changes
  const printMultiChangeTicket = () => {
    if (!changeRental) return;
    
    const itemsSwapped = changeItems.filter(i => i.isSwapping && i.swapNewItem);
    const hasDayExtension = changeExtendDays && parseInt(changeNewDays) !== changeRental.days;
    
    const ticketWindow = window.open('', '_blank', 'width=400,height=700');
    ticketWindow.document.write(`
      <!DOCTYPE html><html><head><title>Ticket de Regularización</title>
      <style>
        @media print { @page { margin: 0; size: 80mm auto; } }
        body { font-family: 'Courier New', monospace; width: 80mm; padding: 5mm; margin: 0 auto; font-size: 11px; }
        .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 10px; }
        .section { border-bottom: 1px dashed #ccc; padding: 8px 0; }
        .row { display: flex; justify-content: space-between; padding: 3px 0; }
        .swap-item { padding: 5px; margin: 5px 0; background: #f5f5f5; border-radius: 4px; }
        .delta-box { text-align: center; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .delta-positive { background: #dcfce7; color: #166534; }
        .delta-negative { background: #fee2e2; color: #991b1b; }
        .delta-zero { background: #f3f4f6; color: #374151; }
        .delta-amount { font-size: 24px; font-weight: bold; }
        .print-btn { display: block; width: 100%; padding: 10px; margin-top: 15px; background: #2563eb; color: white; border: none; cursor: pointer; }
        @media print { .print-btn { display: none; } }
      </style></head><body>
        <div class="header">
          <h1>TICKET DE REGULARIZACIÓN</h1>
          <p>Cambios Múltiples</p>
        </div>
        <div class="section">
          <div class="row"><span>Cliente:</span><strong>${changeRental.customer_name}</strong></div>
          <div class="row"><span>DNI:</span><strong>${changeRental.customer_dni || '-'}</strong></div>
          <div class="row"><span>Alquiler:</span><strong>#${changeRental.id?.substring(0, 8)}</strong></div>
        </div>
        
        ${itemsSwapped.length > 0 ? `
        <div class="section">
          <p style="font-weight:bold;margin-bottom:8px;">CAMBIOS DE MATERIAL (${itemsSwapped.length})</p>
          ${itemsSwapped.map(item => `
            <div class="swap-item">
              <div>❌ ${item.internal_code || item.barcode} → ✅ ${item.swapNewItem.internal_code || item.swapNewItem.barcode}</div>
              <div style="font-size:10px;color:#666;">${item.item_type} • Delta: €${item.swapDelta?.toFixed(2) || '0.00'}</div>
            </div>
          `).join('')}
        </div>` : ''}
        
        ${hasDayExtension ? `
        <div class="section">
          <p style="font-weight:bold;">PRÓRROGA</p>
          <div class="row"><span>Días anteriores:</span><span>${changeRental.days}</span></div>
          <div class="row"><span>Días nuevos:</span><span>${changeNewDays}</span></div>
        </div>` : ''}
        
        <div class="delta-box ${changeTotalDelta > 0 ? 'delta-positive' : changeTotalDelta < 0 ? 'delta-negative' : 'delta-zero'}">
          <p>${changeTotalDelta > 0 ? 'TOTAL COBRADO' : changeTotalDelta < 0 ? 'TOTAL ABONADO' : 'SIN DIFERENCIA'}</p>
          <p class="delta-amount">${changeTotalDelta > 0 ? '+' : changeTotalDelta < 0 ? '-' : ''}€${Math.abs(changeTotalDelta).toFixed(2)}</p>
          <p style="font-size:10px;margin-top:5px;">Método: ${changePaymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}</p>
        </div>
        
        <p style="text-align:center;font-size:9px;">${new Date().toLocaleString('es-ES')}</p>
        <button class="print-btn" onclick="window.print();setTimeout(()=>window.close(),500)">IMPRIMIR</button>
      </body></html>
    `);
    ticketWindow.document.close();
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
      }
      return;
    }
    
    // Rental loaded, add barcode to scanned list
    const item = rental.items.find(i => i.barcode === barcode);
    if (!item) {
      toast.error("Este artículo no pertenece a este alquiler");
      return;
    }
    
    if (item.returned) {
      toast.info("Este artículo ya fue devuelto");
      return;
    }
    
    if (scannedBarcodes.includes(barcode)) {
      toast.info("Artículo ya escaneado");
      return;
    }
    
    setScannedBarcodes([...scannedBarcodes, barcode]);
    toast.success(`${item.brand} ${item.model} escaneado`);
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
    if (barcodeRef.current) barcodeRef.current.focus();
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

  return (
    <div className="p-6 lg:p-8" data-testid="returns-page">
      <h1 className="text-3xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Plus Jakarta Sans' }}>
        Devoluciones
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scanner Input */}
        <div className="lg:col-span-12">
          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                  <Input
                    ref={barcodeRef}
                    placeholder="Escanear o introducir código manualmente y presionar Enter..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={handleBarcodeScan}
                    className="h-14 pl-12 text-xl font-mono"
                    data-testid="return-barcode-input"
                  />
                </div>
                {rental && (
                  <Button variant="outline" onClick={resetForm} className="h-14 px-6">
                    <X className="h-5 w-5 mr-2" />
                    Cancelar
                  </Button>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-2 ml-12">
                Puedes escanear o escribir el código manualmente
              </p>
              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {rental && (
          <>
            {/* Customer Info */}
            <div className="lg:col-span-4">
              <Card className="border-slate-200 h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-slate-500" />
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50">
                    <p className="font-semibold text-lg text-slate-900">{rental.customer_name}</p>
                    <p className="text-slate-500 font-mono">{rental.customer_dni}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                        <Calendar className="h-4 w-4" />
                        Período
                      </div>
                      <p className="font-medium text-slate-900">
                        {rental.days} {rental.days === 1 ? 'día' : 'días'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                        <DollarSign className="h-4 w-4" />
                        Pendiente
                      </div>
                      <p className={`font-medium ${rental.pending_amount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        €{rental.pending_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Rental Info Summary */}
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-blue-700 font-medium">Total alquiler</span>
                      <span className="font-bold text-blue-900">€{rental.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-700">Pagado</span>
                      <span className="font-semibold text-blue-800">€{rental.paid_amount.toFixed(2)}</span>
                    </div>
                  </div>

                  {rental.pending_amount > 0 && (
                    <div className="p-3 rounded-lg bg-red-50 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="text-red-700 font-medium">Pago pendiente</span>
                    </div>
                  )}

                  {/* Refund Button */}
                  {rental.status !== 'returned' && maxRefundDays > 0 && rental.paid_amount > 0 && (
                    <Button 
                      variant="outline" 
                      className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                      onClick={openRefundDialog}
                      data-testid="refund-btn"
                    >
                      <Banknote className="h-4 w-4 mr-2" />
                      Reembolso Parcial ({maxRefundDays} día{maxRefundDays !== 1 ? 's' : ''} disponible{maxRefundDays !== 1 ? 's' : ''})
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Items Status */}
            <div className="lg:col-span-8 space-y-4">
              {toReturnItems.length > 0 && (
                <Card className="border-emerald-200 bg-emerald-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
                      <Check className="h-5 w-5" />
                      Escaneados para devolver ({toReturnItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {toReturnItems.map((item) => (
                        <div 
                          key={item.barcode}
                          className="flex items-center justify-between p-3 rounded-lg bg-white border border-emerald-200"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{item.brand} {item.model}</p>
                            <p className="text-sm text-slate-500">
                              {item.item_type} • Talla {item.size} • <span className="font-mono">{item.barcode}</span>
                            </p>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <Check className="h-3 w-3 mr-1" /> Listo
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {pendingItems.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="h-5 w-5" />
                      Pendientes de escanear ({pendingItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-2">
                      {pendingItems.map((item) => (
                        <div 
                          key={item.barcode}
                          className="grid grid-cols-12 gap-3 items-center p-3 rounded-lg bg-white border border-amber-200 hover:shadow-sm transition-shadow"
                        >
                          {/* Código Interno - Priority Column */}
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500 font-medium uppercase">Código</p>
                            <p className="font-mono font-bold text-slate-900 text-lg">{item.barcode}</p>
                          </div>
                          
                          {/* Tipo de Artículo */}
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500 font-medium uppercase">Tipo</p>
                            <p className="font-semibold text-slate-900">{item.item_type}</p>
                          </div>
                          
                          {/* Modelo */}
                          <div className="col-span-3">
                            <p className="text-xs text-slate-500 font-medium uppercase">Modelo</p>
                            <p className="font-medium text-slate-900">{item.brand} {item.model}</p>
                          </div>
                          
                          {/* Talla/Tamaño */}
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500 font-medium uppercase">Talla</p>
                            <p className="font-bold text-slate-900 text-lg">Talla {item.size}</p>
                          </div>
                          
                          {/* Estado */}
                          <div className="col-span-3 text-right">
                            <Badge variant="outline" className="text-amber-600 border-amber-300 font-semibold">
                              🔍 Pendiente
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {returnedItems.length > 0 && (
                <Card className="border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-500">
                      <Check className="h-5 w-5" />
                      Ya devueltos ({returnedItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {returnedItems.map((item) => (
                        <div 
                          key={item.barcode}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                        >
                          <div>
                            <p className="font-medium text-slate-600">{item.brand} {item.model}</p>
                            <p className="text-sm text-slate-400">
                              {item.item_type} • Talla {item.size}
                            </p>
                          </div>
                          <Badge variant="secondary">Devuelto</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {toReturnItems.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    size="lg"
                    onClick={processReturn}
                    disabled={processing}
                    className="h-14 px-8 text-lg font-semibold"
                    data-testid="process-return-btn"
                  >
                    {processing ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <RotateCcw className="h-5 w-5 mr-2" />
                    )}
                    Procesar Devolución ({toReturnItems.length} artículos)
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Empty State with Pending Returns Panel */}
        {!rental && !loading && (
          <>
            <div className="lg:col-span-12">
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <RotateCcw className="h-16 w-16 mb-4" />
                <p className="text-xl">Escanea o introduce manualmente cualquier artículo</p>
                <p className="text-sm mt-2">El sistema encontrará automáticamente el alquiler asociado</p>
              </div>
            </div>

            {/* Pending Returns Panel */}
            <div className="lg:col-span-12">
              <Card className="border-slate-200">
                <CardHeader className="pb-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-slate-600" />
                      Devoluciones Pendientes
                    </CardTitle>
                    
                    {/* Filter Badge and Clear */}
                    {typeFilter && (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1">
                          <Filter className="h-3 w-3 mr-1" />
                          Filtrando: {getTypeLabel(typeFilter)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilter}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Quitar filtro
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {/* Today's Returns */}
                  {filteredToday.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        📅 HOY ({filteredToday.length})
                        {typeFilter && <span className="text-xs font-normal text-amber-600">(filtrado)</span>}
                      </h3>
                      <div className="space-y-2">
                        {filteredToday.map((rental) => (
                          <div 
                            key={rental.id}
                            className="flex items-center justify-between p-4 rounded-lg bg-blue-50 border border-blue-200"
                          >
                            <div className="flex-1">
                              <button
                                onClick={() => openCustomerModal(rental)}
                                className="font-medium text-slate-900 hover:text-primary hover:underline text-left cursor-pointer"
                                data-testid={`customer-link-${rental.id}`}
                              >
                                {rental.customer_name}
                              </button>
                              <p className="text-sm text-slate-600 mt-1">
                                {rental.pending_items.map(i => `${i.brand} ${i.model}`).join(', ')}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {rental.pending_items.length} artículos pendientes
                                {rental.pending_amount > 0 && ` • €${rental.pending_amount.toFixed(2)} pendiente`}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="default"
                                size="sm"
                                onClick={() => quickReturn(rental.id, rental.customer_name)}
                                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                disabled={loading}
                              >
                                <Zap className="h-4 w-4" />
                                DEVOLUCIÓN RÁPIDA
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => openChangeModal(rental, rental.pending_items?.[0])}
                                className="gap-1 border-orange-300 text-orange-700 hover:bg-orange-50 font-semibold"
                                data-testid={`change-btn-${rental.id}`}
                              >
                                <ArrowLeftRight className="h-4 w-4" />
                                CAMBIO
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openCustomerModal(rental)}
                                className="gap-1"
                              >
                                <User className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Days Returns */}
                  {filteredOtherDays.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        📋 OTROS DÍAS ACTIVOS ({filteredOtherDays.length})
                        {typeFilter && <span className="text-xs font-normal text-amber-600">(filtrado)</span>}
                      </h3>
                      <div className="space-y-2">
                        {filteredOtherDays.map((rental) => (
                          <div 
                            key={rental.id}
                            className={`flex items-center justify-between p-4 rounded-lg border ${
                              rental.days_overdue > 0 
                                ? 'bg-red-50 border-red-200' 
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openCustomerModal(rental)}
                                  className="font-medium text-slate-900 hover:text-primary hover:underline text-left cursor-pointer"
                                  data-testid={`customer-link-${rental.id}`}
                                >
                                  {rental.customer_name}
                                </button>
                                {rental.days_overdue > 0 && (
                                  <Badge className="bg-red-100 text-red-700 border-red-200">
                                    ⚠️ Retrasado {rental.days_overdue} {rental.days_overdue === 1 ? 'día' : 'días'}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 mt-1">
                                Vence: {formatDate(rental.end_date)} • {rental.pending_items.length} artículos
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="default"
                                size="sm"
                                onClick={() => quickReturn(rental.id, rental.customer_name)}
                                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                disabled={loading}
                              >
                                <Zap className="h-4 w-4" />
                                DEVOLUCIÓN RÁPIDA
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => openChangeModal(rental, rental.pending_items?.[0])}
                                className="gap-1 border-orange-300 text-orange-700 hover:bg-orange-50 font-semibold"
                                data-testid={`change-btn-other-${rental.id}`}
                              >
                                <ArrowLeftRight className="h-4 w-4" />
                                CAMBIO
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openCustomerModal(rental)}
                                className="gap-1"
                              >
                                <User className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredToday.length === 0 && filteredOtherDays.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <Check className="h-12 w-12 mx-auto mb-3" />
                      {typeFilter ? (
                        <div>
                          <p>No hay devoluciones pendientes de <strong>{getTypeLabel(typeFilter)}</strong></p>
                          <Button 
                            variant="link" 
                            onClick={clearFilter}
                            className="mt-2 text-primary"
                          >
                            Ver todas las devoluciones
                          </Button>
                        </div>
                      ) : (
                        <p>No hay devoluciones pendientes</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
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

              {/* Payment Method */}
              <div>
                <Label>Método de devolución</Label>
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger className="h-11 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
      <Dialog open={changeModal} onOpenChange={setChangeModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-orange-600" />
              {changeAction === 'swap' ? 'Cambio de Material' : 'Prórroga de Alquiler'}
            </DialogTitle>
            <DialogDescription>
              {changeAction === 'swap' 
                ? 'Sustituir un artículo por otro disponible'
                : 'Extender el período de alquiler'
              }
            </DialogDescription>
          </DialogHeader>
          
          {changeRental && !changeComplete && (
            <div className="space-y-4 py-4">
              {/* Customer Info */}
              <div className="p-4 rounded-xl bg-slate-50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-900">{changeRental.customer_name}</p>
                    <p className="text-sm text-slate-500">Días restantes: {changeDaysRemaining}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">
                    Alquiler #{changeRental.id}
                  </Badge>
                </div>
              </div>

              {/* Action Tabs */}
              <Tabs value={changeAction} onValueChange={setChangeAction}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="swap">Cambio de Material</TabsTrigger>
                  <TabsTrigger value="extend">Prórroga</TabsTrigger>
                </TabsList>

                <TabsContent value="swap" className="space-y-4">
                  {/* Old Item Selection */}
                  {changeOldItem && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-sm text-red-700 font-medium mb-1">❌ Devuelve:</p>
                      <p className="font-semibold">{changeOldItem.brand} {changeOldItem.model}</p>
                      <p className="text-sm text-slate-500">
                        {changeOldItem.item_type} • Talla {changeOldItem.size} • {changeOldItem.internal_code || changeOldItem.barcode}
                      </p>
                    </div>
                  )}

                  {/* New Item Input */}
                  <div>
                    <Label>Escanear nuevo artículo</Label>
                    <div className="relative mt-1">
                      <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        ref={changeInputRef}
                        placeholder="Código del nuevo artículo..."
                        value={changeNewBarcode}
                        onChange={(e) => setChangeNewBarcode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && changeNewBarcode.trim()) {
                            searchChangeItem(changeNewBarcode.trim());
                            setChangeNewBarcode("");
                          }
                        }}
                        className="pl-10 h-12"
                        disabled={changeLoading}
                      />
                      {changeLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
                      )}
                    </div>
                  </div>

                  {/* New Item Display */}
                  {changeNewItem && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <p className="text-sm text-emerald-700 font-medium mb-1">✅ Recibe:</p>
                      <p className="font-semibold">{changeNewItem.brand} {changeNewItem.model}</p>
                      <p className="text-sm text-slate-500">
                        {changeNewItem.item_type} • Talla {changeNewItem.size} • {changeNewItem.internal_code || changeNewItem.barcode}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="extend" className="space-y-4">
                  <div>
                    <Label>Nuevos días de alquiler</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Input
                        type="number"
                        min={changeRental?.days || 1}
                        value={changeNewDays}
                        onChange={(e) => setChangeNewDays(e.target.value)}
                        className="w-24 h-12 text-xl text-center font-bold"
                      />
                      <span className="text-slate-500">días (actual: {changeRental?.days})</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Price Delta */}
              {changeDelta && (
                <div className={`p-4 rounded-xl border ${
                  changeDelta.delta > 0 
                    ? 'bg-orange-50 border-orange-200' 
                    : changeDelta.delta < 0 
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Diferencia de precio:</span>
                    <span className={`text-2xl font-bold ${
                      changeDelta.delta > 0 ? 'text-orange-600' : 
                      changeDelta.delta < 0 ? 'text-emerald-600' : 'text-slate-600'
                    }`}>
                      {changeDelta.delta > 0 ? '+' : ''}€{changeDelta.delta.toFixed(2)}
                    </span>
                  </div>
                  
                  {changeDelta.materialDelta !== 0 && (
                    <div className="text-sm text-slate-600 mb-1">
                      Material: €{changeDelta.oldPrice.toFixed(2)} → €{changeDelta.newPrice.toFixed(2)} 
                      ({changeDelta.materialDelta > 0 ? '+' : ''}€{changeDelta.materialDelta.toFixed(2)})
                    </div>
                  )}
                  
                  {changeDelta.extensionCost > 0 && (
                    <div className="text-sm text-slate-600">
                      Prórroga: {changeDelta.newDays - changeDelta.oldDays} días × €{(changeDelta.extensionCost / (changeDelta.newDays - changeDelta.oldDays)).toFixed(2)}/día = €{changeDelta.extensionCost.toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method */}
              {changeDelta && changeDelta.delta !== 0 && (
                <div>
                  <Label>Método de pago</Label>
                  <Select value={changePaymentMethod} onValueChange={setChangePaymentMethod}>
                    <SelectTrigger className="h-11 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {changeComplete && (
            <div className="py-8 text-center">
              <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {changeAction === 'swap' ? 'Cambio Completado' : 'Prórroga Completada'}
              </h3>
              <p className="text-slate-600 mb-6">
                La operación se ha procesado correctamente
              </p>
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
                  onClick={executeChange}
                  disabled={changeLoading || (!changeNewItem && parseInt(changeNewDays) === changeRental?.days)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {changeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                  )}
                  {changeAction === 'swap' ? 'Procesar Cambio' : 'Procesar Prórroga'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
