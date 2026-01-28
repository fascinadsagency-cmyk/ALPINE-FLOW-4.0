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
  Shield,
  History,
  Undo2
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INCOME_CATEGORIES = [
  { value: "rental", label: "Alquiler" },
  { value: "accessory_sale", label: "Venta accesorios" },
  { value: "deposit_return", label: "Depósito devuelto" },
  { value: "other", label: "Otros" },
];

const EXPENSE_CATEGORIES = [
  { value: "purchase", label: "Compra material" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "supplies", label: "Suministros" },
  { value: "payroll", label: "Nóminas" },
  { value: "rent", label: "Alquiler local" },
  { value: "other", label: "Otros" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
];

export default function CashRegister() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [closureHistory, setClosureHistory] = useState([]);
  const [movementType, setMovementType] = useState("income");
  const [newMovement, setNewMovement] = useState({
    amount: "",
    payment_method: "cash",
    category: "",
    concept: "",
    notes: ""
  });
  const [physicalCash, setPhysicalCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  
  // Arqueo form (for future redesign)
  const [arqueoForm, setArqueoForm] = useState({
    physical_cash: "",
    card_sales: "",
    notes: ""
  });
  
  const [discrepancy, setDiscrepancy] = useState({ cash: 0, card: 0, total: 0 });
  
  // Ticket printing state
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);

  useEffect(() => {
    loadData();
  }, [date]);

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
    try {
      const res = await axios.get(`${API}/cash/closings`);
      setClosureHistory(res.data);
      setShowHistoryDialog(true);
    } catch (error) {
      toast.error("Error al cargar historial de cierres");
    }
  };

  const revertClosure = async (closingDate) => {
    if (!window.confirm(`¿Seguro que quieres revertir el cierre del ${closingDate}? Esto permitirá modificar los movimientos de ese día.`)) {
      return;
    }
    try {
      await axios.delete(`${API}/cash/closings/${closingDate}`);
      toast.success(`Cierre del ${closingDate} revertido correctamente`);
      loadClosureHistory();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al revertir cierre");
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
      
      // Show print option for new movement
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

  const closeCashRegister = async () => {
    if (!physicalCash) {
      toast.error("Introduce el efectivo físico contado");
      return;
    }

    try {
      await axios.post(`${API}/cash/close`, {
        date: date,
        physical_cash: parseFloat(physicalCash),
        notes: closeNotes
      });
      
      toast.success("Caja cerrada correctamente");
      setShowCloseDialog(false);
      setPhysicalCash("");
      setCloseNotes("");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al cerrar caja");
    }
  };

  const exportToCSV = () => {
    if (movements.length === 0) {
      toast.error("No hay movimientos para exportar");
      return;
    }

    const headers = "Hora,Tipo,Concepto,Categoría,Método,Importe\n";
    const rows = movements.map(m => {
      const time = m.created_at.split('T')[1].substring(0, 5);
      const type = m.movement_type === 'income' ? 'Entrada' : 'Salida';
      return `${time},${type},"${m.concept}",${m.category},${m.payment_method},${m.amount}`;
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
    const movementTime = m.created_at.split('T')[1].substring(0, 5);
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
          @media print {
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; }
          }
          body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            padding: 5mm;
            margin: 0 auto;
            font-size: 12px;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 18px;
          }
          .header p {
            margin: 5px 0 0 0;
            font-size: 10px;
          }
          .type-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: bold;
            margin: 10px 0;
          }
          .income { background: #dcfce7; color: #166534; }
          .expense { background: #fee2e2; color: #991b1b; }
          .refund { background: #ffedd5; color: #9a3412; }
          .row {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
          }
          .row .label {
            color: #666;
          }
          .total {
            border-top: 1px dashed #000;
            margin-top: 10px;
            padding-top: 10px;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
          }
          .total.income { color: #166534; }
          .total.expense { color: #991b1b; }
          .total.refund { color: #9a3412; }
          .footer {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px dashed #000;
            font-size: 10px;
            color: #666;
          }
          .concept {
            text-align: center;
            font-weight: bold;
            padding: 10px 0;
            word-wrap: break-word;
          }
          .print-btn {
            display: block;
            width: 100%;
            padding: 10px;
            margin-top: 20px;
            background: #2563eb;
            color: white;
            border: none;
            cursor: pointer;
            font-size: 14px;
            border-radius: 4px;
          }
          @media print {
            .print-btn { display: none; }
          }
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
        
        <div class="row">
          <span class="label">Fecha:</span>
          <span>${movementDate}</span>
        </div>
        <div class="row">
          <span class="label">Hora:</span>
          <span>${movementTime}</span>
        </div>
        ${m.customer_name ? `
        <div class="row">
          <span class="label">Cliente:</span>
          <span>${m.customer_name}</span>
        </div>` : ''}
        <div class="row">
          <span class="label">Categoría:</span>
          <span>${categoryLabel}</span>
        </div>
        <div class="row">
          <span class="label">Método:</span>
          <span>${paymentLabel}</span>
        </div>
        ${m.notes ? `
        <div class="row">
          <span class="label">Notas:</span>
          <span>${m.notes}</span>
        </div>` : ''}
        
        <div class="total ${m.movement_type}">
          ${m.movement_type === 'income' ? '+' : '-'}€${m.amount.toFixed(2)}
        </div>
        
        <div class="footer">
          <p>Ref: ${m.id ? m.id.substring(0, 8).toUpperCase() : 'N/A'}</p>
          <p>Gracias por su confianza</p>
        </div>
        
        <button class="print-btn" onclick="window.print(); setTimeout(() => window.close(), 500);">
          IMPRIMIR
        </button>
      </body>
      </html>
    `);
    ticketWindow.document.close();
    setShowTicketDialog(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8" data-testid="cash-register-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Caja
          </h1>
          <p className="text-slate-500 mt-1">Control de entradas y salidas</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-slate-400" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40 h-11"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Entradas</p>
                <p className="text-3xl font-bold text-emerald-700">
                  €{(summary?.total_income || 0).toFixed(2)}
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Salidas</p>
                <p className="text-3xl font-bold text-red-700">
                  €{(summary?.total_expense || 0).toFixed(2)}
                </p>
              </div>
              <ArrowDownLeft className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Devoluciones</p>
                <p className="text-3xl font-bold text-orange-700">
                  €{(summary?.total_refunds || 0).toFixed(2)}
                </p>
              </div>
              <ArrowDownLeft className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Saldo Neto</p>
                <p className={`text-3xl font-bold ${(summary?.balance || 0) >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                  €{(summary?.balance || 0).toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mt-1">Ingresos - Salidas - Devol.</p>
              </div>
              <Wallet className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

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
          Exportar
        </Button>
        <Button variant="outline" onClick={loadClosureHistory}>
          <History className="h-4 w-4 mr-2" />
          Historial Cierres
        </Button>
        <Button variant="destructive" onClick={() => setShowCloseDialog(true)}>
          <Lock className="h-4 w-4 mr-2" />
          Cerrar Caja
        </Button>
      </div>

      {/* Movements Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-slate-500" />
            Movimientos del Día ({movements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No hay movimientos registrados</p>
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
                  <TableRow key={movement.id} className={movement.movement_type === 'refund' ? 'bg-orange-50/50' : ''}>
                    <TableCell className="font-mono">
                      {movement.created_at.split('T')[1].substring(0, 5)}
                    </TableCell>
                    <TableCell>
                      {movement.movement_type === 'income' ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                          Entrada
                        </Badge>
                      ) : movement.movement_type === 'refund' ? (
                        <Badge className="bg-orange-100 text-orange-700">
                          <ArrowDownLeft className="h-3 w-3 mr-1" />
                          Devolución
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">
                          <ArrowDownLeft className="h-3 w-3 mr-1" />
                          Salida
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {movement.customer_name ? (
                        <span className="font-medium text-slate-700">{movement.customer_name}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate" title={movement.concept}>
                      {movement.concept}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{movement.payment_method}</Badge>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${
                      movement.movement_type === 'income' 
                        ? 'text-emerald-600' 
                        : movement.movement_type === 'refund'
                        ? 'text-orange-600'
                        : 'text-red-600'
                    }`}>
                      {movement.movement_type === 'income' ? '+' : '-'}€{movement.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-slate-900"
                        onClick={() => handlePrintTicket(movement)}
                        data-testid={`print-movement-${movement.id}`}
                      >
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

      {/* Add Movement Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {movementType === "income" ? "Nueva Entrada" : "Nueva Salida"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Concepto *</Label>
              <Input
                value={newMovement.concept}
                onChange={(e) => setNewMovement({ ...newMovement, concept: e.target.value })}
                placeholder="Descripción del movimiento"
                className="h-11 mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Importe (€) *</Label>
                <Input
                  type="number"
                  value={newMovement.amount}
                  onChange={(e) => setNewMovement({ ...newMovement, amount: e.target.value })}
                  className="h-11 mt-1"
                />
              </div>
              <div>
                <Label>Método de Pago</Label>
                <Select 
                  value={newMovement.payment_method} 
                  onValueChange={(v) => setNewMovement({ ...newMovement, payment_method: v })}
                >
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
            </div>
            <div>
              <Label>Categoría *</Label>
              <Select 
                value={newMovement.category} 
                onValueChange={(v) => setNewMovement({ ...newMovement, category: v })}
              >
                <SelectTrigger className="h-11 mt-1">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {(movementType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={newMovement.notes}
                onChange={(e) => setNewMovement({ ...newMovement, notes: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={createMovement}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Cash Register Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cerrar Caja del {date}</DialogTitle>
            <DialogDescription>
              Realiza el arqueo de caja contando el efectivo físico
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-xl bg-slate-50">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Entradas</p>
                  <p className="font-semibold text-emerald-600">+€{(summary?.total_income || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Salidas</p>
                  <p className="font-semibold text-red-600">-€{(summary?.total_expense || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Devoluciones</p>
                  <p className="font-semibold text-orange-600">-€{(summary?.total_refunds || 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-slate-500">Saldo Neto esperado</p>
                <p className="text-2xl font-bold text-slate-900">€{(summary?.balance || 0).toFixed(2)}</p>
              </div>
            </div>
            <div>
              <Label>Efectivo físico contado (€) *</Label>
              <Input
                type="number"
                value={physicalCash}
                onChange={(e) => setPhysicalCash(e.target.value)}
                className="h-11 mt-1 text-lg"
                placeholder="0.00"
              />
            </div>
            {physicalCash && (
              <div className={`p-3 rounded-lg ${
                parseFloat(physicalCash) === summary?.balance ? 'bg-emerald-50' : 'bg-amber-50'
              }`}>
                <p className="text-sm font-medium">
                  Diferencia: €{(parseFloat(physicalCash || 0) - (summary?.balance || 0)).toFixed(2)}
                </p>
              </div>
            )}
            <div>
              <Label>Observaciones</Label>
              <Textarea
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                className="mt-1"
                rows={2}
                placeholder="Notas sobre el cierre..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={closeCashRegister} variant="destructive">
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
            <DialogDescription>
              Vista previa del ticket de caja
            </DialogDescription>
          </DialogHeader>
          {selectedMovement && (
            <div className="py-4">
              <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm space-y-2">
                <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
                  <p className="font-bold text-lg">COMPROBANTE</p>
                  <p className="text-xs text-slate-500">Movimiento de Caja</p>
                </div>
                
                <div className="flex justify-center mb-3">
                  <Badge className={`${
                    selectedMovement.movement_type === 'income' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : selectedMovement.movement_type === 'refund'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedMovement.movement_type === 'income' ? 'ENTRADA' : 
                     selectedMovement.movement_type === 'refund' ? 'DEVOLUCIÓN' : 'SALIDA'}
                  </Badge>
                </div>
                
                <p className="text-center font-semibold text-base py-2">{selectedMovement.concept}</p>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fecha:</span>
                    <span>{selectedMovement.created_at.split('T')[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hora:</span>
                    <span>{selectedMovement.created_at.split('T')[1].substring(0, 5)}</span>
                  </div>
                  {selectedMovement.customer_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cliente:</span>
                      <span>{selectedMovement.customer_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Método:</span>
                    <span>{PAYMENT_METHODS.find(p => p.value === selectedMovement.payment_method)?.label || selectedMovement.payment_method}</span>
                  </div>
                </div>
                
                <div className={`text-center text-2xl font-bold pt-3 mt-3 border-t border-dashed border-slate-300 ${
                  selectedMovement.movement_type === 'income' 
                    ? 'text-emerald-600' 
                    : selectedMovement.movement_type === 'refund'
                    ? 'text-orange-600'
                    : 'text-red-600'
                }`}>
                  {selectedMovement.movement_type === 'income' ? '+' : '-'}€{selectedMovement.amount.toFixed(2)}
                </div>
                
                <div className="text-center text-xs text-slate-400 pt-3 border-t border-dashed border-slate-300 mt-3">
                  <p>Ref: {selectedMovement.id ? selectedMovement.id.substring(0, 8).toUpperCase() : 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={printTicket} data-testid="confirm-print-ticket">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
