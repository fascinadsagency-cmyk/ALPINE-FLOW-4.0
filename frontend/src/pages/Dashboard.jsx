import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  X
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Vista general de tu negocio</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/rentals/new")}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Nuevo Alquiler
          </Button>
        </div>
      </div>

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
                  onClick={() => navigate("/returns")}
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
                      onClick={() => navigate("/returns")}
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
                      onClick={() => navigate("/maintenance")}
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
