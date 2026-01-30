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
  ArrowRight,
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
    setChangePaymentMethod("cash");
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

  // Print regularization ticket - Using centralized template from Settings
  const printRegularizationTicket = () => {
    if (!changeRental) return;
    
    const itemsSwapped = changeItems.filter(i => i.isSwapping && i.swapNewItem);
    const hasDateChange = changeAdjustDate && changeDateDelta !== 0;
    
    // Get stored settings for branding
    const companyLogo = localStorage.getItem('companyLogo');
    const ticketHeader = localStorage.getItem('ticketHeader') || 'TIENDA DE ALQUILER DE ESQUÍ';
    const ticketFooter = localStorage.getItem('ticketFooter') || '¡Gracias por su visita!';
    const showDniOnTicket = localStorage.getItem('showDniOnTicket') !== 'false';
    
    const ticketWindow = window.open('', '_blank', 'width=320,height=700');
    if (!ticketWindow) {
      toast.error("No se pudo abrir la ventana de impresión");
      return;
    }
    
    const fmt = (v) => (v || 0).toFixed(2);
    const now = new Date();
    const printTime = now.toLocaleString('es-ES', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    
    ticketWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket de Regularización</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Consolas', 'Courier New', monospace; 
            font-size: 11px; 
            padding: 8px; 
            width: 80mm; 
            line-height: 1.4;
            color: #000;
          }
          .logo { text-align: center; margin-bottom: 8px; }
          .logo img { max-width: 50mm; max-height: 20mm; }
          .header { text-align: center; margin-bottom: 10px; }
          .header-business { font-size: 12px; font-weight: bold; margin-bottom: 8px; }
          .header-title { 
            font-size: 14px; 
            font-weight: bold; 
            letter-spacing: 1px;
            padding: 6px 0;
            background: #f97316;
            color: white;
            margin: 8px 0;
          }
          .separator { border: none; border-top: 1px dashed #000; margin: 10px 0; }
          .separator-double { border: none; border-top: 2px solid #000; margin: 10px 0; }
          .block { margin: 10px 0; }
          .block-title { font-weight: bold; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; }
          .row-value { font-weight: bold; }
          .swap-item { 
            padding: 6px; 
            margin: 5px 0; 
            background: #f5f5f5; 
            border-radius: 4px; 
            border-left: 3px solid #f97316;
          }
          .swap-arrow { color: #f97316; font-weight: bold; }
          .delta-box {
            text-align: center;
            padding: 12px;
            margin: 10px 0;
            border: 2px solid #000;
          }
          .delta-positive { background: #dcfce7; border-color: #16a34a; }
          .delta-negative { background: #fee2e2; border-color: #dc2626; }
          .delta-zero { background: #f3f4f6; border-color: #6b7280; }
          .delta-label { font-size: 10px; color: #666; margin-bottom: 4px; }
          .delta-amount { font-size: 20px; font-weight: bold; }
          .delta-positive .delta-amount { color: #16a34a; }
          .delta-negative .delta-amount { color: #dc2626; }
          .footer { text-align: center; margin-top: 15px; font-size: 9px; color: #333; }
          @media print { @page { margin: 0; size: 80mm auto; } }
        </style>
      </head>
      <body>
        <!-- CABECERA -->
        ${companyLogo ? `
        <div class="logo">
          <img src="${companyLogo}" alt="Logo" />
        </div>
        ` : `
        <div class="header">
          <div class="header-business">${ticketHeader}</div>
        </div>
        `}
        
        <div class="header-title">TICKET DE REGULARIZACIÓN</div>
        
        <div style="text-align: center; font-size: 10px; margin-bottom: 10px;">
          ${printTime}
        </div>
        
        <hr class="separator" />
        
        <!-- BLOQUE A: DATOS DEL CLIENTE -->
        <div class="block">
          <div class="block-title">A. Datos del Cliente</div>
          <div class="row">
            <span>Cliente:</span>
            <span class="row-value">${changeRental.customer_name}</span>
          </div>
          ${showDniOnTicket && changeRental.customer_dni ? `
          <div class="row">
            <span>DNI:</span>
            <span class="row-value">${changeRental.customer_dni}</span>
          </div>
          ` : ''}
          <div class="row">
            <span>Contrato:</span>
            <span class="row-value">#${changeRental.id?.substring(0, 8)}</span>
          </div>
        </div>
        
        <hr class="separator" />
        
        <!-- BLOQUE B: CAMBIOS REALIZADOS -->
        <div class="block">
          <div class="block-title">B. Cambios Realizados</div>
          
          ${hasDateChange ? `
          <div style="margin: 8px 0; padding: 8px; background: #eff6ff; border-radius: 4px; border-left: 3px solid #2563eb;">
            <div style="font-weight: bold; margin-bottom: 4px;">📅 Ajuste de Fecha</div>
            <div class="row" style="font-size: 10px;">
              <span>Días originales:</span>
              <span>${changeOriginalDays}</span>
            </div>
            <div class="row" style="font-size: 10px;">
              <span>Días nuevos:</span>
              <span>${changeNewTotalDays}</span>
            </div>
            <div class="row" style="margin-top: 4px;">
              <span>${changeDateDelta >= 0 ? 'Suplemento:' : 'Abono:'}</span>
              <span class="row-value" style="color: ${changeDateDelta >= 0 ? '#16a34a' : '#dc2626'};">
                ${changeDateDelta >= 0 ? '+' : ''}€${fmt(changeDateDelta)}
              </span>
            </div>
          </div>
          ` : ''}
          
          ${itemsSwapped.length > 0 ? `
          <div style="margin-top: 8px;">
            <div style="font-weight: bold; margin-bottom: 6px;">🔄 Cambio de Material (${itemsSwapped.length})</div>
            ${itemsSwapped.map(item => `
              <div class="swap-item">
                <div>
                  <span style="text-decoration: line-through; color: #999;">${item.internal_code || item.barcode}</span>
                  <span class="swap-arrow"> → </span>
                  <span style="font-weight: bold;">${item.swapNewItem.internal_code || item.swapNewItem.barcode}</span>
                </div>
                <div style="font-size: 10px; color: #666; margin-top: 2px;">
                  ${item.item_type} | 
                  <span style="color: ${item.swapDelta >= 0 ? '#16a34a' : '#dc2626'};">
                    ${item.swapDelta >= 0 ? '+' : ''}€${fmt(item.swapDelta)}
                  </span>
                </div>
              </div>
            `).join('')}
            <div class="row" style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #ccc;">
              <span>Subtotal material:</span>
              <span class="row-value" style="color: ${materialDelta >= 0 ? '#16a34a' : '#dc2626'};">
                ${materialDelta >= 0 ? '+' : ''}€${fmt(materialDelta)}
              </span>
            </div>
          </div>
          ` : ''}
        </div>
        
        <hr class="separator" />
        
        <!-- BLOQUE C: RESULTADO -->
        <div class="delta-box ${changeTotalDelta > 0 ? 'delta-positive' : changeTotalDelta < 0 ? 'delta-negative' : 'delta-zero'}">
          <div class="delta-label">
            ${changeTotalDelta > 0 ? 'TOTAL COBRADO' : changeTotalDelta < 0 ? 'TOTAL ABONADO' : 'SIN DIFERENCIA'}
          </div>
          <div class="delta-amount">
            ${changeTotalDelta > 0 ? '+' : changeTotalDelta < 0 ? '-' : ''}€${fmt(Math.abs(changeTotalDelta))}
          </div>
          ${changeTotalDelta !== 0 ? `
          <div style="font-size: 9px; margin-top: 4px; color: #666;">
            Método: ${changePaymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}
          </div>
          ` : ''}
        </div>
        
        <hr class="separator-double" />
        
        <div class="footer">
          ${ticketFooter}<br/>
          ─────────────────────────<br/>
          Conserve este comprobante
        </div>
        
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    ticketWindow.document.close();
  };

  // Print ticket for all changes - Using centralized template from Settings
  const printMultiChangeTicket = () => {
    // Same implementation as printRegularizationTicket (unified)
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
                                onClick={() => openChangeModal(rental)}
                                className="gap-1 border-orange-300 text-orange-700 hover:bg-orange-50 font-semibold"
                                data-testid={`change-btn-${rental.id}`}
                              >
                                <ArrowLeftRight className="h-4 w-4" />
                                GESTIONAR
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
                                onClick={() => openChangeModal(rental)}
                                className="gap-1 border-orange-300 text-orange-700 hover:bg-orange-50 font-semibold"
                                data-testid={`change-btn-other-${rental.id}`}
                              >
                                <ArrowLeftRight className="h-4 w-4" />
                                GESTIONAR
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
                <div className="flex items-center gap-4">
                  <Label className="shrink-0">Método de {changeTotalDelta > 0 ? 'cobro' : 'abono'}:</Label>
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
