import { useState, useEffect, useRef, useCallback } from "react";
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
  Barcode,
  Calendar,
  Clock,
  ArrowRight,
  Edit2,
  X
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

const ITEM_TYPES = [
  { value: "all", label: "Todos" },
  { value: "ski", label: "Esquís" },
  { value: "snowboard", label: "Snowboard" },
  { value: "boots", label: "Botas" },
  { value: "helmet", label: "Casco" },
  { value: "poles", label: "Bastones" },
];

const CATEGORIES = [
  { value: "all", label: "Todas" },
  { value: "SUPERIOR", label: "Gama Superior" },
  { value: "ALTA", label: "Gama Alta" },
  { value: "MEDIA", label: "Gama Media" },
];

const getCategoryBadge = (category) => {
  const styles = {
    SUPERIOR: "bg-purple-100 text-purple-700 border-purple-200",
    ALTA: "bg-blue-100 text-blue-700 border-blue-200",
    MEDIA: "bg-emerald-100 text-emerald-700 border-emerald-200"
  };
  return styles[category] || styles.MEDIA;
};

// Helper: Get smart start date based on time
const getSmartStartDate = () => {
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 15) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  return now.toISOString().split('T')[0];
};

const addDays = (dateStr, days) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days - 1);
  return date.toISOString().split('T')[0];
};

const calculateDaysBetween = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = endDate - startDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
};

const formatDateDisplay = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
};

