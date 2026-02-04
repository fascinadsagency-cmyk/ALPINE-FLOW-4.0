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
import { printTicket, getStoredSettings } from "@/lib/ticketGenerator";
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
  Pencil,
  Eye,
  EyeOff
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
  
  // Privacy visibility state - all hidden by default (accordion style)
  const [visibleMetrics, setVisibleMetrics] = useState({
    ingresos: false,
    gastos: false,
    balance: false,
    efectivo: false,
    tarjeta: false,
    fondo: false
  });
  
  // Master visibility toggle - show/hide all at once
  const [allVisible, setAllVisible] = useState(false);
  
  // Toggle visibility of a specific metric
  const toggleMetricVisibility = (metric) => {
    setVisibleMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  };
  
  // Toggle all metrics visibility at once (master toggle)
  const toggleAllVisibility = () => {
    const newState = !allVisible;
    setAllVisible(newState);
    setVisibleMetrics({
      ingresos: newState,
      gastos: newState,
      balance: newState,
      efectivo: newState,
      tarjeta: newState,
      fondo: newState
    });
  };
  
  // Format value for display - show masked or real value with smooth transition
  const formatValue = (value, isVisible, prefix = '€') => {
    const formatted = typeof value === 'number' ? `${prefix}${Math.abs(value).toFixed(2)}` : value;
    return isVisible ? formatted : '••••••';
  };
  
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
  
  // ============ HISTORIAL / BUSCADOR STATE ============
  const [historySearch, setHistorySearch] = useState({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    dateTo: new Date().toISOString().split('T')[0],
    query: "",
    paymentMethod: "all"
  });
  const [historyResults, setHistoryResults] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const HISTORY_PAGE_SIZE = 20;
  
  // Detail modal for history
  const [showHistoryDetailDialog, setShowHistoryDetailDialog] = useState(false);
  const [selectedHistoryMovement, setSelectedHistoryMovement] = useState(null);

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

  // ============ BÚSQUEDA HISTÓRICA ============
  const searchHistory = async (page = 1) => {
    setHistoryLoading(true);
    setHistoryPage(page);
    try {
      const params = new URLSearchParams({
        date_from: historySearch.dateFrom,
        date_to: historySearch.dateTo,
        skip: ((page - 1) * HISTORY_PAGE_SIZE).toString(),
        limit: HISTORY_PAGE_SIZE.toString()
      });
      
      if (historySearch.query.trim()) {
        params.append('search', historySearch.query.trim());
      }
      if (historySearch.paymentMethod !== 'all') {
        params.append('payment_method', historySearch.paymentMethod);
      }
      
      const res = await axios.get(`${API}/cash/movements/search?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      setHistoryResults(res.data.results || []);
      setHistoryTotal(res.data.total || 0);
    } catch (error) {
      console.error("Error searching history:", error);
      toast.error("Error al buscar en el historial");
      setHistoryResults([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryDetail = (movement) => {
    setSelectedHistoryMovement(movement);
    setShowHistoryDetailDialog(true);
  };

  const reprintHistoryTicket = async (movement) => {
    try {
      // Get settings for ticket
      const settings = getStoredSettings();
      
      // Prepare ticket data
      const ticketData = {
        type: movement.type === 'income' ? 'sale' : 'refund',
        operationNumber: movement.operation_number || `M-${movement.id?.substring(0,8)}`,
        date: movement.created_at,
        customerName: movement.customer_name || 'Cliente',
        customerDni: movement.customer_dni || '-',
        items: movement.items || [{ 
          name: movement.concept || movement.description || 'Movimiento',
          subtotal: movement.amount,
          days: 1
        }],
        subtotal: movement.amount,
        total: movement.amount,
        paymentMethod: movement.payment_method,
        paidAmount: movement.amount,
        notes: movement.notes,
        isReprint: true
      };
      
      await printTicket(ticketData, settings);
      toast.success("Ticket reimpreso correctamente");
    } catch (error) {
      console.error("Error reprinting ticket:", error);
      toast.error("Error al reimprimir ticket");
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

  // ============ IMPRIMIR TICKET DE MOVIMIENTO (USA GENERADOR MAESTRO) ============
  const printMovementTicket = async (movement) => {
    // Obtener etiqueta de categoría
    const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
    const categoryLabel = allCategories.find(c => c.value === movement.category)?.label || movement.category || '-';
    
    // Determinar el tipo de ticket según la categoría y tipo de movimiento
    const isRentalCategory = movement.category === 'rental';
    let rentalItems = movement.rental_items || [];
    let rentalDays = movement.rental_days;
    let startDate = movement.rental_start_date;
    let endDate = movement.rental_end_date;
    
    // FALLBACK: Si es un alquiler pero no tiene items guardados, intentar recuperarlos del alquiler original
    if (isRentalCategory && rentalItems.length === 0 && movement.reference_id) {
      try {
        const response = await axios.get(`${API}/rentals/${movement.reference_id}`);
        if (response.data) {
          const rental = response.data;
          // Mapear items del alquiler
          rentalItems = (rental.items || []).map(item => ({
            name: `${item.item_type || 'Artículo'} ${item.brand || ''}`.trim(),
            size: item.size || '',
            internal_code: item.internal_code || item.barcode || '',
            days: rental.days || 1,
            subtotal: item.subtotal || 0,
            item_type: item.item_type
          }));
          rentalDays = rental.days;
          startDate = rental.start_date;
          endDate = rental.end_date;
        }
      } catch (error) {
        console.log('No se pudo recuperar items del alquiler original:', error);
        // Continuar con ticket de movimiento simple
      }
    }
    
    const hasRentalItems = rentalItems.length > 0;
    
    // Preparar datos para el generador maestro
    const ticketData = {
      operationNumber: movement.operation_number,
      date: movement.created_at,
      createdAt: movement.created_at,
      movementType: movement.movement_type,
      category: movement.category,
      categoryLabel: categoryLabel,
      concept: movement.concept,
      notes: movement.notes,
      amount: movement.amount,
      paymentMethod: movement.payment_method,
      customerName: movement.customer_name,
      customer: movement.customer_name,
      // Datos de alquiler (si existen)
      items: rentalItems,
      days: rentalDays || null,
      startDate: startDate || null,
      endDate: endDate || null,
      total: movement.amount
    };
    
    // Usar generador maestro - tipo 'rental' si tiene items, sino 'movement'
    const ticketType = (isRentalCategory && hasRentalItems) ? 'rental' : 'movement';
    
    const success = printTicket({
      ticketType: ticketType,
      data: ticketData
    });
    
    if (!success) {
      toast.error("No se pudo abrir ventana de impresión. Permite los popups.");
    }
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

  // ============ IMPRIMIR TICKET DE CIERRE (USA GENERADOR MAESTRO) ============
  const printClosingTicket = (data) => {
    // Calcular descuadres usando la misma lógica del modal
    const realCash = parseFloat(data.physical_cash) || 0;
    const realCard = parseFloat(data.card_total) || 0;
    const expectedCash = data.efectivo_esperado || 0;
    const expectedCard = data.tarjeta_esperada || 0;
    const discCash = realCash - expectedCash;
    const discCard = realCard - expectedCard;
    const discTotal = discCash + discCard;
    
    // Preparar datos para el generador maestro
    const ticketData = {
      date: data.date,
      closureNumber: data.closure_number || 1,
      shiftNumber: data.closure_number || 1,
      closedBy: data.closed_by || 'N/A',
      openingBalance: data.opening_balance || 0,
      totalIncome: data.ingresos_brutos || 0,
      ingresosBrutos: data.ingresos_brutos || 0,
      totalRefunds: data.total_salidas || 0,
      totalExpense: 0, // gastos ya incluidos en total_salidas
      devoluciones: data.total_salidas || 0,
      gastos: 0,
      netIncome: data.balance_neto_dia || 0,
      balanceNeto: data.balance_neto_dia || 0,
      expectedCash: expectedCash,
      efectivoEsperado: expectedCash,
      countedCash: realCash,
      physicalCash: realCash,
      expectedCard: expectedCard,
      tarjetaEsperada: expectedCard,
      countedCard: realCard,
      cardTotal: realCard,
      discrepancyCash: discCash,
      discrepancyCard: discCard,
      discrepancyTotal: discTotal,
      totalOperations: data.movements_count || 0,
      notes: data.notes
    };
    
    // Usar generador maestro
    const success = printTicket({
      ticketType: 'closing',
      data: ticketData
    });
    
    if (!success) {
      toast.error("No se pudo abrir ventana de impresión. Permite los popups.");
    }
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
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="today" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Caja Diaria
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="closures" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Cierres
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-3">
          {/* ============ BOTÓN MAESTRO DE VISIBILIDAD ============ */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllVisibility}
              className={`gap-2 ${allVisible ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100' : ''}`}
              data-testid="toggle-all-visibility"
            >
              {allVisible ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Ocultar Todo
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Mostrar Todo
                </>
              )}
            </Button>
          </div>

          {/* ============ PANEL SUPERIOR: 3 KPIs (Sin Blur - Sistema Acordeón) ============ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* KPI 1: Ingresos Brutos */}
            <Card className={`${darkMode ? 'bg-[#1a1a1a] border-[#333]' : 'border-slate-200'} transition-all duration-200`} data-testid="kpi-ingresos">
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Ingresos
                      </p>
                      <button 
                        onClick={() => toggleMetricVisibility('ingresos')}
                        className={`p-1.5 rounded-md transition-all duration-200 ${
                          visibleMetrics.ingresos 
                            ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' 
                            : `${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-400'}`
                        }`}
                        title={visibleMetrics.ingresos ? 'Ocultar' : 'Mostrar'}
                      >
                        {visibleMetrics.ingresos ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className={`text-2xl font-bold transition-all duration-300 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {visibleMetrics.ingresos ? (
                        `€${(summary?.ingresos_brutos || 0).toFixed(2)}`
                      ) : (
                        <span className="text-slate-400 tracking-wider">••••••</span>
                      )}
                    </p>
                  </div>
                  <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${darkMode ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
                    <TrendingUp className={`h-5 w-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 2: Salidas y Devoluciones */}
            <Card className={`${darkMode ? 'bg-[#1a1a1a] border-[#333]' : 'border-slate-200'} transition-all duration-200`} data-testid="kpi-salidas">
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Salidas
                      </p>
                      <button 
                        onClick={() => toggleMetricVisibility('gastos')}
                        className={`p-1.5 rounded-md transition-all duration-200 ${
                          visibleMetrics.gastos 
                            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                            : `${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-400'}`
                        }`}
                        title={visibleMetrics.gastos ? 'Ocultar' : 'Mostrar'}
                      >
                        {visibleMetrics.gastos ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className={`text-2xl font-bold text-red-600 transition-all duration-300`}>
                      {visibleMetrics.gastos ? (
                        `-€${(summary?.total_salidas || 0).toFixed(2)}`
                      ) : (
                        <span className="text-slate-400 tracking-wider">••••••</span>
                      )}
                    </p>
                  </div>
                  <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${darkMode ? 'bg-red-900/30' : 'bg-red-100'}`}>
                    <TrendingDown className={`h-5 w-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: Balance Neto del Día */}
            <Card className={`border-2 ${(summary?.balance_neto_dia || 0) >= 0 ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'} ${darkMode ? 'bg-opacity-10' : ''} transition-all duration-200`} data-testid="kpi-balance">
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        Balance Neto
                      </p>
                      <button 
                        onClick={() => toggleMetricVisibility('balance')}
                        className={`p-1.5 rounded-md transition-all duration-200 ${
                          visibleMetrics.balance 
                            ? `${(summary?.balance_neto_dia || 0) >= 0 ? 'bg-emerald-200 text-emerald-700' : 'bg-red-200 text-red-700'} hover:opacity-80` 
                            : 'hover:bg-white/50 text-slate-500'
                        }`}
                        title={visibleMetrics.balance ? 'Ocultar' : 'Mostrar'}
                      >
                        {visibleMetrics.balance ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className={`text-2xl font-bold transition-all duration-300 ${(summary?.balance_neto_dia || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {visibleMetrics.balance ? (
                        `€${(summary?.balance_neto_dia || 0).toFixed(2)}`
                      ) : (
                        <span className="text-slate-400 tracking-wider">••••••</span>
                      )}
                    </p>
                  </div>
                  <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${(summary?.balance_neto_dia || 0) >= 0 ? 'bg-emerald-200' : 'bg-red-200'}`}>
                    <Scale className={`h-5 w-5 ${(summary?.balance_neto_dia || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ============ PANEL SECUNDARIO: ARQUEO (Compacto) ============ */}
          <Card className={`${darkMode ? 'bg-[#1a1a1a] border-[#333]' : 'border-slate-200'}`} data-testid="arqueo-panel">
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Desglose para Arqueo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {/* Fondo Inicial */}
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Fondo Inicial
                    </p>
                    <button 
                      onClick={() => toggleMetricVisibility('fondo')}
                      className="p-0.5 rounded hover:bg-slate-200/50"
                    >
                      {visibleMetrics.fondo ? <Eye className="h-3 w-3 text-slate-400" /> : <EyeOff className="h-3 w-3 text-slate-400" />}
                    </button>
                  </div>
                  <p className={`text-lg font-bold mt-0.5 ${darkMode ? 'text-slate-200' : 'text-slate-700'} ${!visibleMetrics.fondo ? 'blur-sm select-none' : ''}`}>
                    €{(summary?.opening_balance || 0).toFixed(2)}
                  </p>
                </div>

                {/* Efectivo Esperado en Cajón */}
                <div className={`p-3 rounded-lg border-2 ${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-center gap-1.5">
                    <Banknote className={`h-3.5 w-3.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <p className={`text-xs font-bold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      EFECTIVO
                    </p>
                    <button 
                      onClick={() => toggleMetricVisibility('efectivo')}
                      className="p-0.5 rounded hover:bg-blue-200/50"
                    >
                      {visibleMetrics.efectivo ? <Eye className="h-3 w-3 text-blue-400" /> : <EyeOff className="h-3 w-3 text-blue-400" />}
                    </button>
                  </div>
                  <p className={`text-lg font-bold ${darkMode ? 'text-blue-300' : 'text-blue-800'} ${!visibleMetrics.efectivo ? 'blur-sm select-none' : ''}`}>
                    €{(summary?.efectivo_esperado || 0).toFixed(2)}
                  </p>
                </div>

                {/* Total Tarjeta */}
                <div className={`p-3 rounded-lg border-2 ${darkMode ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'}`}>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className={`h-3.5 w-3.5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                    <p className={`text-xs font-bold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                      TARJETA
                    </p>
                    <button 
                      onClick={() => toggleMetricVisibility('tarjeta')}
                      className="p-0.5 rounded hover:bg-purple-200/50"
                    >
                      {visibleMetrics.tarjeta ? <Eye className="h-3 w-3 text-purple-400" /> : <EyeOff className="h-3 w-3 text-purple-400" />}
                    </button>
                  </div>
                  <p className={`text-lg font-bold ${(summary?.tarjeta_esperada || 0) >= 0 ? (darkMode ? 'text-purple-300' : 'text-purple-800') : 'text-red-600'} ${!visibleMetrics.tarjeta ? 'blur-sm select-none' : ''}`}>
                    {(summary?.tarjeta_esperada || 0) < 0 ? '-' : ''}€{Math.abs(summary?.tarjeta_esperada || 0).toFixed(2)}
                  </p>
                </div>

                {/* Movimientos count */}
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Movimientos
                  </p>
                  <p className={`text-lg font-bold mt-0.5 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    {summary?.movements_count || 0}
                  </p>
                </div>

                {/* Session status */}
                <div className={`p-3 rounded-lg ${activeSession ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'}`}>
                  <p className={`text-xs font-medium ${activeSession ? 'text-emerald-700' : 'text-amber-700'}`}>
                    Estado
                  </p>
                  <p className={`text-lg font-bold mt-0.5 ${activeSession ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {activeSession ? '✓ Abierta' : '⚠ Cerrada'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Status + Actions */}
          {!activeSession ? (
            <Card className="border-2 border-amber-300 bg-amber-50">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-amber-900 text-sm">No hay caja abierta</p>
                    <p className="text-xs text-amber-800">
                      Los cobros sin caja abierta no se registrarán.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowOpenSessionDialog(true)}
                    className="bg-amber-600 hover:bg-amber-700"
                    size="sm"
                    data-testid="open-cash-btn"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Abrir Caja
                  </Button>
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
            <CardHeader className="py-3 px-5">
              <CardTitle className={`text-base flex items-center justify-between ${darkMode ? 'text-white' : ''}`}>
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Movimientos del Día ({movements.length})
                </span>
                {movements.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    Últimos registros
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-4">
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

        {/* TAB 2: HISTORIAL / BUSCADOR */}
        <TabsContent value="history" className="space-y-4">
          {/* Panel de Filtros */}
          <Card className={`${darkMode ? 'bg-[#1a1a1a] border-[#333]' : 'border-slate-200'}`}>
            <CardHeader className="py-4">
              <CardTitle className={`text-lg flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
                <Search className="h-5 w-5" />
                Buscador de Tickets y Movimientos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                {/* Fecha Desde */}
                <div>
                  <Label className="text-sm">Desde</Label>
                  <Input
                    type="date"
                    value={historySearch.dateFrom}
                    onChange={(e) => setHistorySearch(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                
                {/* Fecha Hasta */}
                <div>
                  <Label className="text-sm">Hasta</Label>
                  <Input
                    type="date"
                    value={historySearch.dateTo}
                    onChange={(e) => setHistorySearch(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                
                {/* Búsqueda de Texto */}
                <div className="md:col-span-2">
                  <Label className="text-sm">Buscar (Cliente, Ticket, Concepto)</Label>
                  <Input
                    placeholder="Ej: Juan García, A000123, Alquiler..."
                    value={historySearch.query}
                    onChange={(e) => setHistorySearch(prev => ({ ...prev, query: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && searchHistory(1)}
                    className="mt-1"
                  />
                </div>
                
                {/* Botón Buscar */}
                <div>
                  <Button 
                    onClick={() => searchHistory(1)}
                    disabled={historyLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {historyLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Buscar
                  </Button>
                </div>
              </div>
              
              {/* Filtro de Método de Pago */}
              <div className="flex gap-2 mt-4">
                <Button 
                  variant={historySearch.paymentMethod === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setHistorySearch(prev => ({ ...prev, paymentMethod: 'all' }))}
                >
                  Todos
                </Button>
                <Button 
                  variant={historySearch.paymentMethod === 'cash' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setHistorySearch(prev => ({ ...prev, paymentMethod: 'cash' }))}
                  className={historySearch.paymentMethod === 'cash' ? 'bg-emerald-600' : ''}
                >
                  <Banknote className="h-4 w-4 mr-1" />
                  Efectivo
                </Button>
                <Button 
                  variant={historySearch.paymentMethod === 'card' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setHistorySearch(prev => ({ ...prev, paymentMethod: 'card' }))}
                  className={historySearch.paymentMethod === 'card' ? 'bg-purple-600' : ''}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Tarjeta
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resultados */}
          <Card className={`${darkMode ? 'bg-[#1a1a1a] border-[#333]' : 'border-slate-200'}`}>
            <CardHeader className="py-3 px-5">
              <CardTitle className={`text-base flex items-center justify-between ${darkMode ? 'text-white' : ''}`}>
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Resultados
                  {historyTotal > 0 && (
                    <Badge variant="secondary">{historyTotal} encontrados</Badge>
                  )}
                </span>
                {historyResults.length > 0 && (
                  <span className="text-sm font-normal text-slate-500">
                    Página {historyPage} de {Math.ceil(historyTotal / HISTORY_PAGE_SIZE)}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {historyLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : historyResults.length === 0 ? (
                <div className={`text-center py-12 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Usa los filtros y pulsa "Buscar" para encontrar movimientos</p>
                  <p className="text-sm mt-1">Puedes buscar por nombre de cliente, número de ticket o concepto</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">Fecha/Hora</TableHead>
                          <TableHead className="w-[100px]">ID Ticket</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead className="w-[80px]">Método</TableHead>
                          <TableHead className="w-[100px] text-right">Importe</TableHead>
                          <TableHead className="w-[80px]">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyResults.map((mov) => (
                          <TableRow 
                            key={mov.id} 
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() => openHistoryDetail(mov)}
                          >
                            <TableCell className="font-mono text-xs">
                              {new Date(mov.created_at).toLocaleDateString('es-ES')}
                              <br />
                              <span className="text-slate-400">
                                {new Date(mov.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-xs font-bold text-blue-600">
                              {mov.operation_number || `#${mov.id?.substring(0, 8)}`}
                            </TableCell>
                            <TableCell className="font-medium">
                              {mov.customer_name || '-'}
                              {mov.customer_dni && (
                                <span className="text-xs text-slate-400 ml-2">({mov.customer_dni})</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {mov.concept || mov.description || '-'}
                            </TableCell>
                            <TableCell>
                              {mov.payment_method === 'cash' ? (
                                <Badge className="bg-emerald-100 text-emerald-700">
                                  <Banknote className="h-3 w-3 mr-1" />
                                  Efectivo
                                </Badge>
                              ) : (
                                <Badge className="bg-purple-100 text-purple-700">
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  Tarjeta
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${mov.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
                              {mov.type === 'expense' ? '-' : '+'}€{(mov.amount || 0).toFixed(2)}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => reprintHistoryTicket(mov)}
                                title="Reimprimir ticket"
                              >
                                <Printer className="h-4 w-4 text-slate-500 hover:text-emerald-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginación */}
                  {historyTotal > HISTORY_PAGE_SIZE && (
                    <div className="flex justify-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyPage <= 1}
                        onClick={() => searchHistory(historyPage - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <span className="flex items-center px-4 text-sm text-slate-600">
                        {historyPage} / {Math.ceil(historyTotal / HISTORY_PAGE_SIZE)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyPage >= Math.ceil(historyTotal / HISTORY_PAGE_SIZE)}
                        onClick={() => searchHistory(historyPage + 1)}
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Cierres Pasados */}
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

      {/* Modal de Detalle de Movimiento Histórico */}
      <Dialog open={showHistoryDetailDialog} onOpenChange={setShowHistoryDetailDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Detalle del Movimiento
            </DialogTitle>
            <DialogDescription>
              {selectedHistoryMovement?.operation_number || `#${selectedHistoryMovement?.id?.substring(0, 8)}`}
            </DialogDescription>
          </DialogHeader>

          {selectedHistoryMovement && (
            <div className="space-y-4">
              {/* Info Principal */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">Fecha y Hora</p>
                  <p className="font-semibold">
                    {new Date(selectedHistoryMovement.created_at).toLocaleDateString('es-ES', { 
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                  </p>
                  <p className="text-sm text-slate-600">
                    {new Date(selectedHistoryMovement.created_at).toLocaleTimeString('es-ES')}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${selectedHistoryMovement.type === 'expense' ? 'bg-red-50' : 'bg-emerald-50'}`}>
                  <p className="text-xs text-slate-500">Importe</p>
                  <p className={`text-2xl font-bold ${selectedHistoryMovement.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {selectedHistoryMovement.type === 'expense' ? '-' : '+'}€{(selectedHistoryMovement.amount || 0).toFixed(2)}
                  </p>
                  <Badge className={selectedHistoryMovement.payment_method === 'cash' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}>
                    {selectedHistoryMovement.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                  </Badge>
                </div>
              </div>

              {/* Cliente */}
              {selectedHistoryMovement.customer_name && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium">Cliente</p>
                  <p className="font-bold text-blue-900">{selectedHistoryMovement.customer_name}</p>
                  {selectedHistoryMovement.customer_dni && (
                    <p className="text-sm text-blue-700">DNI: {selectedHistoryMovement.customer_dni}</p>
                  )}
                </div>
              )}

              {/* Concepto */}
              <div className="p-3 rounded-lg bg-slate-100">
                <p className="text-xs text-slate-500">Concepto</p>
                <p className="font-medium">{selectedHistoryMovement.concept || selectedHistoryMovement.description || '-'}</p>
              </div>

              {/* Items si existen */}
              {selectedHistoryMovement.items && selectedHistoryMovement.items.length > 0 && (
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-slate-500 mb-2">Artículos</p>
                  <div className="space-y-1">
                    {selectedHistoryMovement.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.item_type || item.name || 'Artículo'} {item.size && `(${item.size})`}</span>
                        <span className="font-medium">€{(item.subtotal || item.unit_price || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas */}
              {selectedHistoryMovement.notes && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-xs text-amber-600">Notas</p>
                  <p className="text-sm">{selectedHistoryMovement.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowHistoryDetailDialog(false)}>
              Cerrar
            </Button>
            <Button 
              onClick={() => {
                reprintHistoryTicket(selectedHistoryMovement);
                setShowHistoryDetailDialog(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Reimprimir Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
