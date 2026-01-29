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
  XCircle,
  RefreshCcw,
  Printer,
  History,
  Undo2,
  Search,
  CreditCard,
  Banknote,
  Filter,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INCOME_CATEGORIES = [
  { value: "rental", label: "Alquiler" },
  { value: "accessory_sale", label: "Venta accesorios" },
  { value: "deposit_return", label: "Depósito devuelto" },
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
  { value: "transfer", label: "Transferencia" },
];

const MOVEMENT_TYPE_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "income", label: "Entradas" },
  { value: "expense", label: "Salidas" },
  { value: "refund", label: "Devoluciones" },
];

export default function CashRegister() {
  // Current day state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);
  
  // Movement form
  const [movementType, setMovementType] = useState("income");
  const [newMovement, setNewMovement] = useState({
    amount: "",
    payment_method: "cash",
    category: "",
    concept: "",
    notes: ""
  });
  
  // Arqueo form (enhanced)
  const [arqueoForm, setArqueoForm] = useState({
    physical_cash: "",
    card_total: "",
    notes: ""
  });
  
  // Historic panel state
  const [activeTab, setActiveTab] = useState("today");
  const [closureHistory, setClosureHistory] = useState([]);
  const [historicMovements, setHistoricMovements] = useState([]);
  const [historicLoading, setHistoricLoading] = useState(false);
  
  // Historic filters
  const [historicDateFrom, setHistoricDateFrom] = useState("");
  const [historicDateTo, setHistoricDateTo] = useState("");
  const [historicTypeFilter, setHistoricTypeFilter] = useState("all");
  const [historicSearch, setHistoricSearch] = useState("");
  
  // Discrepancy calculation
  const [discrepancy, setDiscrepancy] = useState({ cash: 0, card: 0, total: 0 });

  useEffect(() => {
    loadData();
  }, [date]);

  useEffect(() => {
    if (activeTab === "closures") {
      loadClosureHistory();
    } else if (activeTab === "history") {
      loadHistoricMovements();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, movementsRes] = await Promise.all([
        axios.get(`${API}/cash/summary`, { params: { date } }),
        axios.get(`${API}/cash/movements`, { params: { date } })
      ]);
      setSummary(summaryRes.data);
      setMovements(movementsRes.data);
    } catch (error) {
      toast.error("Error al cargar datos de caja");
    } finally {
      setLoading(false);
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

  const loadHistoricMovements = async () => {
    setHistoricLoading(true);
    try {
      const params = {};
      if (historicDateFrom) params.date_from = historicDateFrom;
      if (historicDateTo) params.date_to = historicDateTo;
      if (historicTypeFilter !== "all") params.movement_type = historicTypeFilter;
      if (historicSearch) params.search = historicSearch;
      
      const res = await axios.get(`${API}/cash/movements/history`, { params });
      setHistoricMovements(res.data);
    } catch (error) {
      // Fallback: load all movements
      try {
        const res = await axios.get(`${API}/cash/movements`, { params: { date: "" } });
        setHistoricMovements(res.data);
      } catch (e) {
        toast.error("Error al cargar histórico");
      }
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
      const response = await axios.post(`${API}/cash/movements`, {
        movement_type: movementType,
        amount: parseFloat(newMovement.amount),
        payment_method: newMovement.payment_method,
        category: newMovement.category,
        concept: newMovement.concept,
        notes: newMovement.notes
      });
      
      toast.success(movementType === "income" ? "Entrada registrada" : "Salida registrada");
      setShowAddDialog(false);
      
      const createdMovement = {
        ...response.data,
        id: response.data.id || response.data._id,
        movement_type: movementType,
        amount: parseFloat(newMovement.amount),
        payment_method: newMovement.payment_method,
        category: newMovement.category,
        concept: newMovement.concept,
        notes: newMovement.notes,
        created_at: new Date().toISOString()
      };
      setSelectedMovement(createdMovement);
      setShowTicketDialog(true);
      
      setNewMovement({ amount: "", payment_method: "cash", category: "", concept: "", notes: "" });
      loadData();
    } catch (error) {
      toast.error("Error al registrar movimiento");
    }
  };

  // Calculate discrepancy when arqueo form changes
  useEffect(() => {
    if (summary) {
      const expectedCash = (summary.by_method?.cash || 0);
      const expectedCard = (summary.by_method?.card || 0);
      
      const realCash = parseFloat(arqueoForm.physical_cash) || 0;
      const realCard = parseFloat(arqueoForm.card_total) || 0;
      
      setDiscrepancy({
        cash: realCash - expectedCash,
        card: realCard - expectedCard,
        total: (realCash + realCard) - (expectedCash + expectedCard)
      });
    }
  }, [arqueoForm, summary]);

  const closeCashRegister = async () => {
    if (!arqueoForm.physical_cash || !arqueoForm.card_total) {
      toast.error("Debes introducir tanto el efectivo como el total de tarjeta");
      return;
    }

    try {
      await axios.post(`${API}/cash/close`, {
        date: date,
        physical_cash: parseFloat(arqueoForm.physical_cash),
        card_total: parseFloat(arqueoForm.card_total),
        expected_cash: summary?.by_method?.cash || 0,
        expected_card: summary?.by_method?.card || 0,
        discrepancy_cash: discrepancy.cash,
        discrepancy_card: discrepancy.card,
        discrepancy_total: discrepancy.total,
        notes: arqueoForm.notes
      });
      
      toast.success("Caja cerrada correctamente");
      setShowCloseDialog(false);
      setArqueoForm({ physical_cash: "", card_total: "", notes: "" });
      loadData();
      loadClosureHistory();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al cerrar caja");
    }
  };

  const revertClosure = async (closingDate) => {
    if (!window.confirm(`¿Seguro que quieres reabrir la caja del ${closingDate}? Esto permitirá modificar los movimientos de ese día.`)) {
      return;
    }
    try {
      await axios.delete(`${API}/cash/closings/${closingDate}`);
      toast.success(`Caja del ${closingDate} reabierta correctamente`);
      loadClosureHistory();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al reabrir caja");
    }
  };

  const exportToCSV = () => {
    if (movements.length === 0) {
      toast.error("No hay movimientos para exportar");
      return;
    }

    const headers = "Fecha,Hora,Tipo,Cliente,Concepto,Categoría,Método,Importe\n";
    const rows = movements.map(m => {
      const dateStr = m.created_at.split('T')[0];
      const time = m.created_at.split('T')[1].substring(0, 5);
      const type = m.movement_type === 'income' ? 'Entrada' : m.movement_type === 'refund' ? 'Devolución' : 'Salida';
      return `${dateStr},${time},${type},"${m.customer_name || ''}","${m.concept}",${m.category},${m.payment_method},${m.amount}`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caja_${date}.csv`;
    a.click();
    toast.success("Exportado correctamente");
  };

  const handlePrintTicket = (movement) => {
    setSelectedMovement(movement);
    setShowTicketDialog(true);
  };

  const printTicket = () => {
    if (!selectedMovement) return;
    
    const m = selectedMovement;
    const movementDate = m.created_at.split('T')[0];
    const movementTime = m.created_at.split('T')[1]?.substring(0, 5) || "00:00";
    const typeLabel = m.movement_type === 'income' ? 'ENTRADA' : m.movement_type === 'refund' ? 'DEVOLUCIÓN' : 'SALIDA';
    const categoryLabel = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].find(c => c.value === m.category)?.label || m.category;
    const paymentLabel = PAYMENT_METHODS.find(p => p.value === m.payment_method)?.label || m.payment_method;
    
    const ticketWindow = window.open('', '_blank', 'width=400,height=600');
    ticketWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket - ${m.id}</title>
        <style>
          @media print { @page { margin: 0; size: 80mm auto; } body { margin: 0; } }
          body { font-family: 'Courier New', monospace; width: 80mm; padding: 5mm; margin: 0 auto; font-size: 12px; line-height: 1.4; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 5px 0 0 0; font-size: 10px; }
          .type-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; margin: 10px 0; }
          .income { background: #dcfce7; color: #166534; }
          .expense { background: #fee2e2; color: #991b1b; }
          .refund { background: #ffedd5; color: #9a3412; }
          .row { display: flex; justify-content: space-between; padding: 3px 0; }
          .row .label { color: #666; }
          .total { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; font-size: 16px; font-weight: bold; text-align: center; }
          .total.income { color: #166534; }
          .total.expense { color: #991b1b; }
          .total.refund { color: #9a3412; }
          .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #000; font-size: 10px; color: #666; }
          .concept { text-align: center; font-weight: bold; padding: 10px 0; word-wrap: break-word; }
          .print-btn { display: block; width: 100%; padding: 10px; margin-top: 20px; background: #2563eb; color: white; border: none; cursor: pointer; font-size: 14px; border-radius: 4px; }
          @media print { .print-btn { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>COMPROBANTE</h1>
          <p>Movimiento de Caja</p>
        </div>
        <div style="text-align: center;">
          <span class="type-badge ${m.movement_type}">${typeLabel}</span>
        </div>
        <div class="concept">${m.concept}</div>
        <div class="row"><span class="label">Fecha:</span><span>${movementDate}</span></div>
        <div class="row"><span class="label">Hora:</span><span>${movementTime}</span></div>
        ${m.customer_name ? `<div class="row"><span class="label">Cliente:</span><span>${m.customer_name}</span></div>` : ''}
        <div class="row"><span class="label">Categoría:</span><span>${categoryLabel}</span></div>
        <div class="row"><span class="label">Método:</span><span>${paymentLabel}</span></div>
        ${m.notes ? `<div class="row"><span class="label">Notas:</span><span>${m.notes}</span></div>` : ''}
        <div class="total ${m.movement_type}">
          ${m.movement_type === 'income' ? '+' : '-'}€${m.amount.toFixed(2)}
        </div>
        <div class="footer">
          <p>Ref: ${m.id ? m.id.substring(0, 8).toUpperCase() : 'N/A'}</p>
          <p>Gracias por su confianza</p>
        </div>
        <button class="print-btn" onclick="window.print(); setTimeout(() => window.close(), 500);">IMPRIMIR</button>
      </body>
      </html>
    `);
    ticketWindow.document.close();
    setShowTicketDialog(false);
  };

  const changeDate = (days) => {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + days);
    setDate(currentDate.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getMovementTypeBadge = (type) => {
    switch (type) {
      case 'income':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Entrada</Badge>;
      case 'expense':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Salida</Badge>;
      case 'refund':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Devolución</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="cash-register-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Gestión de Caja
        </h1>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="today" className="gap-2">
            <Wallet className="h-4 w-4" />
            Caja del Día
          </TabsTrigger>
          <TabsTrigger value="closures" className="gap-2">
            <Lock className="h-4 w-4" />
            Cierres Pasados
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico Movimientos
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Caja del Día */}
        <TabsContent value="today">
          {/* Date Navigation */}
          <Card className="border-slate-200 mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-500" />
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-44 h-10 text-center font-semibold"
                  />
                  <span className="text-sm text-slate-500">
                    {formatDate(date)}
                  </span>
                </div>
                <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-emerald-700">Entradas</p>
                    <p className="text-2xl font-bold text-emerald-700">€{(summary?.total_income || 0).toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-red-700">Salidas</p>
                    <p className="text-2xl font-bold text-red-700">€{(summary?.total_expense || 0).toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-orange-700">Devoluciones</p>
                    <p className="text-2xl font-bold text-orange-700">€{(summary?.total_refunds || 0).toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-blue-700">Efectivo</p>
                    <p className="text-2xl font-bold text-blue-700">€{(summary?.by_method?.cash || 0).toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-purple-700">Tarjeta</p>
                    <p className="text-2xl font-bold text-purple-700">€{(summary?.by_method?.card || 0).toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Balance Card */}
              <Card className={`border-2 mb-6 ${(summary?.balance || 0) >= 0 ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Saldo Neto del Día</p>
                      <p className={`text-4xl font-bold ${(summary?.balance || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        €{(summary?.balance || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <p>{summary?.total_transactions || 0} operaciones</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mb-6">
                <Button onClick={() => { setMovementType("income"); setShowAddDialog(true); }}>
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Nueva Entrada
                </Button>
                <Button variant="outline" onClick={() => { setMovementType("expense"); setShowAddDialog(true); }}>
                  <ArrowDownLeft className="h-4 w-4 mr-2" />
                  Nueva Salida
                </Button>
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
                <Button variant="destructive" onClick={() => setShowCloseDialog(true)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Cerrar Caja
                </Button>
              </div>

              {/* Movements Table */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Movimientos del Día ({movements.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {movements.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No hay movimientos registrados</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hora</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead className="text-right">Importe</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell className="font-mono text-sm">
                              {movement.created_at.split('T')[1]?.substring(0, 5) || '-'}
                            </TableCell>
                            <TableCell>{getMovementTypeBadge(movement.movement_type)}</TableCell>
                            <TableCell className="text-slate-600">{movement.customer_name || '-'}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{movement.concept}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {PAYMENT_METHODS.find(p => p.value === movement.payment_method)?.label || movement.payment_method}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-bold ${
                              movement.movement_type === 'income' ? 'text-emerald-600' : 
                              movement.movement_type === 'refund' ? 'text-orange-600' : 'text-red-600'
                            }`}>
                              {movement.movement_type === 'income' ? '+' : '-'}€{movement.amount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrintTicket(movement)} data-testid={`print-movement-${movement.id}`}>
                                <Printer className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB 2: Cierres Pasados */}
        <TabsContent value="closures">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
                <div className="text-center py-12 text-slate-500">
                  <Lock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay cierres registrados</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead className="text-right">Esperado Efectivo</TableHead>
                      <TableHead className="text-right">Real Efectivo</TableHead>
                      <TableHead className="text-right">Esperado Tarjeta</TableHead>
                      <TableHead className="text-right">Real Tarjeta</TableHead>
                      <TableHead className="text-right">Descuadre Total</TableHead>
                      <TableHead className="w-24">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closureHistory.map((closure) => {
                      const totalDiscrepancy = (closure.discrepancy_total || 
                        ((closure.physical_cash || 0) - (closure.expected_balance || 0)));
                      return (
                        <TableRow key={closure.date}>
                          <TableCell className="font-semibold">{closure.date}</TableCell>
                          <TableCell>{closure.closed_by || '-'}</TableCell>
                          <TableCell className="text-right">€{(closure.expected_cash || closure.expected_balance || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">€{(closure.physical_cash || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">€{(closure.expected_card || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">€{(closure.card_total || 0).toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-bold ${
                            totalDiscrepancy === 0 ? 'text-emerald-600' : 
                            totalDiscrepancy > 0 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {totalDiscrepancy >= 0 ? '+' : ''}€{totalDiscrepancy.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                              onClick={() => revertClosure(closure.date)}
                              data-testid={`revert-closure-${closure.date}`}
                            >
                              <Undo2 className="h-3 w-3" />
                              Reabrir
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Histórico de Movimientos */}
        <TabsContent value="history">
          <Card className="border-slate-200 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros de Búsqueda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label className="text-xs">Desde</Label>
                  <Input
                    type="date"
                    value={historicDateFrom}
                    onChange={(e) => setHistoricDateFrom(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs">Hasta</Label>
                  <Input
                    type="date"
                    value={historicDateTo}
                    onChange={(e) => setHistoricDateTo(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={historicTypeFilter} onValueChange={setHistoricTypeFilter}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOVEMENT_TYPE_FILTERS.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Buscar concepto</Label>
                  <Input
                    placeholder="Buscar..."
                    value={historicSearch}
                    onChange={(e) => setHistoricSearch(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={loadHistoricMovements} className="w-full h-10">
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Resultados ({historicMovements.length} movimientos)</CardTitle>
            </CardHeader>
            <CardContent>
              {historicLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : historicMovements.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No se encontraron movimientos</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historicMovements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="font-mono text-sm">
                            {movement.created_at.split('T')[0]}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {movement.created_at.split('T')[1]?.substring(0, 5) || '-'}
                          </TableCell>
                          <TableCell>{getMovementTypeBadge(movement.movement_type)}</TableCell>
                          <TableCell className="text-slate-600">{movement.customer_name || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{movement.concept}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {PAYMENT_METHODS.find(p => p.value === movement.payment_method)?.label || movement.payment_method}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-bold ${
                            movement.movement_type === 'income' ? 'text-emerald-600' : 
                            movement.movement_type === 'refund' ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {movement.movement_type === 'income' ? '+' : '-'}€{movement.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => handlePrintTicket(movement)}
                              title="Reimprimir ticket"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
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

      {/* Add Movement Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
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
                className="h-12 text-xl font-bold mt-1"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Método de pago *</Label>
                <Select value={newMovement.payment_method} onValueChange={(v) => setNewMovement({ ...newMovement, payment_method: v })}>
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
              <div>
                <Label>Categoría *</Label>
                <Select value={newMovement.category} onValueChange={(v) => setNewMovement({ ...newMovement, category: v })}>
                  <SelectTrigger className="h-11 mt-1">
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
                className="h-11 mt-1"
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

      {/* Close Cash Register Dialog - ENHANCED */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Cerrar Caja - Arqueo Manual
            </DialogTitle>
            <DialogDescription>
              Introduce el efectivo y total de tarjeta contados físicamente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Expected values */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-sm font-semibold text-slate-600 mb-3">Valores esperados según el sistema:</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Efectivo</p>
                  <p className="font-bold text-lg text-blue-600">€{(summary?.by_method?.cash || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Tarjeta</p>
                  <p className="font-bold text-lg text-purple-600">€{(summary?.by_method?.card || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Total</p>
                  <p className="font-bold text-lg text-slate-900">€{((summary?.by_method?.cash || 0) + (summary?.by_method?.card || 0)).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Arqueo form */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-blue-600" />
                  Efectivo Real Contado (€) *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={arqueoForm.physical_cash}
                  onChange={(e) => setArqueoForm({ ...arqueoForm, physical_cash: e.target.value })}
                  className="h-14 text-2xl font-bold mt-1 text-center"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  Total Datáfono/Tarjeta (€) *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={arqueoForm.card_total}
                  onChange={(e) => setArqueoForm({ ...arqueoForm, card_total: e.target.value })}
                  className="h-14 text-2xl font-bold mt-1 text-center"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Discrepancy display */}
            {(arqueoForm.physical_cash || arqueoForm.card_total) && (
              <div className={`p-4 rounded-xl border-2 ${
                discrepancy.total === 0 ? 'bg-emerald-50 border-emerald-300' :
                Math.abs(discrepancy.total) <= 5 ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-300'
              }`}>
                <p className="text-sm font-semibold mb-3">Cálculo de Descuadre:</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Efectivo</p>
                    <p className={`font-bold text-lg ${
                      discrepancy.cash === 0 ? 'text-emerald-600' : discrepancy.cash > 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {discrepancy.cash >= 0 ? '+' : ''}€{discrepancy.cash.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">Tarjeta</p>
                    <p className={`font-bold text-lg ${
                      discrepancy.card === 0 ? 'text-emerald-600' : discrepancy.card > 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {discrepancy.card >= 0 ? '+' : ''}€{discrepancy.card.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-semibold">TOTAL</p>
                    <p className={`font-bold text-xl ${
                      discrepancy.total === 0 ? 'text-emerald-600' : discrepancy.total > 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {discrepancy.total >= 0 ? '+' : ''}€{discrepancy.total.toFixed(2)}
                    </p>
                  </div>
                </div>
                {discrepancy.total === 0 && (
                  <div className="mt-3 pt-3 border-t border-emerald-200 flex items-center gap-2 text-emerald-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">¡Cuadra perfectamente!</span>
                  </div>
                )}
                {discrepancy.total !== 0 && (
                  <div className="mt-3 pt-3 border-t border-current/20 flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-sm">
                      {discrepancy.total > 0 ? 'Hay más dinero del esperado (sobrante)' : 'Falta dinero (descuadre negativo)'}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>Observaciones del cierre</Label>
              <Textarea
                value={arqueoForm.notes}
                onChange={(e) => setArqueoForm({ ...arqueoForm, notes: e.target.value })}
                className="mt-1"
                rows={2}
                placeholder="Notas sobre el cierre, incidencias..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancelar</Button>
            <Button 
              onClick={closeCashRegister} 
              variant="destructive"
              disabled={!arqueoForm.physical_cash || !arqueoForm.card_total}
            >
              <Lock className="h-4 w-4 mr-2" />
              Confirmar Cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Ticket Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Imprimir Comprobante
            </DialogTitle>
          </DialogHeader>
          {selectedMovement && (
            <div className="py-4">
              <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm space-y-2">
                <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
                  <p className="font-bold text-lg">COMPROBANTE</p>
                </div>
                <div className="flex justify-center mb-3">
                  {getMovementTypeBadge(selectedMovement.movement_type)}
                </div>
                <p className="text-center font-semibold text-base py-2">{selectedMovement.concept}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fecha:</span>
                    <span>{selectedMovement.created_at.split('T')[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hora:</span>
                    <span>{selectedMovement.created_at.split('T')[1]?.substring(0, 5)}</span>
                  </div>
                  {selectedMovement.customer_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cliente:</span>
                      <span>{selectedMovement.customer_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Método:</span>
                    <span>{PAYMENT_METHODS.find(p => p.value === selectedMovement.payment_method)?.label}</span>
                  </div>
                </div>
                <div className={`text-center text-2xl font-bold pt-3 mt-3 border-t border-dashed border-slate-300 ${
                  selectedMovement.movement_type === 'income' ? 'text-emerald-600' : 
                  selectedMovement.movement_type === 'refund' ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {selectedMovement.movement_type === 'income' ? '+' : '-'}€{selectedMovement.amount.toFixed(2)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicketDialog(false)}>Cancelar</Button>
            <Button onClick={printTicket}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
