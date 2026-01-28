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
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2,
  Calendar,
  Lock,
  Download
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
    </div>
  );
}