export default function NewRental() {
  const [searchTerm, setSearchTerm] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [customer, setCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState(null);
  const [items, setItems] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  
  // Smart date system
  const [numDays, setNumDays] = useState(1);
  const [startDate, setStartDate] = useState(getSmartStartDate());
  const [endDate, setEndDate] = useState(getSmartStartDate());
  const [showTimeHint, setShowTimeHint] = useState(true);
  
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [deposit, setDeposit] = useState("");
  const [notes, setNotes] = useState("");
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ dni: "", name: "", phone: "", address: "", city: "", source: "" });
  
  // Item search modal
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [itemSearchType, setItemSearchType] = useState("all");
  const [itemSearchCategory, setItemSearchCategory] = useState("all");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingItems, setSearchingItems] = useState(false);
  
  // Price editing
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [editingItemPrice, setEditingItemPrice] = useState(null);
  
  // Sources
  const [sources, setSources] = useState([]);
  
  const barcodeRef = useRef(null);
  const searchRef = useRef(null);
  const daysRef = useRef(null);

  useEffect(() => {
    loadTariffs();
    loadSources();
    const timer = setTimeout(() => setShowTimeHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (customer && daysRef.current) {
      daysRef.current.focus();
    }
  }, [customer]);

  // Keyboard shortcut for item search (F3 or Alt+B)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F3' || (e.altKey && e.key === 'b')) {
        e.preventDefault();
        setShowItemSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadTariffs = async () => {
    try {
      const response = await tariffApi.getAll();
      setTariffs(response.data);
    } catch (error) {
      console.error("Error loading tariffs:", error);
    }
  };

  const loadSources = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/sources`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSources(data);
      }
    } catch (error) {
      console.log("Sources not loaded");
    }
  };

  // Smart date handlers
  const handleNumDaysChange = (value) => {
    const days = Math.max(1, parseInt(value) || 1);
    setNumDays(days);
    setEndDate(addDays(startDate, days));
    if (days > 30) {
      toast.info("Alquiler de larga duración: " + days + " días");
    }
  };

  const handleStartDateChange = (value) => {
    setStartDate(value);
    setEndDate(addDays(value, numDays));
  };

  const handleEndDateChange = (value) => {
    setEndDate(value);
    const calculatedDays = calculateDaysBetween(startDate, value);
    setNumDays(calculatedDays);
  };

  const handleDaysKeyDown = (e) => {
    if (e.key === 'Enter' && barcodeRef.current) {
      e.preventDefault();
      barcodeRef.current.focus();
    }
  };

  const getTimeHintMessage = () => {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hour}:${minutes}h`;
    
    if (hour >= 15) {
      return `Inicio mañana porque son las ${timeStr}`;
    }
    return `Inicio hoy porque son las ${timeStr}`;
  };

  const searchCustomer = async () => {
    if (!searchTerm.trim()) return;
    
    setSearchLoading(true);
    try {
      try {
        const response = await customerApi.getByDni(searchTerm);
        setCustomer(response.data);
        loadCustomerHistory(response.data.id);
        toast.success(`Cliente encontrado: ${response.data.name}`);
        return;
      } catch (e) {}
      
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
      setNewCustomer({ dni: "", name: "", phone: "", address: "", city: "", source: "" });
      toast.success("Cliente creado correctamente");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear cliente");
    }
  };

  // Item search functions
  const searchItems = async () => {
    setSearchingItems(true);
    try {
      const params = new URLSearchParams();
      params.append('status', 'available');
      if (itemSearchTerm) params.append('search', itemSearchTerm);
      if (itemSearchType && itemSearchType !== 'all') params.append('item_type', itemSearchType);
      if (itemSearchCategory && itemSearchCategory !== 'all') params.append('category', itemSearchCategory);
      
      const response = await itemApi.getAll({
        status: 'available',
        search: itemSearchTerm || undefined,
        item_type: (itemSearchType && itemSearchType !== 'all') ? itemSearchType : undefined,
        category: (itemSearchCategory && itemSearchCategory !== 'all') ? itemSearchCategory : undefined
      });
      
      // Filter out already added items
      const addedBarcodes = items.map(i => i.barcode);
      setSearchResults(response.data.filter(i => !addedBarcodes.includes(i.barcode)));
    } catch (error) {
      toast.error("Error al buscar artículos");
    } finally {
      setSearchingItems(false);
    }
  };

  useEffect(() => {
    if (showItemSearch) {
      searchItems();
    }
  }, [showItemSearch, itemSearchTerm, itemSearchType, itemSearchCategory]);

  const addItemFromSearch = (item) => {
    setItems([...items, { ...item, customPrice: null }]);
    toast.success(`${item.brand} ${item.model} añadido`);
    // Update search results
    setSearchResults(searchResults.filter(i => i.barcode !== item.barcode));
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
      
      setItems([...items, { ...item, customPrice: null }]);
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

  const updateItemPrice = (barcode, newPrice) => {
    setItems(items.map(item => 
      item.barcode === barcode 
        ? { ...item, customPrice: parseFloat(newPrice) || null }
        : item
    ));
    setEditingItemPrice(null);
  };

  const getItemPrice = (item) => {
    if (item.customPrice !== null && item.customPrice !== undefined) {
      return item.customPrice;
    }
    
    const tariff = tariffs.find(t => t.item_type === item.item_type);
    if (!tariff) return 0;
    
    // Use daily pricing if available (day_1 to day_10, then day_11_plus)
    if (numDays <= 10 && tariff[`day_${numDays}`] !== null && tariff[`day_${numDays}`] !== undefined) {
      return tariff[`day_${numDays}`];
    }
    if (numDays > 10 && tariff.day_11_plus !== null && tariff.day_11_plus !== undefined) {
      return tariff.day_11_plus;
    }
    
    // Fallback to legacy pricing structure
    if (numDays === 1 && tariff.days_1) return tariff.days_1;
    if (numDays <= 3 && tariff.days_2_3) return tariff.days_2_3;
    if (numDays <= 7 && tariff.days_4_7) return tariff.days_4_7;
    if (tariff.week) return tariff.week;
    
    return 0;
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + getItemPrice(item), 0);
  };

  const getProviderDiscount = () => {
    if (!customer?.source) return 0;
    const provider = sources.find(s => s.name === customer.source);
    return provider?.discount_percent || 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    let total = subtotal;
    
    // Apply provider discount first
    const providerDiscount = getProviderDiscount();
    if (providerDiscount > 0) {
      total = total - (total * (providerDiscount / 100));
    }
    
    // Then apply manual discount if any
    if (discountType === 'percent' && discountValue) {
      const discount = total * (parseFloat(discountValue) / 100);
      total = total - discount;
    }
    if (discountType === 'fixed' && discountValue) {
      total = total - parseFloat(discountValue);
    }
    
    return total;
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
        items: items.map(i => ({ barcode: i.barcode, person_name: "" })),
        payment_method: paymentMethod,
        total_amount: total,
        paid_amount: paid,
        deposit: parseFloat(deposit) || 0,
        notes: notes + (discountReason ? ` | Descuento: ${discountReason}` : '')
      });
      
      toast.success("Alquiler completado correctamente");
      resetForm();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear alquiler");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCustomer(null);
    setCustomerHistory(null);
    setItems([]);
    setSearchTerm("");
    setPaidAmount("");
    setDeposit("");
    setNotes("");
    setNumDays(1);
    setStartDate(getSmartStartDate());
    setEndDate(getSmartStartDate());
    setDiscountType('none');
    setDiscountValue("");
    setDiscountReason("");
    
    if (searchRef.current) searchRef.current.focus();
  };

  const subtotal = calculateSubtotal();
  const total = calculateTotal();
  const hasDiscount = total < subtotal;

  return (
    <div className="p-6 lg:p-8" data-testid="new-rental-page">
      <h1 className="text-3xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Plus Jakarta Sans' }}>
        Nuevo Alquiler
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel - Customer & Dates */}
        <div className="lg:col-span-4 space-y-4">
          {/* Customer Card */}
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
                      {customer.source && (
                        <Badge variant="outline" className="mt-1 text-xs">{customer.source}</Badge>
                      )}
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

          {/* Smart Dates Card */}
          <Card className="border-slate-200 border-primary/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Duración del Alquiler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/5 rounded-xl p-4">
                <Label className="text-sm font-medium text-slate-700">Número de días</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Input
                    ref={daysRef}
                    type="number"
                    min="1"
                    value={numDays}
                    onChange={(e) => handleNumDaysChange(e.target.value)}
                    onKeyDown={handleDaysKeyDown}
                    className="h-14 text-3xl font-bold text-center w-24 border-primary/30"
                    data-testid="num-days-input"
                  />
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-2 text-lg font-medium text-slate-700">
                      <span>{formatDateDisplay(startDate)}</span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                      <span>{formatDateDisplay(endDate)}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {numDays} {numDays === 1 ? 'día' : 'días'}
                    </p>
                  </div>
                </div>
              </div>

              {showTimeHint && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg animate-fade-in">
                  <Clock className="h-3 w-3" />
                  <span>{getTimeHintMessage()}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Desde</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="h-10 mt-1 text-sm"
                    data-testid="start-date-input"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Hasta</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="h-10 mt-1 text-sm"
                    data-testid="end-date-input"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {[1, 2, 3, 5, 7].map(d => (
                  <Button
                    key={d}
                    variant={numDays === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleNumDaysChange(d)}
                    className="flex-1"
                  >
                    {d}d
                  </Button>
                ))}
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
              {/* Barcode + Manual Search */}
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
                <Button 
                  variant="outline" 
                  onClick={() => setShowItemSearch(true)}
                  className="h-12 px-4"
                  data-testid="manual-search-btn"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>
              <p className="text-xs text-slate-500">Escanea el código o pulsa F3 / Alt+B para buscar manualmente</p>

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
                            <Badge variant="outline">{item.item_type}</Badge>
                            <Badge className={getCategoryBadge(item.category || 'MEDIA')}>
                              {item.category || 'MEDIA'}
                            </Badge>
                            <span className="font-mono text-sm text-slate-500">{item.barcode}</span>
                          </div>
                          <p className="font-medium text-slate-900 mt-1">
                            {item.brand} {item.model}
                          </p>
                          <p className="text-sm text-slate-500">Talla: {item.size}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {editingItemPrice === item.barcode ? (
                            <Input
                              type="number"
                              defaultValue={getItemPrice(item)}
                              className="w-20 h-8 text-right"
                              autoFocus
                              onBlur={(e) => updateItemPrice(item.barcode, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') updateItemPrice(item.barcode, e.target.value);
                                if (e.key === 'Escape') setEditingItemPrice(null);
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => setEditingItemPrice(item.barcode)}
                              className="text-lg font-bold text-slate-900 hover:text-primary flex items-center gap-1"
                            >
                              €{getItemPrice(item).toFixed(2)}
                              <Edit2 className="h-3 w-3 opacity-50" />
                            </button>
                          )}
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

          {/* Payment Card */}
          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                <div>
                  <Label>Descuento</Label>
                  <div className="flex gap-1 mt-1">
                    <Select value={discountType} onValueChange={setDiscountType}>
                      <SelectTrigger className="w-20 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        <SelectItem value="percent">%</SelectItem>
                        <SelectItem value="fixed">€</SelectItem>
                      </SelectContent>
                    </Select>
                    {discountType !== 'none' && (
                      <Input
                        type="number"
                        placeholder="0"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className="h-11 flex-1"
                      />
                    )}
                  </div>
                </div>
              </div>

              {hasDiscount && (
                <div className="mb-4">
                  <Input
                    placeholder="Motivo del descuento (opcional): grupo, VIP, etc."
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              )}

              {/* Provider Discount Info */}
              {customer?.source && getProviderDiscount() > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Descuento {customer.source}
                    </p>
                    <p className="text-xs text-blue-700">
                      Se aplicará automáticamente {getProviderDiscount()}% de descuento
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    -{getProviderDiscount()}%
                  </Badge>
                </div>
              )}

              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 mt-4">
                <div className="flex-1">
                  {(hasDiscount || getProviderDiscount() > 0) && (
                    <p className="text-sm text-slate-500 line-through">€{subtotal.toFixed(2)}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm text-slate-500">Total a pagar</p>
                      <p className="text-3xl font-bold text-slate-900">€{total.toFixed(2)}</p>
                      {getProviderDiscount() > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          Incluye descuento {customer.source}
                        </p>
                      )}
                    </div>
                    {(hasDiscount || getProviderDiscount() > 0) && (
                      <Badge className="bg-emerald-100 text-emerald-700">
                        -€{(subtotal - total).toFixed(2)}
                      </Badge>
                    )}
                  </div>
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
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Población</Label>
                <Input
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                  className="h-11 mt-1"
                />
              </div>
              <div>
                <Label>Proveedor/Fuente</Label>
                <Select 
                  value={newCustomer.source || "none"} 
                  onValueChange={(v) => setNewCustomer({ ...newCustomer, source: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="h-11 mt-1">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    <SelectItem value="Web propia">Web propia</SelectItem>
                    <SelectItem value="Booking.com">Booking.com</SelectItem>
                    <SelectItem value="Expedia">Expedia</SelectItem>
                    <SelectItem value="Hotel">Hotel</SelectItem>
                    <SelectItem value="Recomendación">Recomendación</SelectItem>
                    <SelectItem value="Walk-in">Walk-in (pie de tienda)</SelectItem>
                    {sources.map(s => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

      {/* Manual Item Search Dialog */}
      <Dialog open={showItemSearch} onOpenChange={setShowItemSearch}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Buscar Artículo Manualmente</DialogTitle>
          </DialogHeader>
          
          {/* Search Filters */}
          <div className="grid grid-cols-3 gap-3 py-4">
            <Input
              placeholder="Código, marca, modelo..."
              value={itemSearchTerm}
              onChange={(e) => setItemSearchTerm(e.target.value)}
              className="h-11"
              autoFocus
            />
            <Select value={itemSearchType} onValueChange={setItemSearchType}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={itemSearchCategory} onValueChange={setItemSearchCategory}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {searchingItems ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No se encontraron artículos disponibles</p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((item) => (
                  <div 
                    key={item.barcode}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                    onClick={() => addItemFromSearch(item)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Package className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{item.item_type}</Badge>
                          <Badge className={`${getCategoryBadge(item.category || 'MEDIA')} text-xs`}>
                            {item.category || 'MEDIA'}
                          </Badge>
                          <span className="font-mono text-xs text-slate-400">{item.barcode}</span>
                        </div>
                        <p className="font-medium text-slate-900">
                          {item.brand} {item.model} - {item.size}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemSearch(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
