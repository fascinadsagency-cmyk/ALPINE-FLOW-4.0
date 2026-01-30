import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/contexts/SettingsContext";
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2,
  Calendar,
  Lock,
  Download,
  AlertTriangle,
  CheckCircle,
  RefreshCcw,
  Printer,
  History,
  Undo2,
  Search,
  CreditCard,
  Banknote,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Scale,
  Pencil
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INCOME_CATEGORIES = [
  { value: "rental", label: "Alquiler" },
  { value: "accessory_sale", label: "Venta accesorios" },
  { value: "extension", label: "Ampliación alquiler" },
  { value: "other", label: "Otros" },
];

const EXPENSE_CATEGORIES = [
  { value: "purchase", label: "Compra material" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "supplies", label: "Suministros" },
  { value: "payroll", label: "Nóminas" },
  { value: "rent", label: "Alquiler local" },
  { value: "refund", label: "Devolución cliente" },
  { value: "other", label: "Otros" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "card", label: "Tarjeta", icon: CreditCard },
];

export default function CashRegister() {
  const { darkMode } = useSettings();
  
  // State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showOpenSessionDialog, setShowOpenSessionDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);
  
  // Edit payment method dialog
  const [showEditPaymentDialog, setShowEditPaymentDialog] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  
  // Session state
  const [activeSession, setActiveSession] = useState(null);
  const [openingBalance, setOpeningBalance] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  
  // Movement form
  const [movementType, setMovementType] = useState("income");
  const [newMovement, setNewMovement] = useState({
    amount: "",
    payment_method: "cash",
    category: "",
    concept: "",
    notes: ""
  });
  
  // Arqueo form
  const [arqueoForm, setArqueoForm] = useState({
    physical_cash: "",
    card_total: "",
    notes: ""
  });
  
  // Tabs
  const [activeTab, setActiveTab] = useState("today");
  const [closureHistory, setClosureHistory] = useState([]);
  const [historicLoading, setHistoricLoading] = useState(false);
  const [revertClosureId, setRevertClosureId] = useState(null);

  useEffect(() => {
    loadData();
  }, [date]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === "today") loadData();
    }, 10000);
    return () => clearInterval(interval);
  }, [activeTab, date]);

  useEffect(() => {
    if (activeTab === "closures") loadClosureHistory();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, movementsRes, sessionRes] = await Promise.all([
        axios.get(`${API}/cash/summary/realtime`, { params: { date } }),
        axios.get(`${API}/cash/movements`, { params: { date } }),
        axios.get(`${API}/cash/sessions/active`)
      ]);
      setSummary(summaryRes.data);
      setMovements(movementsRes.data);
      setActiveSession(sessionRes.data);
    } catch (error) {
      toast.error("Error al cargar datos de caja");
    } finally {
      setLoading(false);
    }
  };

  const openCashSession = async () => {
    if (!openingBalance || parseFloat(openingBalance) < 0) {
      toast.error("Introduce un fondo de caja válido (puede ser 0)");
      return;
    }
    try {
      await axios.post(`${API}/cash/sessions/open`, {
        opening_balance: parseFloat(openingBalance),
        notes: sessionNotes
      });
      toast.success("Caja abierta correctamente");
      setShowOpenSessionDialog(false);
      setOpeningBalance("");
      setSessionNotes("");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al abrir caja");
    }
  };

  const loadClosureHistory = async () => {
    setHistoricLoading(true);
    try {
      const res = await axios.get(`${API}/cash/closings`);
      setClosureHistory(res.data);
    } catch (error) {
      toast.error("Error al cargar historial de cierres");
    } finally {
      setHistoricLoading(false);
    }
  };

  const createMovement = async () => {
    if (!newMovement.amount || !newMovement.concept || !newMovement.category) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    try {
      await axios.post(`${API}/cash/movements`, {
        movement_type: movementType,
        amount: parseFloat(newMovement.amount),
        payment_method: newMovement.payment_method,
        category: newMovement.category,
        concept: newMovement.concept,
        notes: newMovement.notes
      });
      toast.success(movementType === "income" ? "Entrada registrada" : "Salida registrada");
      setShowAddDialog(false);
      setNewMovement({ amount: "", payment_method: "cash", category: "", concept: "", notes: "" });
      loadData();
    } catch (error) {
      toast.error("Error al registrar movimiento");
    }
  };

  // Cálculo de descuadres basado en los nuevos campos del backend
  const getDiscrepancy = () => {
    const realCash = parseFloat(arqueoForm.physical_cash) || 0;
    const realCard = parseFloat(arqueoForm.card_total) || 0;
    const expectedCash = summary?.efectivo_esperado || 0;
    const expectedCard = summary?.tarjeta_esperada || 0;
    
    return {
      cash: realCash - expectedCash,
      card: realCard - expectedCard,
      total: (realCash - expectedCash) + (realCard - expectedCard)
    };
  };

  // ============ IMPRIMIR TICKET DE MOVIMIENTO (con plantilla de Configuración) ============
  const printMovementTicket = (movement) => {
    const win = window.open('', '_blank', 'width=320,height=600');
    if (!win) {
      toast.error("No se pudo abrir ventana de impresión");
      return;
    }
    
    // Get stored settings for branding
    const companyLogo = localStorage.getItem('companyLogo');
    const ticketHeader = localStorage.getItem('ticketHeader') || 'TIENDA DE ALQUILER DE ESQUÍ';
    const ticketFooter = localStorage.getItem('ticketFooter') || '¡Gracias por su visita!';
    const ticketTerms = localStorage.getItem('ticketTerms') || '';
    
    // Format helpers
    const fmt = (v) => (v || 0).toFixed(2);
    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    const formatTime = (dateStr) => {
      if (!dateStr) return '-';
      return dateStr.split('T')[1]?.substring(0, 5) || '-';
    };
    
    // Determine ticket type
    const isRefund = movement.movement_type === 'refund';
    const isExpense = movement.movement_type === 'expense';
    const isIncome = movement.movement_type === 'income';
    
    const ticketTitle = isRefund ? 'TICKET DE DEVOLUCIÓN' : isExpense ? 'TICKET DE SALIDA' : 'TICKET DE VENTA';
    const ticketColor = isRefund ? '#f97316' : isExpense ? '#dc2626' : '#16a34a';
    const amountPrefix = isIncome ? '+' : '-';
    
    // Get category label
    const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
    const categoryLabel = allCategories.find(c => c.value === movement.category)?.label || movement.category || '-';
    const paymentLabel = PAYMENT_METHODS.find(p => p.value === movement.payment_method)?.label || movement.payment_method;
    
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${ticketTitle} - ${movement.operation_number || 'N/A'}</title>
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
            background: ${ticketColor};
            color: white;
            margin: 8px 0;
          }
          .ticket-number { 
            font-size: 16px; 
            font-weight: bold; 
            text-align: center;
            padding: 8px;
            background: #f0f0f0;
            border: 1px solid #000;
            margin: 8px 0;
          }
          .separator { border: none; border-top: 1px dashed #000; margin: 10px 0; }
          .separator-double { border: none; border-top: 2px solid #000; margin: 10px 0; }
          .block { margin: 10px 0; }
          .block-title { font-weight: bold; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; }
          .row-value { font-weight: bold; }
          .amount-box {
            text-align: center;
            padding: 12px;
            margin: 10px 0;
            border: 2px solid ${ticketColor};
            background: ${isIncome ? '#dcfce7' : isRefund ? '#ffedd5' : '#fee2e2'};
          }
          .amount-label { font-size: 10px; color: #666; margin-bottom: 4px; }
          .amount-value { font-size: 20px; font-weight: bold; color: ${ticketColor}; }
          .footer { text-align: center; margin-top: 15px; font-size: 9px; color: #333; }
          .terms { font-size: 8px; color: #666; margin-top: 10px; padding: 8px; background: #f9f9f9; border: 1px dashed #ccc; }
          /* ========== THERMAL PRINTER 80mm OPTIMIZATION ========== */
          @page { 
            size: 80mm auto; 
            margin: 0; /* Elimina encabezados/pies del navegador */
          }
          @media print {
            html, body {
              width: 80mm !important;
              max-width: 80mm !important;
              margin: 0 !important;
              padding: 2mm !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color: #000000 !important;
              background: transparent !important;
            }
            .header-title {
              background: transparent !important;
              color: #000000 !important;
              border: 2px solid #000000 !important;
            }
            .amount-box {
              background: transparent !important;
              border: 2px solid #000000 !important;
            }
            .amount-value {
              color: #000000 !important;
            }
            .block, .row, tr, td {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        </style>
      </head>
      <body>
        <!-- CABECERA -->
        ${companyLogo ? \`
        <div class="logo">
          <img src="\${companyLogo}" alt="Logo" />
        </div>
        \` : \`
        <div class="header">
          <div class="header-business">\${ticketHeader}</div>
        </div>
        \`}
        
        <div class="header-title">\${ticketTitle}</div>
        
        <div class="ticket-number">Nº ${movement.operation_number || 'PENDIENTE'}</div>
        
        <hr class="separator" />
        
        <!-- BLOQUE A: DATOS DE LA OPERACIÓN -->
        <div class="block">
          <div class="block-title">A. Datos de la Operación</div>
          <div class="row">
            <span>Fecha:</span>
            <span class="row-value">${formatDate(movement.created_at)}</span>
          </div>
          <div class="row">
            <span>Hora:</span>
            <span class="row-value">${formatTime(movement.created_at)}</span>
          </div>
          <div class="row">
            <span>Categoría:</span>
            <span class="row-value">${categoryLabel}</span>
          </div>
          <div class="row">
            <span>Método de pago:</span>
            <span class="row-value">${paymentLabel}</span>
          </div>
          ${movement.customer_name ? `
          <div class="row">
            <span>Cliente:</span>
            <span class="row-value">${movement.customer_name}</span>
          </div>
          ` : ''}
        </div>
        
        <hr class="separator" />
        
        <!-- BLOQUE B: CONCEPTO -->
        <div class="block">
          <div class="block-title">B. Concepto</div>
          <div style="padding: 8px; background: #f5f5f5; border-radius: 4px;">
            ${movement.concept || '-'}
          </div>
          ${movement.notes ? `
          <div style="margin-top: 6px; font-size: 10px; color: #666;">
            Notas: ${movement.notes}
          </div>
          ` : ''}
        </div>
        
        <hr class="separator" />
        
        <!-- IMPORTE -->
        <div class="amount-box">
          <div class="amount-label">${isRefund ? 'IMPORTE ABONADO' : isExpense ? 'IMPORTE DE SALIDA' : 'IMPORTE COBRADO'}</div>
          <div class="amount-value">${amountPrefix}€${fmt(movement.amount)}</div>
        </div>
        
        <hr class="separator-double" />
        
        <div class="footer">
          ${ticketFooter}
        </div>
        
        ${ticketTerms ? `
        <div class="terms">
          ${ticketTerms}
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 10px; font-size: 8px; color: #999;">
          ─────────────────────────<br/>
          Copia del comprobante<br/>
          ─────────────────────────
        </div>
        
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  // ============ EDITAR MÉTODO DE PAGO ============
  const openEditPaymentDialog = (movement) => {
    setEditingMovement(movement);
    setNewPaymentMethod(movement.payment_method);
    setShowEditPaymentDialog(true);
  };

  const updatePaymentMethod = async () => {
    if (!editingMovement || !newPaymentMethod) return;
    
    try {
      await axios.patch(`${API}/cash/movements/${editingMovement.id}`, {
        payment_method: newPaymentMethod
      });
      
      toast.success("Método de pago actualizado");
      setShowEditPaymentDialog(false);
      setEditingMovement(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al actualizar");
    }
  };

  const closeCashRegister = async () => {
    if (arqueoForm.physical_cash === "" && arqueoForm.physical_cash !== 0) {
      toast.error("Debes introducir el efectivo contado (puede ser 0)");
      return;
    }

    const disc = getDiscrepancy();
    
    try {
      const closingData = {
        date: date,
        physical_cash: parseFloat(arqueoForm.physical_cash) || 0,
        card_total: parseFloat(arqueoForm.card_total) || 0,
        expected_cash: summary?.efectivo_esperado || 0,
        expected_card: summary?.tarjeta_esperada || 0,
        discrepancy_cash: disc.cash,
        discrepancy_card: disc.card,
        discrepancy_total: disc.total,
        notes: arqueoForm.notes
      };
      
      const response = await axios.post(`${API}/cash/close`, closingData);
      printClosingTicket({ ...closingData, ...response.data, ...summary });
      
      toast.success("Caja cerrada correctamente");
      setShowCloseDialog(false);
      setArqueoForm({ physical_cash: "", card_total: "", notes: "" });
      loadData();
      loadClosureHistory();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al cerrar caja");
    }
  };

  const printClosingTicket = (data) => {
    const win = window.open('', '_blank', 'width=320,height=700');
    if (!win) return;
    
    // Get stored settings for logo and branding
    const companyLogo = localStorage.getItem('companyLogo');
    const ticketHeader = localStorage.getItem('ticketHeader') || 'TIENDA DE ALQUILER DE ESQUÍ';
    
    // Format helper
    const fmt = (v) => (v || 0).toFixed(2);
    
    // Calculate discrepancies using SAME logic as modal
    const realCash = parseFloat(data.physical_cash) || 0;
    const realCard = parseFloat(data.card_total) || 0;
    const expectedCash = data.efectivo_esperado || 0;
    const expectedCard = data.tarjeta_esperada || 0;
    const discCash = realCash - expectedCash;
    const discCard = realCard - expectedCard;
    const discTotal = discCash + discCard;
    
    // Current timestamp
    const now = new Date();
    const printTime = now.toLocaleString('es-ES', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cierre de Caja - ${data.date}</title>
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
          .header { text-align: center; margin-bottom: 12px; }
          .header-title { font-size: 14px; font-weight: bold; letter-spacing: 1px; }
          .header-subtitle { font-size: 10px; margin-top: 4px; color: #333; }
          .header-info { font-size: 10px; margin-top: 6px; }
          
          .separator { 
            border: none; 
            border-top: 1px dashed #000; 
            margin: 10px 0; 
          }
          .separator-double { 
            border: none; 
            border-top: 2px solid #000; 
            margin: 10px 0; 
          }
          
          .block { margin: 10px 0; }
          .block-title { 
            font-weight: bold; 
            font-size: 11px; 
            text-transform: uppercase; 
            margin-bottom: 6px;
            letter-spacing: 0.5px;
          }
          
          .row { 
            display: flex; 
            justify-content: space-between; 
            margin: 4px 0; 
          }
          .row-label { }
          .row-value { font-weight: bold; text-align: right; }
          
          .row-total {
            display: flex; 
            justify-content: space-between;
            font-size: 13px;
            font-weight: bold;
            padding: 6px 0;
            margin: 6px 0;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
          }
          
          .highlight-box {
            background: #f0f0f0;
            padding: 8px;
            margin: 8px 0;
            border: 1px solid #000;
          }
          .highlight-box .row { margin: 3px 0; }
          
          .green { color: #000; }
          .red { color: #000; }
          .bold { font-weight: bold; }
          
          .result-box {
            border: 2px solid #000;
            padding: 10px;
            margin: 10px 0;
            text-align: center;
          }
          .result-label { font-size: 10px; margin-bottom: 4px; }
          .result-value { font-size: 16px; font-weight: bold; }
          
          .footer { 
            text-align: center; 
            margin-top: 15px; 
            font-size: 9px; 
            color: #333; 
          }
          
          @media print {
            body { width: 80mm; }
            @page { margin: 0; size: 80mm auto; }
          }
        </style>
      </head>
      <body>
        <!-- ========== CABECERA ========== -->
        ${companyLogo ? `
        <div class="logo">
          <img src="${companyLogo}" alt="Logo" />
        </div>
        ` : `
        <div class="header">
          <div style="font-size: 12px; font-weight: bold;">${ticketHeader}</div>
        </div>
        `}
        
        <div class="header">
          <div class="header-title">CIERRE DE CAJA</div>
          <div class="header-subtitle">${data.date} - Turno #${data.closure_number || 1}</div>
          <div class="header-info">
            Impreso: ${printTime}<br/>
            Responsable: ${data.closed_by || 'N/A'}
          </div>
        </div>
        
        <hr class="separator-double" />
        
        <!-- ========== BLOQUE A: RESUMEN ECONÓMICO ========== -->
        <div class="block">
          <div class="block-title">A. RESUMEN ECONÓMICO</div>
          
          <div class="row">
            <span class="row-label">(+) Fondo Caja Inicial:</span>
            <span class="row-value">€${fmt(data.opening_balance)}</span>
          </div>
          <div class="row">
            <span class="row-label">(+) Ventas Brutas:</span>
            <span class="row-value">€${fmt(data.ingresos_brutos)}</span>
          </div>
          <div class="row">
            <span class="row-label">(-) Devoluciones/Abonos:</span>
            <span class="row-value">€${fmt(data.total_salidas)}</span>
          </div>
          
          <div class="row-total">
            <span>(=) INGRESO NETO REAL:</span>
            <span>€${fmt(data.balance_neto_dia)}</span>
          </div>
        </div>
        
        <hr class="separator" />
        
        <!-- ========== BLOQUE B: DESGLOSE DE ARQUEO ========== -->
        <div class="block">
          <div class="block-title">B. DESGLOSE DE ARQUEO</div>
          
          <div class="highlight-box">
            <div style="font-weight: bold; margin-bottom: 6px;">EFECTIVO</div>
            <div class="row">
              <span>Fondo inicial:</span>
              <span>€${fmt(data.opening_balance)}</span>
            </div>
            <div class="row">
              <span>+ Ventas efectivo:</span>
              <span>€${fmt(data.by_payment_method?.cash?.income || 0)}</span>
            </div>
            <div class="row">
              <span>- Salidas efectivo:</span>
              <span>€${fmt((data.by_payment_method?.cash?.expense || 0) + (data.by_payment_method?.cash?.refund || 0))}</span>
            </div>
            <div class="row" style="border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px;">
              <span class="bold">ESPERADO EN CAJÓN:</span>
              <span class="bold">€${fmt(expectedCash)}</span>
            </div>
            <div class="row">
              <span>Contado físico:</span>
              <span class="bold">€${fmt(realCash)}</span>
            </div>
            <div class="row">
              <span>Descuadre:</span>
              <span class="bold ${discCash === 0 ? 'green' : 'red'}">${discCash >= 0 ? '+' : ''}€${fmt(discCash)}</span>
            </div>
          </div>
          
          <div class="highlight-box">
            <div style="font-weight: bold; margin-bottom: 6px;">TARJETA</div>
            <div class="row">
              <span>+ Ventas tarjeta:</span>
              <span>€${fmt(data.by_payment_method?.card?.income || 0)}</span>
            </div>
            <div class="row">
              <span>- Salidas tarjeta:</span>
              <span>€${fmt((data.by_payment_method?.card?.expense || 0) + (data.by_payment_method?.card?.refund || 0))}</span>
            </div>
            <div class="row" style="border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px;">
              <span class="bold">TOTAL TARJETA:</span>
              <span class="bold">€${fmt(expectedCard)}</span>
            </div>
            <div class="row">
              <span>En datáfono:</span>
              <span class="bold">€${fmt(realCard)}</span>
            </div>
            <div class="row">
              <span>Descuadre:</span>
              <span class="bold ${discCard === 0 ? 'green' : 'red'}">${discCard >= 0 ? '+' : ''}€${fmt(discCard)}</span>
            </div>
          </div>
        </div>
        
        <hr class="separator" />
        
        <!-- ========== BLOQUE C: ESTADÍSTICAS OPERATIVAS ========== -->
        <div class="block">
          <div class="block-title">C. ESTADÍSTICAS OPERATIVAS</div>
          <div class="row">
            <span>Nº de Operaciones:</span>
            <span class="bold">${data.movements_count || 0}</span>
          </div>
        </div>
        
        <hr class="separator" />
        
        <!-- ========== RESULTADO FINAL ========== -->
        <div class="result-box">
          <div class="result-label">DESCUADRE TOTAL</div>
          <div class="result-value ${discTotal === 0 ? 'green' : 'red'}">
            ${discTotal >= 0 ? '+' : ''}€${fmt(discTotal)}
          </div>
          <div style="font-size: 9px; margin-top: 4px;">
            ${Math.abs(discTotal) < 0.01 ? '✓ CUADRADO' : discTotal > 0 ? '↑ SOBRANTE' : '↓ FALTANTE'}
          </div>
        </div>
        
        ${data.notes ? `
        <div class="block">
          <div class="block-title">OBSERVACIONES</div>
          <div style="font-size: 10px; padding: 4px; background: #f9f9f9; border: 1px dashed #ccc;">
            ${data.notes}
          </div>
        </div>
        ` : ''}
        
        <hr class="separator-double" />
        
        <div class="footer">
          ─────────────────────────<br/>
          DOCUMENTO DE CIERRE DE CAJA<br/>
          Conservar con la recaudación<br/>
          ─────────────────────────
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const confirmRevertClosure = async () => {
    if (!revertClosureId) return;
    try {
      await axios.delete(`${API}/cash/closings/${revertClosureId}`);
      toast.success("Cierre reabierto correctamente");
      loadClosureHistory();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al reabrir caja");
    } finally {
      setRevertClosureId(null);
    }
  };

  const exportToCSV = () => {
    if (movements.length === 0) {
      toast.error("No hay movimientos para exportar");
      return;
    }
    const headers = "Fecha,Hora,Tipo,Concepto,Método,Importe\n";
    const rows = movements.map(m => {
      const dateStr = m.created_at.split('T')[0];
      const time = m.created_at.split('T')[1].substring(0, 5);
      const type = m.movement_type === 'income' ? 'Entrada' : m.movement_type === 'refund' ? 'Devolución' : 'Salida';
      return `${dateStr},${time},${type},"${m.concept}",${m.payment_method},${m.amount}`;
    }).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caja_${date}.csv`;
    a.click();
    toast.success("Exportado correctamente");
  };

  const changeDate = (days) => {
    const current = new Date(date);
    current.setDate(current.getDate() + days);
    setDate(current.toISOString().split('T')[0]);
  };

  const getMovementTypeBadge = (type) => {
    switch(type) {
      case 'income': return <Badge className="bg-emerald-100 text-emerald-700">Entrada</Badge>;
      case 'expense': return <Badge className="bg-red-100 text-red-700">Salida</Badge>;
      case 'refund': return <Badge className="bg-orange-100 text-orange-700">Devolución</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const disc = getDiscrepancy();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`p-6 lg:p-8 space-y-6 min-h-screen ${darkMode ? 'bg-[#121212]' : 'bg-slate-50'}`} data-testid="cash-register">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Wallet className="inline-block h-8 w-8 mr-2" />
            Gestión de Caja
          </h1>
          <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Control financiero diario
          </p>
        </div>
        
        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => changeDate(-1)} data-testid="prev-day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${darkMode ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-slate-200'}`}>
            <Calendar className="h-4 w-4 text-slate-500" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-0 p-0 h-auto w-[130px] text-center font-medium"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => changeDate(1)} data-testid="next-day">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="today" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Hoy
          </TabsTrigger>
          <TabsTrigger value="closures" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Cierres Pasados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6">
          {/* ============ PANEL SUPERIOR: 3 KPIs ============ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* KPI 1: Ingresos Brutos */}
            <Card className={`${darkMode ? 'bg-[#1a1a1a] border-[#333]' : 'border-slate-200'}`} data-testid="kpi-ingresos">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Ingresos Brutos
                    </p>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      €{(summary?.ingresos_brutos || 0).toFixed(2)}
                    </p>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      Ventas y suplementos
                    </p>
                  </div>
                  <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${darkMode ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
                    <TrendingUp className={`h-7 w-7 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 2: Salidas y Devoluciones */}
            <Card className={`${darkMode ? 'bg-[#1a1a1a] border-[#333]' : 'border-slate-200'}`} data-testid="kpi-salidas">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Devoluciones y Salidas
                    </p>
                    <p className="text-3xl font-bold text-red-600">
                      -€{(summary?.total_salidas || 0).toFixed(2)}
                    </p>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      Devoluciones, ajustes y gastos
                    </p>
                  </div>
                  <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${darkMode ? 'bg-red-900/30' : 'bg-red-100'}`}>
                    <TrendingDown className={`h-7 w-7 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: Balance Neto del Día */}
            <Card className={`border-2 ${(summary?.balance_neto_dia || 0) >= 0 ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'} ${darkMode ? 'bg-opacity-10' : ''}`} data-testid="kpi-balance">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      Balance Neto del Día
                    </p>
                    <p className={`text-3xl font-bold ${(summary?.balance_neto_dia || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      €{(summary?.balance_neto_dia || 0).toFixed(2)}
                    </p>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Lo que has ganado/perdido hoy
                    </p>
                  </div>
                  <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${(summary?.balance_neto_dia || 0) >= 0 ? 'bg-emerald-200' : 'bg-red-200'}`}>
                    <Scale className={`h-7 w-7 ${(summary?.balance_neto_dia || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ============ PANEL SECUNDARIO: ARQUEO ============ */}
          <Card className={`${darkMode ? 'bg-[#1a1a1a] border-[#333]' : 'border-slate-200'}`} data-testid="arqueo-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Desglose para Arqueo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Fondo Inicial */}
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Fondo Inicial (Apertura)
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    €{(summary?.opening_balance || 0).toFixed(2)}
                  </p>
                </div>

                {/* Efectivo Esperado en Cajón */}
                <div className={`p-4 rounded-xl border-2 ${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Banknote className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <p className={`text-xs font-bold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      EFECTIVO EN CAJÓN
                    </p>
                  </div>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                    €{(summary?.efectivo_esperado || 0).toFixed(2)}
                  </p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    Fondo + (Entradas - Salidas) efectivo
                  </p>
                </div>

                {/* Total Tarjeta */}
                <div className={`p-4 rounded-xl border-2 ${darkMode ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className={`h-4 w-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                    <p className={`text-xs font-bold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                      TOTAL TARJETA
                    </p>
                  </div>
                  <p className={`text-2xl font-bold ${(summary?.tarjeta_esperada || 0) >= 0 ? (darkMode ? 'text-purple-300' : 'text-purple-800') : 'text-red-600'}`}>
                    {(summary?.tarjeta_esperada || 0) < 0 ? '-' : ''}€{Math.abs(summary?.tarjeta_esperada || 0).toFixed(2)}
                  </p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                    Entradas - Salidas tarjeta
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Status + Actions */}
          {!activeSession ? (
            <Card className="border-2 border-amber-300 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-amber-900">⚠️ No hay caja abierta</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Debes abrir la caja para registrar movimientos. Los cobros sin caja abierta no se registrarán.
                    </p>
                    <Button 
                      onClick={() => setShowOpenSessionDialog(true)}
                      className="mt-3 bg-amber-600 hover:bg-amber-700"
                      data-testid="open-cash-btn"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Abrir Caja Ahora
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className={`border ${darkMode ? 'bg-emerald-900/20 border-emerald-700' : 'bg-emerald-50 border-emerald-200'}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className={`h-5 w-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <div>
                      <p className={`font-semibold ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                        ✅ Caja abierta - Turno #{activeSession.session_number}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        Abierta por {activeSession.opened_by} el {new Date(activeSession.opened_at).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => { setMovementType("income"); setShowAddDialog(true); }} data-testid="new-income-btn">
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Entrada
                    </Button>
                    <Button variant="outline" onClick={() => { setMovementType("expense"); setShowAddDialog(true); }} data-testid="new-expense-btn">
                      <ArrowDownLeft className="h-4 w-4 mr-2" />
                      Salida
                    </Button>
                    <Button variant="outline" onClick={exportToCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button variant="destructive" onClick={() => setShowCloseDialog(true)} data-testid="close-cash-btn">
                      <Lock className="h-4 w-4 mr-2" />
                      Cerrar Caja
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Movements Table */}
          <Card className={`${darkMode ? 'bg-[#1a1a1a] border-[#333]' : 'border-slate-200'}`}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-lg ${darkMode ? 'text-white' : ''}`}>
                Movimientos del Día ({movements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <div className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay movimientos registrados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº Ticket</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-sm font-bold text-blue-600">
                            {m.operation_number || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {m.created_at.split('T')[1]?.substring(0, 5) || '-'}
                          </TableCell>
                          <TableCell>{getMovementTypeBadge(m.movement_type)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{m.concept}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {PAYMENT_METHODS.find(p => p.value === m.payment_method)?.label || m.payment_method}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-bold ${
                            m.movement_type === 'income' ? 'text-emerald-600' : 
                            m.movement_type === 'refund' ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {m.movement_type === 'income' ? '+' : '-'}€{m.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditPaymentDialog(m)}
                                title="Editar método de pago"
                                data-testid={`edit-payment-${m.id}`}
                              >
                                <Pencil className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => printMovementTicket(m)}
                                title="Imprimir ticket"
                                data-testid={`print-ticket-${m.id}`}
                              >
                                <Printer className="h-4 w-4 text-slate-500 hover:text-emerald-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Cierres Pasados */}
        <TabsContent value="closures">
          <Card className={`${darkMode ? 'bg-[#1a1a1a] border-[#333]' : 'border-slate-200'}`}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
                <Lock className="h-5 w-5" />
                Histórico de Cierres de Caja
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historicLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : closureHistory.length === 0 ? (
                <div className={`text-center py-12 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Lock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay cierres registrados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Turno</TableHead>
                        <TableHead>Balance Neto</TableHead>
                        <TableHead className="text-right">Efectivo Esp.</TableHead>
                        <TableHead className="text-right">Efectivo Real</TableHead>
                        <TableHead className="text-right">Descuadre</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closureHistory.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-semibold">{c.date}</TableCell>
                          <TableCell>
                            <Badge variant="outline">#{c.closure_number || 1}</Badge>
                          </TableCell>
                          <TableCell className={`font-bold ${(c.balance_neto_dia || c.total_income - c.total_expense - c.total_refunds || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            €{(c.balance_neto_dia || (c.total_income || 0) - (c.total_expense || 0) - (c.total_refunds || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">€{(c.expected_cash || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">€{(c.physical_cash || 0).toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-bold ${(c.discrepancy_total || 0) === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            €{(c.discrepancy_total || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" onClick={() => printClosingTicket(c)}>
                                <Printer className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                onClick={() => setRevertClosureId(c.id)}
                              >
                                <Undo2 className="h-3 w-3 mr-1" />
                                Reabrir
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============ DIALOGS ============ */}

      {/* Open Session Dialog */}
      <Dialog open={showOpenSessionDialog} onOpenChange={setShowOpenSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
            <DialogDescription>Introduce el fondo de caja inicial</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Fondo de Caja (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="100.00"
                className="text-xl font-bold mt-1"
                autoFocus
                data-testid="opening-balance-input"
              />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenSessionDialog(false)}>Cancelar</Button>
            <Button onClick={openCashSession} data-testid="confirm-open-cash">Abrir Caja</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Movement Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {movementType === "income" ? (
                <><ArrowUpRight className="h-5 w-5 text-emerald-600" /> Nueva Entrada</>
              ) : (
                <><ArrowDownLeft className="h-5 w-5 text-red-600" /> Nueva Salida</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Importe (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={newMovement.amount}
                onChange={(e) => setNewMovement({ ...newMovement, amount: e.target.value })}
                className="text-xl font-bold mt-1"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Método de pago *</Label>
                <Select value={newMovement.payment_method} onValueChange={(v) => setNewMovement({ ...newMovement, payment_method: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoría *</Label>
                <Select value={newMovement.category} onValueChange={(v) => setNewMovement({ ...newMovement, category: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(movementType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Concepto *</Label>
              <Input
                value={newMovement.concept}
                onChange={(e) => setNewMovement({ ...newMovement, concept: e.target.value })}
                className="mt-1"
                placeholder="Describe la operación..."
              />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={newMovement.notes}
                onChange={(e) => setNewMovement({ ...newMovement, notes: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={createMovement} className={movementType === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Cash Register Dialog - CORRECTED */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Cerrar Caja - Arqueo
            </DialogTitle>
            <DialogDescription>
              Introduce el efectivo y tarjeta contados físicamente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Resumen del día */}
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <p className="text-sm font-semibold mb-3">📊 Balance del Día</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-slate-500">Ingresos</p>
                  <p className="font-bold text-emerald-600">€{(summary?.ingresos_brutos || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Salidas</p>
                  <p className="font-bold text-red-600">-€{(summary?.total_salidas || 0).toFixed(2)}</p>
                </div>
                <div className={`p-2 rounded-lg ${(summary?.balance_neto_dia || 0) >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  <p className="text-xs text-slate-600">Balance Neto</p>
                  <p className={`font-bold text-lg ${(summary?.balance_neto_dia || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    €{(summary?.balance_neto_dia || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Arqueo Efectivo */}
            <div className={`p-4 rounded-xl border-2 ${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Banknote className="h-5 w-5 text-blue-600" />
                <p className="font-bold text-blue-800">EFECTIVO</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Fondo inicial:</span>
                  <span className="font-semibold">€{(summary?.opening_balance || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-blue-800">
                  <span>Esperado en cajón:</span>
                  <span>€{(summary?.efectivo_esperado || 0).toFixed(2)}</span>
                </div>
                <div>
                  <Label className="text-blue-700">Efectivo contado físicamente:</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={arqueoForm.physical_cash}
                    onChange={(e) => setArqueoForm({ ...arqueoForm, physical_cash: e.target.value })}
                    className="mt-1 text-lg font-bold"
                    placeholder="0.00"
                    data-testid="physical-cash-input"
                  />
                </div>
                {arqueoForm.physical_cash !== "" && (
                  <div className={`p-2 rounded-lg text-center ${disc.cash === 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <span className={`font-bold ${disc.cash === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      Descuadre: €{disc.cash.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Arqueo Tarjeta */}
            <div className={`p-4 rounded-xl border-2 ${darkMode ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-5 w-5 text-purple-600" />
                <p className="font-bold text-purple-800">TARJETA</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-lg font-bold text-purple-800">
                  <span>Esperado:</span>
                  <span>€{(summary?.tarjeta_esperada || 0).toFixed(2)}</span>
                </div>
                <div>
                  <Label className="text-purple-700">Total en datáfono:</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={arqueoForm.card_total}
                    onChange={(e) => setArqueoForm({ ...arqueoForm, card_total: e.target.value })}
                    className="mt-1 text-lg font-bold"
                    placeholder="0.00"
                    data-testid="card-total-input"
                  />
                </div>
                {arqueoForm.card_total !== "" && (
                  <div className={`p-2 rounded-lg text-center ${disc.card === 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <span className={`font-bold ${disc.card === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      Descuadre: €{disc.card.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notas */}
            <div>
              <Label>Notas del cierre (opcional)</Label>
              <Textarea
                value={arqueoForm.notes}
                onChange={(e) => setArqueoForm({ ...arqueoForm, notes: e.target.value })}
                className="mt-1"
                rows={2}
                placeholder="Incidencias, observaciones..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancelar</Button>
            <Button onClick={closeCashRegister} className="bg-red-600 hover:bg-red-700" data-testid="confirm-close-cash">
              Cerrar Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Closure Confirmation */}
      <Dialog open={!!revertClosureId} onOpenChange={() => setRevertClosureId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Reabrir este cierre?</DialogTitle>
            <DialogDescription>
              Esta acción eliminará el registro de cierre y reabrirá la sesión de caja.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertClosureId(null)}>Cancelar</Button>
            <Button onClick={confirmRevertClosure} className="bg-orange-600 hover:bg-orange-700">
              Reabrir Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Method Dialog */}
      <Dialog open={showEditPaymentDialog} onOpenChange={setShowEditPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Cambiar Método de Pago
            </DialogTitle>
            <DialogDescription>
              Modifica el método de pago de esta operación
            </DialogDescription>
          </DialogHeader>
          {editingMovement && (
            <div className="space-y-4 py-4">
              {/* Movement Info */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Ticket:</span>
                    <span className="ml-2 font-bold text-blue-600">{editingMovement.operation_number || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Importe:</span>
                    <span className={`ml-2 font-bold ${
                      editingMovement.movement_type === 'income' ? 'text-emerald-600' : 
                      editingMovement.movement_type === 'refund' ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      €{editingMovement.amount?.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-slate-500">Concepto:</span>
                  <span className="ml-2">{editingMovement.concept}</span>
                </div>
              </div>

              {/* Current vs New Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <Label className="text-xs text-slate-500">Método Actual</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {editingMovement.payment_method === 'cash' ? (
                      <Banknote className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    )}
                    <span className="font-semibold">
                      {PAYMENT_METHODS.find(p => p.value === editingMovement.payment_method)?.label}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg border-2 ${
                  newPaymentMethod !== editingMovement.payment_method 
                    ? 'border-blue-500 bg-blue-50' 
                    : darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <Label className="text-xs text-slate-500">Nuevo Método</Label>
                  <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                    <SelectTrigger className="mt-1 border-0 p-0 h-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>
                          <div className="flex items-center gap-2">
                            {m.value === 'cash' ? (
                              <Banknote className="h-4 w-4" />
                            ) : (
                              <CreditCard className="h-4 w-4" />
                            )}
                            {m.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newPaymentMethod !== editingMovement.payment_method && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800">
                    ⚠️ Este cambio afectará al desglose por método de pago en el arqueo de caja.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={updatePaymentMethod}
              disabled={newPaymentMethod === editingMovement?.payment_method}
              data-testid="confirm-edit-payment"
            >
              Guardar Cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
