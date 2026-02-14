import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { maintenanceApi, itemApi, customerApi } from "@/lib/api";
import axios from "axios";
import { 
  Wrench, 
  Plus, 
  Check, 
  Loader2, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  Users,
  Phone,
  Calendar,
  MessageCircle,
  DollarSign,
  Package,
  Search,
  Truck,
  Home,
  RotateCcw,
  UserPlus
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRIORITY_OPTIONS = [
  { value: "normal", label: "Normal", color: "bg-emerald-500/100", border: "border-emerald-400" },
  { value: "priority", label: "Prioritario", color: "bg-amber-500/100", border: "border-amber-400" },
  { value: "urgent", label: "Urgente", color: "bg-red-500", border: "border-red-400" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
];

export default function Maintenance() {
  // Read URL params for direct navigation from Dashboard
  const [searchParams] = useSearchParams();
  const initialView = searchParams.get("view") || "fleet";
  
  // View mode: "fleet" (Mi Flota) or "external" (Taller Externo)
  const [viewMode, setViewMode] = useState(initialView);
  
  // Internal maintenance states (Mi Flota)
  const [alertItems, setAlertItems] = useState([]);
  const [upcomingItems, setUpcomingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingItem, setProcessingItem] = useState(null);

  // External workshop states (Taller Externo)
  const [externalRepairs, setExternalRepairs] = useState([]);
  const [showExternalDialog, setShowExternalDialog] = useState(false);
  const [showDeliverDialog, setShowDeliverDialog] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState("cash");
  const [processingDelivery, setProcessingDelivery] = useState(false);
  
  // Customer search for external
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    dni: "",
    name: "",
    phone: "",
    address: "",
    city: ""
  });
  
  const [newExternalRepair, setNewExternalRepair] = useState({
    customer_name: "",
    customer_phone: "",
    customer_id: null,
    equipment_description: "",
    services: [],
    work_description: "",
    delivery_date: "",
    delivery_time: "",
    priority: "normal",
    price: "",
    notes: ""
  });

  useEffect(() => {
    loadData();
  }, [viewMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Use the unified fleet endpoint (same query as Dashboard)
      const fleetRes = await axios.get(`${API}/maintenance/fleet`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const fleetData = fleetRes.data;
      
      // Items currently in maintenance + items that need maintenance
      const allMaintenanceItems = [
        ...fleetData.in_maintenance.map(item => ({
          ...item,
          remaining: 0,
          progress: 100,
          maintenanceStatus: 'in_progress'
        })),
        ...fleetData.needs_maintenance.map(item => ({
          ...item,
          remaining: item.maintenance_remaining_days || 0,
          progress: item.maintenance_progress || 100,
          maintenanceStatus: 'needs_attention'
        }))
      ];
      
      // Separate into alert (needs now) and upcoming (soon)
      const needsMaintenance = allMaintenanceItems.filter(i => 
        i.maintenanceStatus === 'in_progress' || i.remaining <= 0 || i.progress >= 100
      );
      const upcoming = allMaintenanceItems.filter(i => 
        i.maintenanceStatus !== 'in_progress' && i.remaining > 0 && i.remaining <= 5
      );
      
      setAlertItems(needsMaintenance);
      setUpcomingItems(upcoming.sort((a, b) => a.remaining - b.remaining));
      
      // Load external repairs
      await loadExternalRepairs();
      
    } catch (error) {
      console.error("Error loading maintenance data:", error);
      toast.error("Error al cargar datos de mantenimiento");
    } finally {
      setLoading(false);
    }
  };

  const loadExternalRepairs = async () => {
    try {
      const response = await axios.get(`${API}/external-repairs`, {
        params: { status: "all" },
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      // Filter to show only pending and completed (not delivered)
      const active = response.data.filter(r => r.status !== 'delivered');
      setExternalRepairs(active);
    } catch (error) {
      console.error("Error loading external repairs:", error);
    }
  };

  // Real-time customer search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomersRealTime(customerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const searchCustomersRealTime = async (term) => {
    if (!term || term.length < 2) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    try {
      const response = await customerApi.getAll(term);
      setCustomerSuggestions(response.data.slice(0, 8));
      setShowSuggestions(response.data.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Error searching customers:", error);
      setCustomerSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectCustomer = (customer) => {
    setNewExternalRepair({
      ...newExternalRepair,
      customer_name: customer.name,
      customer_phone: customer.phone || "",
      customer_id: customer.id
    });
    setCustomerSearch("");
    setCustomerSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation in customer search
  const handleCustomerSearchKeyDown = (e) => {
    if (!showSuggestions || customerSuggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < customerSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < customerSuggestions.length) {
          selectCustomer(customerSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Create new customer from external repair dialog
  const createNewCustomerFromRepair = async () => {
    if (!newCustomer.dni || !newCustomer.name) {
      toast.error("DNI y nombre son obligatorios");
      return;
    }
    
    try {
      const response = await customerApi.create(newCustomer);
      selectCustomer(response.data);
      setShowNewCustomerDialog(false);
      setNewCustomer({ dni: "", name: "", phone: "", address: "", city: "" });
      toast.success("Cliente creado correctamente");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear cliente");
    }
  };

  // MI FLOTA: Reset item usage (Puesta a punto lista)
  const markMaintenanceComplete = async (item) => {
    setProcessingItem(item.id);
    try {
      // Call the new complete-maintenance endpoint that resets all counters
      const response = await axios.post(`${API}/items/${item.id}/complete-maintenance`, {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      // IMMEDIATELY remove the item from the local lists (visual update)
      setAlertItems(prev => prev.filter(i => i.id !== item.id));
      setUpcomingItems(prev => prev.filter(i => i.id !== item.id));
      
      // Show success message with reset info
      const resetInfo = response.data.reset_info;
      toast.success(
        `✅ ${item.brand} ${item.model} - Puesta a punto completada. ` +
        `Contadores reseteados (${resetInfo.previous_days_used} → 0 días)`
      );
      
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al completar mantenimiento");
      // Reload data in case of error to sync UI with backend
      loadData();
    } finally {
      setProcessingItem(null);
    }
  };

  // TALLER EXTERNO: Create new repair
  const openExternalDialog = () => {
    setNewExternalRepair({
      customer_name: "",
      customer_phone: "",
      customer_id: null,
      equipment_description: "",
      services: [],
      work_description: "",
      delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      delivery_time: "18:00",
      priority: "normal",
      price: "",
      notes: ""
    });
    setCustomerSearch("");
    setShowExternalDialog(true);
  };

  const createExternalRepair = async () => {
    if (!newExternalRepair.customer_name || !newExternalRepair.equipment_description) {
      toast.error("Completa: nombre cliente y descripción del equipo");
      return;
    }
    
    try {
      await axios.post(`${API}/external-repairs`, {
        ...newExternalRepair,
        services: newExternalRepair.work_description ? [newExternalRepair.work_description] : ["Reparación"],
        price: parseFloat(newExternalRepair.price) || 0
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Reparación registrada");
      setShowExternalDialog(false);
      loadExternalRepairs();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear reparación");
    }
  };

  const completeExternalRepair = async (id) => {
    try {
      await axios.post(`${API}/external-repairs/${id}/complete`, {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Trabajo finalizado - Listo para entregar");
      loadExternalRepairs();
    } catch (error) {
      toast.error("Error al completar reparación");
    }
  };

  const openDeliverDialog = (repair) => {
    setSelectedRepair(repair);
    setDeliveryPrice(repair.price || 0);
    setDeliveryPaymentMethod("cash");
    setShowDeliverDialog(true);
  };

  const deliverAndCharge = async () => {
    if (!selectedRepair) return;
    
    setProcessingDelivery(true);
    try {
      // First update price if changed
      if (deliveryPrice !== selectedRepair.price) {
        await axios.put(`${API}/external-repairs/${selectedRepair.id}`, {
          ...selectedRepair,
          price: deliveryPrice
        }, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      }
      
      // Then deliver
      await axios.post(`${API}/external-repairs/${selectedRepair.id}/deliver`, {
        payment_method: deliveryPaymentMethod
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      toast.success(`Cobrado €${deliveryPrice.toFixed(2)} - Equipo entregado`);
      setShowDeliverDialog(false);
      setSelectedRepair(null);
      loadExternalRepairs();
    } catch (error) {
      toast.error("Error al entregar reparación");
    } finally {
      setProcessingDelivery(false);
    }
  };

  const sendWhatsAppReminder = (repair) => {
    const phone = repair.customer_phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${repair.customer_name}, tu equipo (${repair.equipment_description}) ya está listo para recoger en nuestra tienda. ¡Te esperamos!`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const getPriorityStyle = (priority) => {
    return PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[0];
  };

  const isOverdue = (deliveryDate) => {
    return new Date(deliveryDate) < new Date(new Date().toDateString());
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  };

  // Counters for badges
  const fleetCount = alertItems.length + upcomingItems.length;
  const externalCount = externalRepairs.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8" data-testid="maintenance-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Mantenimiento y Taller
        </h1>
        <p className="text-slate-500 mt-1">Gestión de equipos propios y reparaciones externas</p>
      </div>

      {/* MODE SELECTOR - Big Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setViewMode("fleet")}
          className={`relative p-6 rounded-2xl border-3 transition-all duration-300 ${
            viewMode === "fleet"
              ? "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 shadow-xl shadow-blue-500/30 scale-[1.02]"
              : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-500/10"
          }`}
          data-testid="mode-fleet-btn"
        >
          <div className="flex items-center justify-center gap-3">
            <Home className={`h-8 w-8 ${viewMode === "fleet" ? "text-white" : "text-blue-600"}`} />
            <span className={`text-xl font-bold ${viewMode === "fleet" ? "text-white" : "text-slate-800"}`}>
              MI FLOTA
            </span>
          </div>
          <p className={`mt-2 text-sm ${viewMode === "fleet" ? "text-blue-100" : "text-slate-500"}`}>
            Equipos de la tienda por usos
          </p>
          {fleetCount > 0 && (
            <span className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-red-500 text-white text-sm font-bold flex items-center justify-center animate-pulse">
              {fleetCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setViewMode("external")}
          className={`relative p-6 rounded-2xl border-3 transition-all duration-300 ${
            viewMode === "external"
              ? "bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400 shadow-xl shadow-orange-500/30 scale-[1.02]"
              : "bg-white border-slate-200 hover:border-orange-300 hover:bg-orange-50"
          }`}
          data-testid="mode-external-btn"
        >
          <div className="flex items-center justify-center gap-3">
            <Users className={`h-8 w-8 ${viewMode === "external" ? "text-white" : "text-orange-600"}`} />
            <span className={`text-xl font-bold ${viewMode === "external" ? "text-white" : "text-slate-800"}`}>
              TALLER EXTERNO
            </span>
          </div>
          <p className={`mt-2 text-sm ${viewMode === "external" ? "text-orange-100" : "text-slate-500"}`}>
            Reparaciones de clientes
          </p>
          {externalCount > 0 && (
            <span className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-red-500 text-white text-sm font-bold flex items-center justify-center animate-pulse">
              {externalCount}
            </span>
          )}
        </button>
      </div>

      {/* ========== MI FLOTA VIEW ========== */}
      {viewMode === "fleet" && (
        <div className="space-y-6">
          {/* Items needing maintenance NOW */}
          {alertItems.length > 0 && (
            <Card className="border-2 border-red-300 bg-gradient-to-br from-red-50 to-red-100/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Requieren Puesta a Punto AHORA ({alertItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alertItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-4 bg-white rounded-xl border border-red-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Icon */}
                        <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                          <Wrench className="h-6 w-6 text-red-600" />
                        </div>
                        
                        {/* Info Grid */}
                        <div className="flex-1 grid grid-cols-4 gap-4">
                          {/* Modelo */}
                          <div>
                            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Modelo</p>
                            <p className="font-bold text-slate-900">
                              {item.name || `${item.brand || ''} ${item.model || ''}`.trim() || 'Sin nombre'}
                            </p>
                            {item.item_type && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {item.item_type}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Número Interno */}
                          <div>
                            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Nº Interno</p>
                            <p className="font-mono font-bold text-blue-700">
                              {item.internal_code || item.barcode || '-'}
                            </p>
                          </div>
                          
                          {/* Talla */}
                          <div>
                            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Talla</p>
                            <p className="font-bold text-slate-900">
                              {item.size || '-'}
                            </p>
                          </div>
                          
                          {/* Usos Histórico */}
                          <div>
                            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Usos Histórico</p>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold text-red-600">
                                {item.days_used || 0}
                              </span>
                              <span className="text-xs text-slate-500">salidas</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Button */}
                        <Button 
                          onClick={() => markMaintenanceComplete(item)}
                          disabled={processingItem === item.id}
                          className="bg-emerald-600 hover:bg-emerald-700 h-12 px-6 flex-shrink-0"
                          data-testid={`complete-maintenance-${item.id}`}
                        >
                          {processingItem === item.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="h-5 w-5 mr-2" />
                              PUESTA A PUNTO LISTA
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items approaching maintenance */}
          {upcomingItems.length > 0 && (
            <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                  <Clock className="h-5 w-5" />
                  Próximo Mantenimiento ({upcomingItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-4 bg-white rounded-xl border border-amber-200"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="h-10 w-10 rounded-lg bg-amber-500/100/20 flex items-center justify-center flex-shrink-0">
                          <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        
                        {/* Info Grid */}
                        <div className="flex-1 grid grid-cols-5 gap-3 items-center">
                          {/* Modelo */}
                          <div>
                            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Modelo</p>
                            <p className="font-bold text-slate-900 text-sm">
                              {item.name || `${item.brand || ''} ${item.model || ''}`.trim() || 'Sin nombre'}
                            </p>
                          </div>
                          
                          {/* Número Interno */}
                          <div>
                            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Nº Interno</p>
                            <p className="font-mono font-bold text-blue-700 text-sm">
                              {item.internal_code || item.barcode || '-'}
                            </p>
                          </div>
                          
                          {/* Talla */}
                          <div>
                            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Talla</p>
                            <p className="font-bold text-slate-900 text-sm">{item.size || '-'}</p>
                          </div>
                          
                          {/* Usos */}
                          <div>
                            <p className="text-xs text-slate-500 uppercase font-medium mb-1">Usos</p>
                            <p className="font-bold text-amber-600">{item.days_used || 0}</p>
                          </div>
                          
                          {/* Progreso */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs text-slate-500 uppercase font-medium">Faltan</p>
                              <Badge variant="outline" className="text-amber-700 border-amber-400 text-xs">
                                {item.remaining} salidas
                              </Badge>
                            </div>
                            <Progress value={item.progress} className="h-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {alertItems.length === 0 && upcomingItems.length === 0 && (
            <div className="text-center py-16">
              <div className="h-24 w-24 rounded-full bg-emerald-500/100/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">¡Todo en orden!</h3>
              <p className="text-slate-500">No hay equipos que necesiten mantenimiento</p>
            </div>
          )}
        </div>
      )}

      {/* ========== TALLER EXTERNO VIEW ========== */}
      {viewMode === "external" && (
        <div className="space-y-6">
          {/* External Repairs List */}
          {externalRepairs.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-24 w-24 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <Package className="h-12 w-12 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Sin trabajos pendientes</h3>
              <p className="text-slate-500 mb-6">No hay reparaciones externas activas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {externalRepairs.map((repair) => {
                const priorityStyle = getPriorityStyle(repair.priority);
                const overdue = isOverdue(repair.delivery_date) && repair.status === 'pending';
                
                return (
                  <Card 
                    key={repair.id}
                    className={`border-2 transition-all hover:shadow-lg ${
                      repair.status === 'completed'
                        ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100/50'
                        : overdue
                        ? 'border-red-400 bg-gradient-to-br from-red-50 to-red-100/50'
                        : `${priorityStyle.border} bg-white`
                    }`}
                    data-testid={`external-repair-${repair.id}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        {/* Priority Indicator Bar */}
                        <div className={`w-2 self-stretch rounded-full ${priorityStyle.color} ${repair.priority === 'urgent' ? 'animate-pulse' : ''}`} />
                        
                        {/* Main Content */}
                        <div className="flex-1">
                          {/* Header Row */}
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-lg font-bold text-slate-900">{repair.customer_name}</span>
                            {repair.status === 'completed' && (
                              <Badge className="bg-emerald-500/100 text-white">✓ LISTO</Badge>
                            )}
                            {overdue && (
                              <Badge className="bg-red-500 text-white animate-pulse">⚠ ATRASADO</Badge>
                            )}
                            {repair.priority === 'urgent' && repair.status !== 'completed' && (
                              <Badge className="bg-red-500 text-white">URGENTE</Badge>
                            )}
                            {repair.priority === 'priority' && repair.status !== 'completed' && (
                              <Badge className="bg-amber-500/100 text-white">PRIORITARIO</Badge>
                            )}
                          </div>
                          
                          {/* Equipment */}
                          <div className="flex items-center gap-2 mb-2 text-slate-700">
                            <Package className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">{repair.equipment_description}</span>
                          </div>
                          
                          {/* Work Description */}
                          {repair.notes && (
                            <p className="text-sm text-slate-600 mb-2 italic">
                              "{repair.notes}"
                            </p>
                          )}
                          
                          {/* Info Row */}
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Entrega: {formatDate(repair.delivery_date)}
                              {repair.delivery_time && ` ${repair.delivery_time}`}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {repair.customer_phone || '-'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Price and Actions */}
                        <div className="flex flex-col items-end gap-3">
                          {/* Price */}
                          <div className="text-right">
                            <p className="text-sm text-slate-500">Precio</p>
                            <p className="text-2xl font-bold text-orange-600">
                              €{(repair.price || 0).toFixed(2)}
                            </p>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {/* WhatsApp */}
                            {repair.customer_phone && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-10 w-10 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                onClick={() => sendWhatsAppReminder(repair)}
                                title="Enviar WhatsApp"
                              >
                                <MessageCircle className="h-5 w-5" />
                              </Button>
                            )}
                            
                            {/* Complete Button */}
                            {repair.status === 'pending' && (
                              <Button
                                variant="outline"
                                onClick={() => completeExternalRepair(repair.id)}
                                className="border-slate-300"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Finalizar
                              </Button>
                            )}
                            
                            {/* COBRAR Y ENTREGAR Button */}
                            {repair.status === 'completed' && (
                              <Button
                                onClick={() => openDeliverDialog(repair)}
                                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 h-12 px-6 text-lg font-bold shadow-lg"
                              >
                                <DollarSign className="h-5 w-5 mr-2" />
                                COBRAR Y ENTREGAR
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* FLOATING BUTTON - Nueva Reparación */}
          <Button
            onClick={openExternalDialog}
            className="fixed bottom-8 right-8 h-16 px-8 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-2xl shadow-orange-500/40 text-lg font-bold z-50"
            data-testid="add-external-repair-btn"
          >
            <Plus className="h-6 w-6 mr-2" />
            NUEVA REPARACIÓN
          </Button>
        </div>
      )}

      {/* ========== ADD EXTERNAL REPAIR DIALOG ========== */}
      <Dialog open={showExternalDialog} onOpenChange={setShowExternalDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="h-6 w-6 text-orange-600" />
              Nueva Reparación Externa
            </DialogTitle>
            <DialogDescription>
              Registra un trabajo de taller para un cliente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4 max-h-[60vh] overflow-y-auto">
            {/* Customer Search - Enhanced */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Cliente</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewCustomerDialog(true)}
                  className="h-8 text-xs"
                  data-testid="new-customer-btn-external"
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Nuevo Cliente
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre, teléfono o DNI..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onKeyDown={handleCustomerSearchKeyDown}
                  className="h-12 pl-10"
                  data-testid="external-customer-search"
                />
                {showSuggestions && customerSuggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 text-xs text-slate-500 border-b bg-slate-50">
                      {customerSuggestions.length} cliente(s) encontrado(s)
                    </div>
                    {customerSuggestions.map((c, index) => (
                      <button
                        key={c.id}
                        className={`w-full px-4 py-3 text-left flex items-center justify-between border-b last:border-b-0 transition-colors ${
                          index === selectedIndex 
                            ? 'bg-orange-50 border-l-4 border-l-orange-500' 
                            : 'hover:bg-slate-50'
                        }`}
                        onClick={() => selectCustomer(c)}
                        data-testid={`customer-suggestion-${index}`}
                      >
                        <div>
                          <span className="font-medium text-slate-900">{c.name}</span>
                          <div className="text-xs text-slate-500 mt-0.5">
                            <span className="font-mono">{c.dni}</span>
                            {c.city && <span className="ml-2">📍 {c.city}</span>}
                          </div>
                        </div>
                        <span className="text-slate-400 text-sm">{c.phone || '-'}</span>
                      </button>
                    ))}
                    <button
                      className="w-full px-4 py-3 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2 border-t"
                      onClick={() => {
                        setShowSuggestions(false);
                        setShowNewCustomerDialog(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                      Crear nuevo cliente...
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Manual Customer Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={newExternalRepair.customer_name}
                  onChange={(e) => setNewExternalRepair({ ...newExternalRepair, customer_name: e.target.value })}
                  className="h-12 mt-1 text-lg"
                  placeholder="Nombre del cliente"
                  data-testid="external-customer-name"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={newExternalRepair.customer_phone}
                  onChange={(e) => setNewExternalRepair({ ...newExternalRepair, customer_phone: e.target.value })}
                  className="h-12 mt-1"
                  placeholder="600 123 456"
                  data-testid="external-customer-phone"
                />
              </div>
            </div>
            
            {/* Equipment */}
            <div>
              <Label className="text-base font-semibold">Equipo *</Label>
              <Input
                value={newExternalRepair.equipment_description}
                onChange={(e) => setNewExternalRepair({ ...newExternalRepair, equipment_description: e.target.value })}
                className="h-12 mt-2 text-lg"
                placeholder="Ej: Skis Head blancos, Tabla Nitro 155cm..."
                data-testid="external-equipment"
              />
            </div>
            
            {/* Work Description - FREE TEXT */}
            <div>
              <Label className="text-base font-semibold">Descripción del Trabajo</Label>
              <Textarea
                value={newExternalRepair.work_description}
                onChange={(e) => setNewExternalRepair({ ...newExternalRepair, work_description: e.target.value })}
                className="mt-2"
                rows={3}
                placeholder="Ej: Encerado + afilado cantos, parcheado suela zona talón..."
                data-testid="external-work-description"
              />
            </div>
            
            {/* Price - MANUAL INPUT */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200">
              <Label className="text-base font-semibold text-orange-800">Precio del Servicio (€)</Label>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-3xl text-orange-600 font-bold">€</span>
                <Input
                  type="number"
                  step="0.01"
                  value={newExternalRepair.price}
                  onChange={(e) => setNewExternalRepair({ ...newExternalRepair, price: e.target.value })}
                  className="h-16 text-3xl font-bold text-center flex-1"
                  placeholder="0.00"
                  data-testid="external-price"
                />
              </div>
              <p className="text-xs text-orange-600 mt-2">
                Introduce el precio manualmente según la complejidad del trabajo
              </p>
            </div>
            
            {/* Delivery Date and Priority */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Fecha Entrega</Label>
                <Input
                  type="date"
                  value={newExternalRepair.delivery_date}
                  onChange={(e) => setNewExternalRepair({ ...newExternalRepair, delivery_date: e.target.value })}
                  className="h-12 mt-1"
                  data-testid="external-delivery-date"
                />
              </div>
              <div>
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={newExternalRepair.delivery_time}
                  onChange={(e) => setNewExternalRepair({ ...newExternalRepair, delivery_time: e.target.value })}
                  className="h-12 mt-1"
                />
              </div>
              <div>
                <Label>Prioridad</Label>
                <Select 
                  value={newExternalRepair.priority}
                  onValueChange={(v) => setNewExternalRepair({ ...newExternalRepair, priority: v })}
                >
                  <SelectTrigger className="h-12 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className={`inline-block w-3 h-3 rounded-full ${p.color} mr-2`}></span>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Notes */}
            <div>
              <Label>Notas adicionales</Label>
              <Textarea
                value={newExternalRepair.notes}
                onChange={(e) => setNewExternalRepair({ ...newExternalRepair, notes: e.target.value })}
                className="mt-1"
                rows={2}
                placeholder="Observaciones, desperfectos previos..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExternalDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={createExternalRepair}
              className="bg-orange-600 hover:bg-orange-700 h-12 px-6"
              data-testid="save-external-repair-btn"
            >
              <Plus className="h-5 w-5 mr-2" />
              Registrar Trabajo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== DELIVER AND CHARGE DIALOG ========== */}
      <Dialog open={showDeliverDialog} onOpenChange={setShowDeliverDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Truck className="h-6 w-6 text-emerald-600" />
              Cobrar y Entregar
            </DialogTitle>
          </DialogHeader>
          {selectedRepair && (
            <div className="space-y-5 py-4">
              {/* Repair Info */}
              <div className="p-4 rounded-xl bg-slate-50">
                <p className="font-bold text-lg text-slate-900">{selectedRepair.customer_name}</p>
                <p className="text-slate-600">{selectedRepair.equipment_description}</p>
                {selectedRepair.notes && (
                  <p className="text-sm text-slate-500 mt-1 italic">"{selectedRepair.notes}"</p>
                )}
              </div>
              
              {/* EDITABLE FINAL PRICE */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300">
                <Label className="text-base font-semibold text-emerald-800">Importe Final a Cobrar</Label>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-4xl text-emerald-600 font-bold">€</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={deliveryPrice}
                    onChange={(e) => setDeliveryPrice(parseFloat(e.target.value) || 0)}
                    className="h-20 text-4xl font-bold text-center flex-1 border-emerald-300"
                  />
                </div>
                <p className="text-xs text-emerald-600 mt-2">
                  Puedes ajustar el precio final antes de cobrar
                </p>
              </div>
              
              {/* Payment Method */}
              <div>
                <Label className="text-base">Método de Pago</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setDeliveryPaymentMethod(m.value)}
                      className={`p-4 rounded-xl border-2 transition-all font-semibold ${
                        deliveryPaymentMethod === m.value
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <p className="text-xs text-slate-500 text-center">
                Se registrará en Caja como <strong>"Servicio Taller"</strong>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliverDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={deliverAndCharge}
              disabled={processingDelivery}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 h-14 px-8 text-lg font-bold"
            >
              {processingDelivery ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <DollarSign className="h-5 w-5 mr-2" />
              )}
              COBRAR €{deliveryPrice.toFixed(2)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== NEW CUSTOMER DIALOG ========== */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-orange-600" />
              Nuevo Cliente
            </DialogTitle>
            <DialogDescription>
              Crea un nuevo cliente para el taller
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>DNI *</Label>
                <Input
                  value={newCustomer.dni}
                  onChange={(e) => setNewCustomer({ ...newCustomer, dni: e.target.value.toUpperCase() })}
                  placeholder="12345678A"
                  className="h-11 mt-1 font-mono"
                  data-testid="new-customer-dni-external"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="600 123 456"
                  className="h-11 mt-1"
                  data-testid="new-customer-phone-external"
                />
              </div>
            </div>
            <div>
              <Label>Nombre Completo *</Label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Juan García López"
                className="h-11 mt-1"
                data-testid="new-customer-name-external"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dirección</Label>
                <Input
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Calle Mayor, 1"
                  className="h-11 mt-1"
                />
              </div>
              <div>
                <Label>Ciudad</Label>
                <Input
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                  placeholder="Madrid"
                  className="h-11 mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomerDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={createNewCustomerFromRepair}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="save-new-customer-external"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Crear Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
