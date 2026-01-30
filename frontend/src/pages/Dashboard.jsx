import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { dashboardApi } from "@/lib/api";
import axios from "axios";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  ShoppingCart, 
  RotateCcw, 
  DollarSign, 
  Package,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  Loader2,
  Wrench,
  Calendar,
  ArrowUp,
  ArrowDown,
  Trophy,
  Zap,
  AlertCircle,
  ChevronRight,
  CalendarRange,
  X,
  Search,
  Scan,
  ArrowLeftRight,
  User,
  Phone,
  CreditCard,
  Banknote,
  CheckCircle,
  Printer,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [returnsControl, setReturnsControl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("week");
  const [selectedDay, setSelectedDay] = useState(null);
  const [dateRange, setDateRange] = useState(null); // { from: Date, to: Date }
  const [customDateActive, setCustomDateActive] = useState(false);
  const navigate = useNavigate();

  // ============ GLOBAL LOOKUP STATE ============
  const [searchCode, setSearchCode] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const searchInputRef = useRef(null);

  // ============ QUICK MANAGEMENT MODAL STATE ============
  const [quickModal, setQuickModal] = useState(false);
  const [quickRental, setQuickRental] = useState(null);
  const [quickItem, setQuickItem] = useState(null); // Item that triggered the lookup
  const [quickNewBarcode, setQuickNewBarcode] = useState("");
  const [quickNewItem, setQuickNewItem] = useState(null);
  const [quickSwapOldItem, setQuickSwapOldItem] = useState(null);
  const [quickDelta, setQuickDelta] = useState(null);
  const [quickNewDays, setQuickNewDays] = useState("");
  const [quickPaymentMethod, setQuickPaymentMethod] = useState("cash");
  const [quickProcessing, setQuickProcessing] = useState(false);
  const [quickComplete, setQuickComplete] = useState(false);
  const [quickAction, setQuickAction] = useState("swap"); // "swap" or "return"
  const quickSwapInputRef = useRef(null);

  useEffect(() => {
    loadDashboard();
    loadReturnsControl();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [analyticsPeriod]);

  const loadDashboard = async () => {
    try {
      const response = await dashboardApi.get();
      setData(response.data);
    } catch (error) {
      toast.error("Error al cargar el dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadReturnsControl = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/returns-control`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setReturnsControl(response.data);
    } catch (error) {
      console.error("Error loading returns control:", error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const params = {};
      
      if (customDateActive && dateRange?.from && dateRange?.to) {
        // Custom date range mode
        params.start_date = format(dateRange.from, 'yyyy-MM-dd');
        params.end_date = format(dateRange.to, 'yyyy-MM-dd');
      } else {
        // Predefined period mode
        params.period = analyticsPeriod;
      }
      
      const response = await axios.get(`${API}/dashboard/analytics`, {
        params,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  const applyCustomDateRange = () => {
    if (dateRange?.from && dateRange?.to) {
      setCustomDateActive(true);
      loadAnalytics();
      toast.success(`Filtro aplicado: ${format(dateRange.from, 'dd/MM/yyyy', {locale: es})} - ${format(dateRange.to, 'dd/MM/yyyy', {locale: es})}`);
    } else {
      toast.error("Selecciona un rango de fechas válido");
    }
  };

  const clearCustomDateRange = () => {
    setCustomDateActive(false);
    setDateRange(null);
    loadAnalytics();
    toast.info("Filtro de fecha eliminado");
  };

  // ============ GLOBAL LOOKUP FUNCTIONS ============

  // Auto-focus on search input when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleGlobalSearch = async (code) => {
    if (!code || code.trim().length < 2) return;
    
    setSearchLoading(true);
    try {
      const response = await axios.get(`${API}/lookup/${encodeURIComponent(code.trim())}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const result = response.data;
      setLookupResult(result);
      
      if (result.found) {
        if (result.type === "rented_item") {
          // SCENARIO A: Item is rented - Open Quick Management Modal
          toast.success(`✓ ${result.item?.internal_code || result.item?.barcode}: Alquilado por ${result.rental?.customer_name}`);
          openQuickModal(result.rental, result.item);
        } else if (result.type === "customer") {
          // SCENARIO B: Customer found with active rental
          toast.success(`✓ Cliente encontrado: ${result.customer?.name}`);
          openQuickModal(result.rental, null);
        } else if (result.type === "multiple_customers") {
          // Multiple customers - show selection
          toast.info(`${result.customers.length} clientes encontrados`);
        } else if (result.type === "available_item") {
          toast.info(`Artículo ${result.item?.internal_code || result.item?.barcode} disponible (${result.item?.status})`);
        } else if (result.type === "customer_no_rental") {
          toast.warning("Cliente encontrado pero sin alquileres activos");
        }
      } else {
        toast.error(result.message || "No encontrado");
      }
    } catch (error) {
      toast.error("Error en la búsqueda");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchCode.trim()) {
      handleGlobalSearch(searchCode);
    }
  };

  // ============ QUICK MANAGEMENT MODAL FUNCTIONS ============

  const openQuickModal = (rental, triggerItem) => {
    setQuickRental(rental);
    setQuickItem(triggerItem);
    setQuickSwapOldItem(triggerItem?.rental_item_data || triggerItem);
    setQuickNewBarcode("");
    setQuickNewItem(null);
    setQuickDelta(null);
    setQuickComplete(false);
    setQuickAction("swap");
    setQuickPaymentMethod("cash");
    
    // Set days remaining
    const daysRemaining = rental?.days_remaining || rental?.days || 1;
    setQuickNewDays(daysRemaining.toString());
    
    setQuickModal(true);
    
    // Auto-focus swap input
    setTimeout(() => {
      quickSwapInputRef.current?.focus();
    }, 200);
  };

  const closeQuickModal = () => {
    setQuickModal(false);
    setQuickRental(null);
    setQuickItem(null);
    setQuickNewItem(null);
    setQuickSwapOldItem(null);
    setQuickDelta(null);
    setQuickComplete(false);
    setSearchCode("");
    setLookupResult(null);
    
    // Re-focus main search
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleQuickSwapSearch = async (code) => {
    if (!code.trim() || !quickRental) return;
    
    setSearchLoading(true);
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

      setQuickNewItem(foundItem);

      // If no old item pre-selected, try to auto-match by type
      if (!quickSwapOldItem) {
        const activeItems = quickRental.items.filter(i => !i.returned);
        const matchingItem = activeItems.find(i => 
          i.item_type?.toLowerCase() === foundItem.item_type?.toLowerCase()
        );
        if (matchingItem) {
          setQuickSwapOldItem(matchingItem);
          toast.success(`Sustitución: ${matchingItem.internal_code || matchingItem.barcode} → ${foundItem.internal_code || foundItem.barcode}`);
        }
      } else {
        toast.success(`Nuevo artículo: ${foundItem.internal_code || foundItem.barcode}`);
      }

      // Calculate price delta
      await calculateQuickDelta(quickSwapOldItem, foundItem);

    } catch (error) {
      toast.error("Error al buscar artículo");
    } finally {
      setSearchLoading(false);
    }
  };

  const calculateQuickDelta = async (oldItem, newItem) => {
    if (!quickRental || !oldItem || !newItem) {
      setQuickDelta({ oldPrice: 0, newPrice: 0, delta: 0, days: parseInt(quickNewDays) || 1, isEqual: true });
      return;
    }

    try {
      const tariffsRes = await axios.get(`${API}/tariffs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const tariffs = tariffsRes.data;
      const days = parseInt(quickNewDays) || quickRental.days_remaining || 1;

      const oldTariff = tariffs.find(t => t.item_type?.toLowerCase() === oldItem.item_type?.toLowerCase());
      const oldDayField = days <= 10 ? `day_${days}` : 'day_11_plus';
      const oldPrice = oldTariff?.[oldDayField] || oldItem.unit_price || 0;

      const newTariff = tariffs.find(t => t.item_type?.toLowerCase() === newItem.item_type?.toLowerCase());
      const newDayField = days <= 10 ? `day_${days}` : 'day_11_plus';
      const newPrice = newTariff?.[newDayField] || newItem.rental_price || 0;

      const delta = newPrice - oldPrice;

      setQuickDelta({
        oldPrice,
        newPrice,
        delta,
        days,
        isUpgrade: delta > 0,
        isDowngrade: delta < 0,
        isEqual: delta === 0
      });
    } catch {
      setQuickDelta({ oldPrice: 0, newPrice: 0, delta: 0, days: parseInt(quickNewDays) || 1, isEqual: true });
    }
  };

  // Recalculate when days change
  useEffect(() => {
    if (quickSwapOldItem && quickNewItem) {
      calculateQuickDelta(quickSwapOldItem, quickNewItem);
    }
  }, [quickNewDays]);

  const executeQuickSwap = async () => {
    if (!quickRental || !quickNewItem || !quickSwapOldItem) {
      toast.error("Faltan datos para el cambio");
      return;
    }

    setQuickProcessing(true);
    try {
      await axios.post(`${API}/rentals/${quickRental.id}/central-swap`, {
        old_item_barcode: quickSwapOldItem.barcode || quickSwapOldItem.internal_code,
        new_item_barcode: quickNewItem.barcode || quickNewItem.internal_code,
        days_remaining: parseInt(quickNewDays) || quickRental.days_remaining,
        payment_method: quickPaymentMethod,
        delta_amount: quickDelta?.delta || 0
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      setQuickComplete(true);
      toast.success("✅ Cambio realizado correctamente");
      loadDashboard();

    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al procesar el cambio");
    } finally {
      setQuickProcessing(false);
    }
  };

  const executeQuickReturn = async () => {
    if (!quickRental || !quickSwapOldItem) {
      toast.error("Faltan datos para la devolución");
      return;
    }

    setQuickProcessing(true);
    try {
      // Return the specific item
      await axios.post(`${API}/rentals/${quickRental.id}/return-item`, {
        item_barcode: quickSwapOldItem.barcode || quickSwapOldItem.internal_code
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      setQuickComplete(true);
      toast.success("✅ Artículo devuelto correctamente");
      loadDashboard();

    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al procesar la devolución");
    } finally {
      setQuickProcessing(false);
    }
  };

  const printQuickTicket = () => {
    if (!quickRental || !quickDelta) return;
    
    const ticketWindow = window.open('', '_blank', 'width=400,height=600');
    ticketWindow.document.write(`
      <!DOCTYPE html><html><head><title>Ticket</title>
      <style>
        @media print { @page { margin: 0; size: 80mm auto; } }
        body { font-family: 'Courier New', monospace; width: 80mm; padding: 5mm; margin: 0 auto; font-size: 11px; }
        .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 10px; }
        .section { border-bottom: 1px dashed #ccc; padding: 8px 0; }
        .row { display: flex; justify-content: space-between; padding: 3px 0; }
        .delta-box { text-align: center; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .delta-positive { background: #dcfce7; color: #166534; }
        .delta-negative { background: #fee2e2; color: #991b1b; }
        .delta-amount { font-size: 24px; font-weight: bold; }
        .print-btn { display: block; width: 100%; padding: 10px; margin-top: 15px; background: #2563eb; color: white; border: none; cursor: pointer; }
        @media print { .print-btn { display: none; } }
      </style></head><body>
        <div class="header"><h1>COMPROBANTE DE CAMBIO</h1></div>
        <div class="section">
          <div class="row"><span>Cliente:</span><strong>${quickRental.customer_name}</strong></div>
          <div class="row"><span>DNI:</span><strong>${quickRental.customer_dni || '-'}</strong></div>
        </div>
        <div class="section">
          <p><strong>❌ DEVUELVE:</strong> ${quickSwapOldItem?.internal_code || quickSwapOldItem?.barcode}</p>
          <p><strong>✅ RECIBE:</strong> ${quickNewItem?.internal_code || quickNewItem?.barcode}</p>
        </div>
        <div class="delta-box ${quickDelta.delta > 0 ? 'delta-positive' : 'delta-negative'}">
          <p>${quickDelta.delta > 0 ? 'SUPLEMENTO' : 'ABONO'}</p>
          <p class="delta-amount">${quickDelta.delta > 0 ? '+' : '-'}€${Math.abs(quickDelta.delta).toFixed(2)}</p>
        </div>
        <p style="text-align:center;font-size:9px;">${new Date().toLocaleString('es-ES')}</p>
        <button class="print-btn" onclick="window.print();setTimeout(()=>window.close(),500)">IMPRIMIR</button>
      </body></html>
    `);
    ticketWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = data?.stats || {};
  const inventory = stats?.inventory || {};
  const occupancy = data?.occupancy_by_category || {};
  const alerts = data?.alerts || [];

  const maintenanceAlerts = alerts.filter(a => a.type === 'maintenance');
  const overdueAlerts = alerts.filter(a => a.type === 'overdue');

  const categoryColors = {
    SUPERIOR: { bg: 'bg-purple-100', bar: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50' },
    ALTA: { bg: 'bg-blue-100', bar: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50' },
    MEDIA: { bg: 'bg-emerald-100', bar: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50' }
  };

  const getAvailabilityColor = (status) => {
    switch(status) {
      case 'high': return 'bg-emerald-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-slate-300';
    }
  };

  const getAvailabilityBg = (status) => {
    switch(status) {
      case 'high': return 'bg-emerald-50 border-emerald-200';
      case 'medium': return 'bg-amber-50 border-amber-200';
      case 'low': return 'bg-red-50 border-red-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  const periodLabels = {
    today: "Hoy",
    week: "Esta Semana",
    month: "Este Mes"
  };

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="dashboard">
      {/* ============ GLOBAL SEARCH BAR - SCAN TO ACTION ============ */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-slate-50 shadow-lg">
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
                <Scan className="h-6 w-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="font-bold text-slate-800">Búsqueda Rápida</p>
                <p className="text-xs text-slate-500">Escanea o escribe código/nombre</p>
              </div>
            </div>
            
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  ref={searchInputRef}
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="SKI-001, BOT-002, Juan Pérez..."
                  className="h-14 pl-12 pr-24 text-lg font-mono bg-white border-2 border-slate-200 focus:border-blue-400 rounded-xl shadow-inner"
                  data-testid="global-search-input"
                />
                <Button
                  onClick={() => handleGlobalSearch(searchCode)}
                  disabled={searchLoading || !searchCode.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-4 bg-blue-600 hover:bg-blue-700"
                >
                  {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {/* Quick status indicators */}
            <div className="flex gap-2 shrink-0">
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <Package className="h-3 w-3 mr-1" />
                {stats.active_rentals || 0} activos
              </Badge>
            </div>
          </div>
          
          {/* Search Results Preview */}
          {lookupResult?.found && lookupResult.type === "multiple_customers" && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
              <p className="text-sm font-semibold text-slate-700 mb-2">Selecciona un cliente:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {lookupResult.customers.map((c, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="justify-start text-left h-auto py-2"
                    onClick={() => openQuickModal(c.rental, null)}
                  >
                    <User className="h-4 w-4 mr-2 text-blue-600" />
                    <div>
                      <p className="font-medium">{c.customer?.name}</p>
                      <p className="text-xs text-slate-500">{c.rental?.item_count} artículos</p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Vista general de tu negocio</p>
        </div>
        <div className="flex items-center gap-2">
          {/* BOTÓN GRANDE - NUEVO ALQUILER */}
          <Button 
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 text-base cursor-pointer shadow-lg hover:shadow-xl transition-all"
            onClick={() => navigate("/nuevo-alquiler")}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            NUEVO ALQUILER
          </Button>
        </div>
      </div>

      {/* ============ QUICK MANAGEMENT MODAL ============ */}
      <Dialog open={quickModal} onOpenChange={closeQuickModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Zap className="h-6 w-6 text-blue-600" />
              Gestión Rápida
            </DialogTitle>
            {quickRental && (
              <DialogDescription className="text-base">
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge className="bg-slate-100 text-slate-700 text-base px-3 py-1">
                    <User className="h-4 w-4 mr-1" />
                    {quickRental.customer_name}
                  </Badge>
                  <Badge variant="outline">{quickRental.customer_dni}</Badge>
                  <Badge className="bg-blue-100 text-blue-700">
                    {quickRental.days_remaining || quickRental.days} días restantes
                  </Badge>
                  <Badge className="bg-purple-100 text-purple-700">
                    {quickRental.item_count || quickRental.items?.length} artículos
                  </Badge>
                </div>
              </DialogDescription>
            )}
          </DialogHeader>

          {!quickComplete ? (
            <div className="space-y-5 py-4">
              {/* Action Tabs */}
              <Tabs value={quickAction} onValueChange={setQuickAction} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="swap" className="gap-2">
                    <ArrowLeftRight className="h-4 w-4" />
                    Cambiar Material
                  </TabsTrigger>
                  <TabsTrigger value="return" className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Devolver
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="swap" className="space-y-4 mt-4">
                  {/* Old item (being returned) */}
                  {quickSwapOldItem && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-xs text-red-600 font-semibold mb-1">❌ ARTÍCULO A DEVOLVER</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono font-bold text-lg">{quickSwapOldItem.internal_code || quickSwapOldItem.barcode}</p>
                          <p className="text-sm text-slate-600">{quickSwapOldItem.item_type}</p>
                        </div>
                        {quickDelta && <p className="font-semibold">€{quickDelta.oldPrice?.toFixed(2)}</p>}
                      </div>
                    </div>
                  )}

                  {/* New item scanner */}
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <Scan className="h-4 w-4 text-blue-600" />
                      Escanear Nuevo Artículo
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        ref={quickSwapInputRef}
                        value={quickNewBarcode}
                        onChange={(e) => setQuickNewBarcode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleQuickSwapSearch(quickNewBarcode);
                        }}
                        placeholder="Escanea o escribe código..."
                        className="h-12 text-lg font-mono flex-1"
                      />
                      <Button 
                        onClick={() => handleQuickSwapSearch(quickNewBarcode)}
                        disabled={searchLoading}
                        className="h-12"
                      >
                        {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* New item preview */}
                  {quickNewItem && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-xs text-green-600 font-semibold mb-1">✅ ARTÍCULO NUEVO</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono font-bold text-lg">{quickNewItem.internal_code || quickNewItem.barcode}</p>
                          <p className="text-sm text-slate-600">{quickNewItem.item_type} - {quickNewItem.brand} {quickNewItem.model}</p>
                        </div>
                        {quickDelta && <p className="font-semibold">€{quickDelta.newPrice?.toFixed(2)}</p>}
                      </div>
                    </div>
                  )}

                  {/* Price Delta */}
                  {quickDelta && quickNewItem && (
                    <div className={`p-4 rounded-xl border-2 text-center ${
                      quickDelta.isUpgrade ? 'bg-emerald-50 border-emerald-300' :
                      quickDelta.isDowngrade ? 'bg-red-50 border-red-300' :
                      'bg-slate-50 border-slate-300'
                    }`}>
                      <p className="text-sm font-medium mb-1">
                        {quickDelta.isUpgrade ? '⬆️ SUPLEMENTO' : quickDelta.isDowngrade ? '⬇️ ABONO' : '↔️ SIN DIFERENCIA'}
                      </p>
                      <p className={`text-3xl font-bold ${
                        quickDelta.isUpgrade ? 'text-emerald-600' :
                        quickDelta.isDowngrade ? 'text-red-600' : 'text-slate-600'
                      }`}>
                        {quickDelta.delta > 0 ? '+' : quickDelta.delta < 0 ? '-' : ''}€{Math.abs(quickDelta.delta).toFixed(2)}
                      </p>
                    </div>
                  )}

                  {/* Days adjustment */}
                  <div className="flex items-center gap-4">
                    <div>
                      <Label className="text-sm">Días restantes</Label>
                      <Input
                        type="number"
                        min="1"
                        value={quickNewDays}
                        onChange={(e) => setQuickNewDays(e.target.value)}
                        className="w-20 h-10"
                      />
                    </div>
                    
                    {quickDelta && quickDelta.delta !== 0 && (
                      <div className="flex-1">
                        <Label className="text-sm">Método de pago</Label>
                        <div className="flex gap-2 mt-1">
                          <Button
                            variant={quickPaymentMethod === "cash" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setQuickPaymentMethod("cash")}
                            className="flex-1"
                          >
                            <Banknote className="h-4 w-4 mr-1" /> Efectivo
                          </Button>
                          <Button
                            variant={quickPaymentMethod === "card" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setQuickPaymentMethod("card")}
                            className="flex-1"
                          >
                            <CreditCard className="h-4 w-4 mr-1" /> Tarjeta
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="return" className="space-y-4 mt-4">
                  {quickSwapOldItem ? (
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-sm text-amber-700 font-semibold mb-2">Artículo a devolver:</p>
                      <div className="flex items-center gap-3">
                        <Package className="h-8 w-8 text-amber-600" />
                        <div>
                          <p className="font-mono font-bold text-xl">{quickSwapOldItem.internal_code || quickSwapOldItem.barcode}</p>
                          <p className="text-slate-600">{quickSwapOldItem.item_type}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-4">Selecciona un artículo para devolver</p>
                  )}

                  {/* Item selector if not pre-selected */}
                  {quickRental?.items && (
                    <div>
                      <Label className="text-sm mb-2 block">Artículos del alquiler:</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {quickRental.items.filter(i => !i.returned).map((item, idx) => (
                          <Button
                            key={idx}
                            variant={quickSwapOldItem?.barcode === item.barcode ? "default" : "outline"}
                            className="justify-start text-left h-auto py-2"
                            onClick={() => setQuickSwapOldItem(item)}
                          >
                            <span className="font-mono text-sm">{item.internal_code || item.barcode}</span>
                            <span className="ml-2 text-xs opacity-70">{item.item_type}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            /* SUCCESS STATE */
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-emerald-800 mb-2">
                {quickAction === "swap" ? "¡Cambio Completado!" : "¡Devolución Completada!"}
              </h3>
              <p className="text-slate-600">Operación registrada correctamente.</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            {!quickComplete ? (
              <>
                <Button variant="outline" onClick={closeQuickModal}>Cancelar</Button>
                {quickAction === "swap" ? (
                  <Button
                    onClick={executeQuickSwap}
                    disabled={quickProcessing || !quickNewItem || !quickSwapOldItem}
                    className={`min-w-[180px] ${
                      quickDelta?.isUpgrade ? 'bg-emerald-600 hover:bg-emerald-700' :
                      quickDelta?.isDowngrade ? 'bg-red-600 hover:bg-red-700' : ''
                    }`}
                  >
                    {quickProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                    {quickDelta?.isUpgrade ? `Cobrar €${quickDelta.delta.toFixed(2)}` :
                     quickDelta?.isDowngrade ? `Abonar €${Math.abs(quickDelta.delta).toFixed(2)}` :
                     'Confirmar Cambio'}
                  </Button>
                ) : (
                  <Button
                    onClick={executeQuickReturn}
                    disabled={quickProcessing || !quickSwapOldItem}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {quickProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                    Devolver Artículo
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" onClick={closeQuickModal}>Cerrar</Button>
                {quickAction === "swap" && quickDelta && (
                  <Button onClick={printQuickTicket}>
                    <Printer className="h-4 w-4 mr-2" /> Imprimir
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Ingresos Hoy</p>
                <p className="text-2xl font-bold text-slate-900">€{(stats.revenue_today || 0).toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Alquileres Activos</p>
                <p className="text-2xl font-bold text-slate-900">{stats.active_rentals || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Ocupación Stock</p>
                <p className="text-2xl font-bold text-slate-900">{inventory.occupancy_percent || 0}%</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Devoluciones Hoy</p>
                <p className="text-2xl font-bold text-slate-900">{stats.returns_today || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <RotateCcw className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============ CONTROL DE DEVOLUCIONES - TORRE DE CONTROL ============ */}
      {returnsControl && returnsControl.total_pending > 0 && (
        <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 shadow-lg" data-testid="returns-control-panel">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center">
                  <RotateCcw className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-amber-900">Control de Devoluciones</span>
                  <p className="text-xs font-normal text-amber-700 mt-0.5">Material pendiente por recoger HOY</p>
                </div>
              </CardTitle>
              <div className="flex items-center gap-3">
                {returnsControl.is_past_closing && returnsControl.total_pending > 0 && (
                  <Badge className="bg-red-500 text-white animate-pulse px-3 py-1">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    ¡RETRASO!
                  </Badge>
                )}
                <div className={`text-3xl font-bold ${returnsControl.is_past_closing ? 'text-red-600' : 'text-amber-700'}`}>
                  {returnsControl.total_pending}
                  <span className="text-sm font-normal ml-1">artículos</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {returnsControl.pending_by_category.map((cat) => (
                <button
                  key={cat.item_type}
                  onClick={() => navigate(`/devoluciones?filter=${cat.item_type}`)}
                  className={`group p-4 rounded-xl border-2 transition-all hover:shadow-md hover:scale-[1.02] ${
                    returnsControl.is_past_closing 
                      ? 'border-red-300 bg-red-50 hover:border-red-400 hover:bg-red-100' 
                      : 'border-amber-200 bg-white hover:border-amber-400 hover:bg-amber-50'
                  }`}
                  data-testid={`return-control-${cat.item_type}`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`text-4xl font-bold mb-2 ${
                      returnsControl.is_past_closing ? 'text-red-600' : 'text-amber-700'
                    }`}>
                      {cat.count}
                    </div>
                    <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                      {cat.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">por devolver</p>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Ver lista
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>
            
            {returnsControl.is_past_closing && (
              <div className="mt-4 p-3 rounded-lg bg-red-100 border border-red-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">
                    Son las {returnsControl.current_hour}:00h y hay material sin devolver
                  </span>
                </div>
                <Button 
                  size="sm" 
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => navigate("/devoluciones")}
                >
                  Gestionar ahora
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============ WEEKLY AVAILABILITY CALENDAR ============ */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-500" />
              Vista Semanal de Ocupación
            </CardTitle>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-emerald-500"></div>
                Alta disp.
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-500"></div>
                Pocos
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                Crítico
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {analytics?.weekly_calendar ? (
            <div className="grid grid-cols-7 gap-2">
              {analytics.weekly_calendar.map((day, idx) => (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(selectedDay === day.date ? null : day.date)}
                  className={`p-3 rounded-xl border-2 transition-all hover:shadow-md ${
                    day.is_today 
                      ? 'border-blue-500 bg-blue-50' 
                      : selectedDay === day.date
                      ? 'border-slate-400 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Day Header */}
                  <div className="text-center mb-3">
                    <p className={`text-xs font-medium ${day.is_today ? 'text-blue-600' : 'text-slate-500'}`}>
                      {day.day_name}
                    </p>
                    <p className={`text-xl font-bold ${day.is_today ? 'text-blue-700' : 'text-slate-800'}`}>
                      {day.day_num}
                    </p>
                  </div>
                  
                  {/* Category Bars */}
                  <div className="space-y-2">
                    {['SUPERIOR', 'ALTA', 'MEDIA'].map(cat => {
                      const catData = day.categories[cat];
                      return (
                        <div key={cat} className="flex items-center gap-1">
                          <span className="text-[10px] font-medium text-slate-400 w-6">
                            {cat.charAt(0)}
                          </span>
                          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${getAvailabilityColor(catData.status)}`}
                              style={{ width: `${catData.percentage}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-600 w-8 text-right">
                            {catData.available}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Deliveries/Returns indicator */}
                  {(day.deliveries > 0 || day.returns > 0) && (
                    <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-slate-100">
                      {day.deliveries > 0 && (
                        <span className="flex items-center text-[10px] text-emerald-600">
                          <ArrowUp className="h-3 w-3" />
                          {day.deliveries}
                        </span>
                      )}
                      {day.returns > 0 && (
                        <span className="flex items-center text-[10px] text-blue-600">
                          <ArrowDown className="h-3 w-3" />
                          {day.returns}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}

          {/* Selected Day Details */}
          {selectedDay && analytics?.weekly_calendar && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              {(() => {
                const dayData = analytics.weekly_calendar.find(d => d.date === selectedDay);
                if (!dayData) return null;
                
                return (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-white border border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">Entregas</p>
                      <div className="flex items-center justify-center gap-1">
                        <ArrowUp className="h-5 w-5 text-emerald-500" />
                        <span className="text-2xl font-bold text-emerald-600">{dayData.deliveries}</span>
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white border border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">Devoluciones</p>
                      <div className="flex items-center justify-center gap-1">
                        <ArrowDown className="h-5 w-5 text-blue-500" />
                        <span className="text-2xl font-bold text-blue-600">{dayData.returns}</span>
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white border border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">Disponibilidad Media</p>
                      <span className="text-2xl font-bold text-slate-700">
                        {Math.round((dayData.categories.SUPERIOR.percentage + dayData.categories.ALTA.percentage + dayData.categories.MEDIA.percentage) / 3)}%
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ PERFORMANCE AND RANKINGS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rankings Panel */}
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Rendimiento de Inventario
              </CardTitle>
              
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Custom Date Range Selector */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant={customDateActive ? "default" : "outline"}
                      size="sm"
                      className={customDateActive ? "bg-primary text-white" : ""}
                    >
                      <CalendarRange className="h-4 w-4 mr-2" />
                      {customDateActive && dateRange?.from && dateRange?.to
                        ? `${format(dateRange.from, 'dd/MM/yy', {locale: es})} - ${format(dateRange.to, 'dd/MM/yy', {locale: es})}`
                        : "Rango Personalizado"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="p-4 border-b">
                      <p className="font-medium text-sm">Selecciona un rango de fechas</p>
                      <p className="text-xs text-slate-500 mt-1">Analiza el rendimiento histórico</p>
                    </div>
                    <CalendarComponent
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={es}
                      className="rounded-md"
                    />
                    <div className="p-3 border-t flex gap-2">
                      <Button 
                        onClick={applyCustomDateRange} 
                        size="sm" 
                        className="flex-1"
                        disabled={!dateRange?.from || !dateRange?.to}
                      >
                        Aplicar Filtro
                      </Button>
                      {customDateActive && (
                        <Button 
                          onClick={clearCustomDateRange} 
                          variant="outline" 
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                
                {/* Predefined Period Tabs - Only show when custom date is not active */}
                {!customDateActive && (
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    {['today', 'week', 'month'].map(p => (
                      <button
                        key={p}
                        onClick={() => setAnalyticsPeriod(p)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          analyticsPeriod === p
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {periodLabels[p]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="rented" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="rented" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Más Alquilados
                </TabsTrigger>
                <TabsTrigger value="revenue" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Más Rentables
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="rented">
                {analytics?.top_rented?.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.top_rented.map((item, idx) => (
                      <div 
                        key={item.barcode}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white ${
                          idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-slate-300'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{item.brand} {item.model}</p>
                          <p className="text-xs text-slate-500">
                            {item.item_type} • Talla {item.size} • {item.category}
                          </p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700">
                          {item.rental_count} alquileres
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Sin datos para este período</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="revenue">
                {analytics?.top_revenue?.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.top_revenue.map((item, idx) => (
                      <div 
                        key={item.barcode}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white ${
                          idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-emerald-700' : 'bg-slate-300'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{item.brand} {item.model}</p>
                          <p className="text-xs text-slate-500">
                            {item.item_type} • Talla {item.size} • {item.category}
                          </p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700">
                          €{item.total_revenue.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Sin datos para este período</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Side Panel - Stale Stock + Alerts */}
        <div className="space-y-6">
          {/* Stale Stock Alert */}
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                Stock Parado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.stale_stock?.length > 0 ? (
                <div className="space-y-2">
                  {analytics.stale_stock.map(item => (
                    <div key={item.barcode} className="p-3 rounded-lg bg-white border border-orange-200">
                      <p className="font-medium text-slate-900 text-sm">{item.brand} {item.model}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-500">{item.item_type} • {item.size}</p>
                        <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                          +{item.days_idle}d sin alquilar
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-orange-700 text-center py-4">
                  ¡Todo el stock tiene rotación!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Alerts Summary */}
          {(overdueAlerts.length > 0 || maintenanceAlerts.length > 0) && (
            <Card className="border-red-200 bg-gradient-to-br from-red-50 to-rose-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas Urgentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {overdueAlerts.length > 0 && (
                  <div className="p-3 rounded-lg bg-white border border-red-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-red-800">Alquileres vencidos</span>
                      </div>
                      <Badge className="bg-red-500 text-white">{overdueAlerts.length}</Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 w-full justify-between text-red-700"
                      onClick={() => navigate("/devoluciones")}
                    >
                      Ver devoluciones
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {maintenanceAlerts.length > 0 && (
                  <div className="p-3 rounded-lg bg-white border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-amber-500" />
                        <span className="font-medium text-amber-800">Mantenimiento</span>
                      </div>
                      <Badge className="bg-amber-500 text-white">
                        {maintenanceAlerts.reduce((sum, a) => sum + a.count, 0)}
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 w-full justify-between text-amber-700"
                      onClick={() => navigate("/mantenimiento?view=fleet")}
                    >
                      Ver equipos
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Occupancy by Category (existing) */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-500" />
            Ocupación Actual por Gamas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(occupancy).map(([category, data]) => {
              const colors = categoryColors[category] || categoryColors.MEDIA;
              const available = data.total - data.rented;
              
              return (
                <div 
                  key={category}
                  className={`p-4 rounded-xl ${colors.light} border border-slate-200`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-semibold ${colors.text}`}>
                      {category === 'SUPERIOR' ? 'Gama Superior' : category === 'ALTA' ? 'Gama Alta' : 'Gama Media'}
                    </span>
                    <Badge className={`${colors.bg} ${colors.text}`}>
                      {data.rented}/{data.total}
                    </Badge>
                  </div>
                  <Progress 
                    value={data.percentage} 
                    className="h-3"
                  />
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-slate-500">Disponibles: {available}</span>
                    <span className={colors.text}>{data.percentage}% ocupado</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
