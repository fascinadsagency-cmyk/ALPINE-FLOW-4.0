import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ActiveRentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRental, setEditingRental] = useState(null);
  const [newDays, setNewDays] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadActiveRentals();
  }, []);

  const loadActiveRentals = async () => {
    setLoading(true);
    try {
      const response = await rentalApi.getAll({ status: 'active' });
      setRentals(response.data);
    } catch (error) {
      toast.error("Error al cargar alquileres");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (rental) => {
    setEditingRental(rental);
    setNewDays(rental.days.toString());
  };

  const calculateNewTotal = () => {
    if (!editingRental || !newDays) return editingRental?.total_amount || 0;
    
    const daysInt = parseInt(newDays);
    if (isNaN(daysInt) || daysInt < 1) return editingRental.total_amount;
    
    // Simple calculation: proportional to days
    const pricePerDay = editingRental.total_amount / editingRental.days;
    return pricePerDay * daysInt;
  };

  const calculateNewEndDate = () => {
    if (!editingRental || !newDays) return "";
    
    const daysInt = parseInt(newDays);
    if (isNaN(daysInt) || daysInt < 1) return "";
    
    const startDate = new Date(editingRental.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + daysInt - 1);
    
    return endDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const updateRentalDays = async () => {
    if (!editingRental || !newDays) return;
    
    const daysInt = parseInt(newDays);
    if (isNaN(daysInt) || daysInt < 1) {
      toast.error("Introduce un número válido de días");
      return;
    }

    setUpdating(true);
    try {
      await axios.patch(
        `${API}/rentals/${editingRental.id}/days`,
        {
          days: daysInt,
          new_total: calculateNewTotal()
        },
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      toast.success("Alquiler actualizado correctamente");
      setEditingRental(null);
      setNewDays("");
      loadActiveRentals();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al actualizar alquiler");
    } finally {
      setUpdating(false);
    }
  };

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
                    <TableHead>Artículos</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pendiente</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rentals.map((rental) => (
                    <TableRow key={rental.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{rental.customer_name}</p>
                          <p className="text-sm text-slate-500 font-mono">{rental.customer_dni}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rental.items.length} artículos</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <span>{formatDate(rental.start_date)}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span>{formatDate(rental.end_date)}</span>
                        </div>
                        {isOverdue(rental.end_date) && (
                          <Badge className="bg-red-100 text-red-700 border-red-200 text-xs mt-1">
                            Retrasado {Math.abs(getDaysRemaining(rental.end_date))} días
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-700">
                          {rental.days} días
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        €{rental.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${rental.pending_amount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          €{rental.pending_amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(rental)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="h-4 w-4" />
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

      {/* Edit Days Dialog */}
      {editingRental && (
        <Dialog open={!!editingRental} onOpenChange={() => setEditingRental(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Modificar Duración del Alquiler</DialogTitle>
              <DialogDescription>
                Cliente: {editingRental.customer_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-slate-50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Días actuales</p>
                    <p className="font-bold text-lg text-slate-900">{editingRental.days}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total actual</p>
                    <p className="font-bold text-lg text-slate-900">€{editingRental.total_amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Nuevo número de días</Label>
                <Input
                  type="number"
                  min="1"
                  value={newDays}
                  onChange={(e) => setNewDays(e.target.value)}
                  className="h-14 text-2xl font-bold text-center mt-2"
                  autoFocus
                />
              </div>

              {newDays && parseInt(newDays) !== editingRental.days && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
                  <div className="flex items-center gap-2 text-blue-900">
                    <AlertCircle className="h-5 w-5" />
                    <p className="font-medium">Vista previa de cambios</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                    <div>
                      <p className="text-blue-700">Nuevos días</p>
                      <p className="font-bold text-lg text-blue-900">{newDays}</p>
                    </div>
                    <div>
                      <p className="text-blue-700">Nuevo total</p>
                      <p className="font-bold text-lg text-blue-900">€{calculateNewTotal().toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-blue-200">
                    <p className="text-xs text-blue-700">Nueva fecha de fin: {calculateNewEndDate()}</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Diferencia: {calculateNewTotal() > editingRental.total_amount ? '+' : ''}
                      €{(calculateNewTotal() - editingRental.total_amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRental(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={updateRentalDays}
                disabled={updating || !newDays || parseInt(newDays) === editingRental.days}
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Edit2 className="h-4 w-4 mr-2" />
                )}
                Actualizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
