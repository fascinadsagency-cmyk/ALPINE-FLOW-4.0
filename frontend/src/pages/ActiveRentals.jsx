import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  IdCard
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "card", label: "Tarjeta", icon: CreditCard },
];

export default function ActiveRentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Step-based modification flow
  const [editingRental, setEditingRental] = useState(null);
  const [newDays, setNewDays] = useState("");
  const [step, setStep] = useState(1); // 1: Select days, 2: Confirm payment, 3: Print ticket
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [updating, setUpdating] = useState(false);
  const [modificationResult, setModificationResult] = useState(null);

  // Customer modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);

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
    
    // 0 days = return same day, charge minimum or refund
    if (daysInt === 0) {
      return 0; // Full refund case
    }
    
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
    
    if (daysInt === 0) {
      // Same day return
      return startDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    
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

  // Step 1 → Step 2: Validate and proceed to payment
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

  // Step 2 → Step 3: Process modification with payment
  const processModification = async () => {
    if (!editingRental) return;
    
    const daysInt = parseInt(newDays);
    const newTotal = calculateNewTotal();
    const difference = calculateDifference();

    setUpdating(true);
    try {
      const response = await axios.patch(
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
        timestamp: new Date().toISOString(),
        cashMovementId: response.data.cash_movement_id
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

  // Print modification ticket
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
        <title>Comprobante Modificación - ${r.rental.id.substring(0, 8)}</title>
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
            font-size: 11px;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 16px;
          }
          .header p {
            margin: 5px 0 0 0;
            font-size: 10px;
          }
          .type-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
            margin: 10px 0;
          }
          .cobro { background: #dcfce7; color: #166534; }
          .devolucion { background: #ffedd5; color: #9a3412; }
          .section {
            border-bottom: 1px dashed #ccc;
            padding: 8px 0;
            margin-bottom: 8px;
          }
          .section-title {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
            color: #666;
            margin-bottom: 5px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
          }
          .row .label { color: #666; }
          .row .value { font-weight: bold; }
          .old-value {
            text-decoration: line-through;
            color: #999;
          }
          .new-value {
            color: #166534;
            font-weight: bold;
          }
          .total {
            border-top: 2px dashed #000;
            margin-top: 10px;
            padding-top: 10px;
            text-align: center;
          }
          .total-amount {
            font-size: 24px;
            font-weight: bold;
          }
          .total-amount.cobro { color: #166534; }
          .total-amount.devolucion { color: #9a3412; }
          .footer {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px dashed #000;
            font-size: 9px;
            color: #666;
          }
          .print-btn {
            display: block;
            width: 100%;
            padding: 12px;
            margin-top: 20px;
            background: #2563eb;
            color: white;
            border: none;
            cursor: pointer;
            font-size: 14px;
            border-radius: 4px;
          }
          @media print { .print-btn { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>COMPROBANTE DE MODIFICACIÓN</h1>
          <p>Factura Rectificativa</p>
        </div>
        
        <div style="text-align: center;">
          <span class="type-badge ${isRefund ? 'devolucion' : 'cobro'}">
            ${isRefund ? 'DEVOLUCIÓN' : 'COBRO ADICIONAL'}
          </span>
        </div>
        
        <div class="section">
          <div class="section-title">Datos del Cliente</div>
          <div class="row">
            <span class="label">Cliente:</span>
            <span class="value">${r.rental.customer_name}</span>
          </div>
          <div class="row">
            <span class="label">DNI:</span>
            <span class="value">${r.rental.customer_dni || '-'}</span>
          </div>
          <div class="row">
            <span class="label">Alquiler:</span>
            <span class="value">#${r.rental.id.substring(0, 8).toUpperCase()}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Modificación de Fechas</div>
          <div class="row">
            <span class="label">Fecha inicio:</span>
            <span class="value">${startDate}</span>
          </div>
          <div class="row">
            <span class="label">Fecha fin anterior:</span>
            <span class="old-value">${oldEndDate}</span>
          </div>
          <div class="row">
            <span class="label">Nueva fecha fin:</span>
            <span class="new-value">${newEndDate}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Modificación de Duración</div>
          <div class="row">
            <span class="label">Días anteriores:</span>
            <span class="old-value">${r.oldDays} días</span>
          </div>
          <div class="row">
            <span class="label">Nuevos días:</span>
            <span class="new-value">${r.newDays} días</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Detalle Económico</div>
          <div class="row">
            <span class="label">Importe anterior:</span>
            <span class="old-value">€${r.oldTotal.toFixed(2)}</span>
          </div>
          <div class="row">
            <span class="label">Nuevo importe:</span>
            <span class="new-value">€${r.newTotal.toFixed(2)}</span>
          </div>
          <div class="row">
            <span class="label">Método de pago:</span>
            <span class="value">${paymentLabel}</span>
          </div>
        </div>
        
        <div class="total">
          <p style="margin: 0; font-size: 10px; color: #666;">
            ${isRefund ? 'IMPORTE DEVUELTO' : 'IMPORTE COBRADO'}
          </p>
          <p class="total-amount ${isRefund ? 'devolucion' : 'cobro'}">
            ${isRefund ? '-' : '+'}€${Math.abs(r.difference).toFixed(2)}
          </p>
        </div>
        
        <div class="footer">
          <p>Fecha: ${new Date(r.timestamp).toLocaleString('es-ES')}</p>
          <p>Ref: MOD-${r.rental.id.substring(0, 8).toUpperCase()}</p>
          <p style="margin-top: 8px;">Gracias por su confianza</p>
        </div>
        
        <button class="print-btn" onclick="window.print(); setTimeout(() => window.close(), 500);">
          IMPRIMIR COMPROBANTE
        </button>
      </body>
      </html>
    `);
    ticketWindow.document.close();
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

  // Open customer info modal
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
      
      // Try to get more customer details from API
      if (rental.customer_id) {
        try {
          const response = await axios.get(`${API}/customers/${rental.customer_id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          customerData = {
            ...customerData,
            ...response.data,
            items: rental.items || [],
            rental_id: rental.id
          };
        } catch (e) {
          // Continue with rental data
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
      `Hola ${customerName}, te contactamos de la tienda de esquí. ¿En qué podemos ayudarte?`
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
    const subject = encodeURIComponent("Información sobre tu alquiler - Tienda de Esquí");
    const body = encodeURIComponent(
      `Hola ${customerName},\n\nTe contactamos desde la tienda de esquí respecto a tu alquiler.\n\nGracias.`
    );
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
                        <div className="flex items-center justify-end gap-1">
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
                  <p className="text-xs text-slate-500 mb-2">Introduce 0 para devolución el mismo día del alquiler</p>
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

                {/* Quick day buttons */}
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
                    
                    <p className="text-xs text-slate-600">
                      Nueva fecha fin: {calculateNewEndDate()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Confirm payment method */}
            {step === 2 && (
              <div className="space-y-4 py-4">
                <div className={`p-6 rounded-xl ${diffInfo?.bgColor} border-2 ${diffInfo?.borderColor}`}>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-600 mb-1">
                      {calculateDifference() > 0 ? 'IMPORTE A COBRAR AL CLIENTE' : 'IMPORTE A DEVOLVER AL CLIENTE'}
                    </p>
                    <p className={`text-4xl font-bold ${diffInfo?.color}`}>
                      {calculateDifference() > 0 ? '+' : '-'}€{Math.abs(calculateDifference()).toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-current/20 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">De {editingRental.days} días</p>
                      <p className="font-semibold">€{editingRental.total_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">A {newDays} días</p>
                      <p className="font-semibold">€{calculateNewTotal().toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    {calculateDifference() > 0 ? '¿Cómo paga el cliente?' : '¿Cómo se devuelve el dinero?'}
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      return (
                        <Button
                          key={method.value}
                          variant={paymentMethod === method.value ? "default" : "outline"}
                          className={`h-20 flex-col gap-2 ${paymentMethod === method.value ? '' : 'hover:bg-slate-50'}`}
                          onClick={() => setPaymentMethod(method.value)}
                          data-testid={`payment-method-${method.value}`}
                        >
                          <Icon className="h-6 w-6" />
                          <span className="font-semibold">{method.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-semibold">Operación de caja</p>
                      <p>Al confirmar, se registrará automáticamente este {calculateDifference() > 0 ? 'cobro' : 'reembolso'} en los Movimientos de Caja.</p>
                    </div>
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
                  <p className="text-sm text-emerald-600 mt-1">
                    El movimiento ha sido registrado en caja
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Concepto registrado:</span>
                  </div>
                  <p className="font-medium text-slate-900">
                    Ajuste días Alquiler ID: {modificationResult.rental.id.substring(0, 8).toUpperCase()} 
                    (De {modificationResult.oldDays} días a {modificationResult.newDays} días)
                  </p>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Importe:</span>
                    <span className={`font-bold ${modificationResult.difference > 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {modificationResult.difference > 0 ? '+' : '-'}€{Math.abs(modificationResult.difference).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Printer className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold">Imprime el comprobante</p>
                      <p>Entrega al cliente el comprobante de modificación con los datos actualizados.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              {step === 1 && (
                <>
                  <Button variant="outline" onClick={closeDialog}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={proceedToPayment}
                    disabled={newDays === "" || parseInt(newDays) === editingRental.days}
                    data-testid="proceed-to-payment"
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              )}
              
              {step === 2 && (
                <>
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Volver
                  </Button>
                  <Button 
                    onClick={processModification}
                    disabled={updating}
                    className={calculateDifference() > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'}
                    data-testid="confirm-modification"
                  >
                    {updating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : calculateDifference() > 0 ? (
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 mr-2" />
                    )}
                    {calculateDifference() > 0 ? 'Cobrar' : 'Devolver'} €{Math.abs(calculateDifference()).toFixed(2)}
                  </Button>
                </>
              )}
              
              {step === 3 && (
                <>
                  <Button variant="outline" onClick={closeDialog}>
                    Cerrar
                  </Button>
                  <Button 
                    onClick={printModificationTicket}
                    data-testid="print-modification-ticket"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir Comprobante
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
