import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { customerApi, itemApi, tariffApi, rentalApi } from "@/lib/api";
import { 
  Search, 
  User, 
  Package, 
  Trash2, 
  Plus,
  Check,
  Loader2,
  History,
  Barcode
} from "lucide-react";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "pending", label: "Pendiente" },
  { value: "online", label: "Reserva Online" },
  { value: "pago_online", label: "Pago Online" },
  { value: "other", label: "Otros" },
];

export default function NewRental() {
  const [searchTerm, setSearchTerm] = useState("");
  const [customer, setCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState(null);
  const [items, setItems] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [deposit, setDeposit] = useState("");
  const [notes, setNotes] = useState("");
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ dni: "", name: "", phone: "", address: "", city: "" });
  
  const barcodeRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    loadTariffs();
  }, []);

  useEffect(() => {
    if (customer && barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, [customer]);

  const loadTariffs = async () => {
    try {
      const response = await tariffApi.getAll();
      setTariffs(response.data);
    } catch (error) {
      console.error("Error loading tariffs:", error);
    }
  };

  const searchCustomer = async () => {
    if (!searchTerm.trim()) return;
    
    setSearchLoading(true);
    try {
      // Try by DNI first
      try {
        const response = await customerApi.getByDni(searchTerm);
        setCustomer(response.data);
        loadCustomerHistory(response.data.id);
        toast.success(`Cliente encontrado: ${response.data.name}`);
        return;
      } catch (e) {
        // Not found by DNI, try search
      }
      
      const response = await customerApi.getAll(searchTerm);
      if (response.data.length === 1) {
        setCustomer(response.data[0]);
        loadCustomerHistory(response.data[0].id);
        toast.success(`Cliente encontrado: ${response.data[0].name}`);
      } else if (response.data.length > 1) {
        toast.info("Múltiples clientes encontrados. Sé más específico.");
      } else {
        setNewCustomer({ ...newCustomer, dni: searchTerm.toUpperCase() });
        setShowNewCustomer(true);
      }
    } catch (error) {
      setNewCustomer({ ...newCustomer, dni: searchTerm.toUpperCase() });
      setShowNewCustomer(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadCustomerHistory = async (customerId) => {
    try {
      const response = await customerApi.getHistory(customerId);
      setCustomerHistory(response.data);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const createNewCustomer = async () => {
    if (!newCustomer.dni || !newCustomer.name) {
      toast.error("DNI y nombre son obligatorios");
      return;
    }
    
    try {
      const response = await customerApi.create(newCustomer);
      setCustomer(response.data);
      setShowNewCustomer(false);
      setNewCustomer({ dni: "", name: "", phone: "", address: "", city: "" });
      toast.success("Cliente creado correctamente");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear cliente");
    }
  };

  const addItemByBarcode = async (e) => {
    if (e.key !== 'Enter' || !barcodeInput.trim()) return;
    
    try {
      const response = await itemApi.getByBarcode(barcodeInput);
      const item = response.data;
      
      if (item.status !== 'available') {
        toast.error(`Artículo no disponible (${item.status})`);
        setBarcodeInput("");
        return;
      }
      
      if (items.find(i => i.barcode === item.barcode)) {
        toast.error("Artículo ya añadido");
        setBarcodeInput("");
        return;
      }
      
      setItems([...items, { ...item, person_name: "" }]);
      toast.success(`${item.brand} ${item.model} añadido`);
      setBarcodeInput("");
    } catch (error) {
      toast.error("Artículo no encontrado");
      setBarcodeInput("");
    }
  };

  const removeItem = (barcode) => {
    setItems(items.filter(i => i.barcode !== barcode));
  };

  const calculateDays = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
  };

  const getItemPrice = (item) => {
    const days = calculateDays();
    const tariff = tariffs.find(t => t.item_type === item.item_type);
    if (!tariff) return 0;
    
    if (days === 1) return tariff.days_1;
    if (days <= 3) return tariff.days_2_3;
    if (days <= 7) return tariff.days_4_7;
    return tariff.week;
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + getItemPrice(item), 0);
  };

  const completeRental = async () => {
    if (!customer) {
      toast.error("Selecciona un cliente");
      return;
    }
    if (items.length === 0) {
      toast.error("Añade al menos un artículo");
      return;
    }
    
    setLoading(true);
    try {
      const total = calculateTotal();
      const paid = parseFloat(paidAmount) || (paymentMethod !== 'pending' ? total : 0);
      
      await rentalApi.create({
        customer_id: customer.id,
        start_date: startDate,
        end_date: endDate,
        items: items.map(i => ({ barcode: i.barcode, person_name: i.person_name })),
        payment_method: paymentMethod,
        total_amount: total,
        paid_amount: paid,
        deposit: parseFloat(deposit) || 0,
        notes: notes
      });
      
      toast.success("Alquiler completado correctamente");
      
      // Reset form
      setCustomer(null);
      setCustomerHistory(null);
      setItems([]);
      setSearchTerm("");
      setPaidAmount("");
      setDeposit("");
      setNotes("");
      
      // Focus search
      if (searchRef.current) searchRef.current.focus();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear alquiler");
    } finally {
      setLoading(false);
    }
  };

  const days = calculateDays();
  const total = calculateTotal();

  return (
    <div className="p-6 lg:p-8" data-testid="new-rental-page">
      <h1 className="text-3xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Plus Jakarta Sans' }}>
        Nuevo Alquiler
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel - Customer */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-slate-500" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  ref={searchRef}
                  placeholder="DNI, nombre o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchCustomer()}
                  className="h-11"
                  data-testid="customer-search-input"
                  autoFocus
                />
                <Button 
                  onClick={searchCustomer} 
                  disabled={searchLoading}
                  className="h-11 px-4"
                  data-testid="customer-search-btn"
                >
                  {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {customer && (
                <div className="p-4 rounded-xl bg-slate-50 animate-fade-in">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{customer.name}</p>
                      <p className="text-sm text-slate-500 font-mono">{customer.dni}</p>
                      {customer.phone && <p className="text-sm text-slate-500">{customer.phone}</p>}
                    </div>
                    <Badge variant="secondary">{customer.total_rentals || 0} alquileres</Badge>
                  </div>
                  
                  {customerHistory?.preferred_sizes && Object.keys(customerHistory.preferred_sizes).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                        <History className="h-3 w-3" /> Tallas preferidas
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(customerHistory.preferred_sizes).map(([type, sizes]) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type}: {sizes.join(", ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowNewCustomer(true)}
                data-testid="new-customer-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente
              </Button>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card className="border-slate-200">
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Desde</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-11 mt-1"
                    data-testid="start-date-input"
                  />
                </div>
                <div>
                  <Label>Hasta</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-11 mt-1"
                    data-testid="end-date-input"
                  />
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/5">
                <span className="text-2xl font-bold text-primary">{days}</span>
                <span className="text-slate-600 ml-2">{days === 1 ? 'día' : 'días'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Items */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-slate-500" />
                Artículos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    ref={barcodeRef}
                    placeholder="Escanear código de barras..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={addItemByBarcode}
                    className="h-12 pl-10 text-lg font-mono"
                    data-testid="barcode-input"
                  />
                </div>
              </div>

              <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <Package className="h-12 w-12 mb-2" />
                    <p>Escanea artículos para añadirlos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div 
                        key={item.barcode}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-50 animate-fade-in"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`status-${item.item_type === 'ski' ? 'available' : 'rented'}`}>
                              {item.item_type}
                            </Badge>
                            <span className="font-mono text-sm text-slate-500">{item.barcode}</span>
                          </div>
                          <p className="font-medium text-slate-900 mt-1">
                            {item.brand} {item.model}
                          </p>
                          <p className="text-sm text-slate-500">Talla: {item.size}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-lg font-bold text-slate-900">
                            €{getItemPrice(item).toFixed(2)}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.barcode)}
                            className="text-slate-400 hover:text-red-500"
                            data-testid={`remove-item-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Método de Pago</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-11 mt-1" data-testid="payment-method-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(method => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Importe Pagado</Label>
                  <Input
                    type="number"
                    placeholder={total.toFixed(2)}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="h-11 mt-1"
                    data-testid="paid-amount-input"
                  />
                </div>
                <div>
                  <Label>Depósito</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    className="h-11 mt-1"
                    data-testid="deposit-input"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 mt-4">
                <div>
                  <p className="text-sm text-slate-500">Total a pagar</p>
                  <p className="text-3xl font-bold text-slate-900">€{total.toFixed(2)}</p>
                </div>
                <Button
                  size="lg"
                  onClick={completeRental}
                  disabled={loading || !customer || items.length === 0}
                  className="h-14 px-8 text-lg font-semibold"
                  data-testid="complete-rental-btn"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Check className="h-5 w-5 mr-2" />
                  )}
                  Completar Alquiler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>DNI/Pasaporte *</Label>
                <Input
                  value={newCustomer.dni}
                  onChange={(e) => setNewCustomer({ ...newCustomer, dni: e.target.value.toUpperCase() })}
                  className="h-11 mt-1"
                  data-testid="new-customer-dni"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="h-11 mt-1"
                  data-testid="new-customer-phone"
                />
              </div>
            </div>
            <div>
              <Label>Nombre Completo *</Label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                className="h-11 mt-1"
                data-testid="new-customer-name"
              />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                className="h-11 mt-1"
                data-testid="new-customer-address"
              />
            </div>
            <div>
              <Label>Población</Label>
              <Input
                value={newCustomer.city}
                onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                className="h-11 mt-1"
                data-testid="new-customer-city"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomer(false)}>
              Cancelar
            </Button>
            <Button onClick={createNewCustomer} data-testid="save-new-customer-btn">
              Guardar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
