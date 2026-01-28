import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
  X
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MAINTENANCE_TYPES = [
  { value: "sharpen", label: "Afilado" },
  { value: "wax", label: "Encerado" },
  { value: "repair", label: "Reparación" },
  { value: "inspection", label: "Inspección" },
  { value: "other", label: "Otro" },
];

const EXTERNAL_SERVICES = [
  { value: "wax", label: "Encerado", price: 15 },
  { value: "sharpen", label: "Afilado", price: 20 },
  { value: "patch", label: "Parcheado", price: 25 },
  { value: "bindings", label: "Montaje fijaciones", price: 35 },
  { value: "base_repair", label: "Reparación base", price: 30 },
  { value: "full_tune", label: "Puesta a punto completa", price: 45 },
];

const PRIORITY_OPTIONS = [
  { value: "normal", label: "Normal", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  { value: "priority", label: "Prioritario", color: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "urgent", label: "Urgente", color: "bg-red-100 text-red-700 border-red-300" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
];

export default function Maintenance() {
  const [activeTab, setActiveTab] = useState("internal");
  
  // Internal maintenance states
  const [records, setRecords] = useState([]);
  const [alertItems, setAlertItems] = useState([]);
  const [upcomingItems, setUpcomingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [availableItems, setAvailableItems] = useState([]);
  const [newMaintenance, setNewMaintenance] = useState({
    item_id: "",
    maintenance_type: "sharpen",
    description: "",
    cost: "",
    scheduled_date: ""
  });

  // External workshop states
  const [externalRepairs, setExternalRepairs] = useState([]);
  const [externalFilterStatus, setExternalFilterStatus] = useState("pending");
  const [showExternalDialog, setShowExternalDialog] = useState(false);
  const [showDeliverDialog, setShowDeliverDialog] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState("cash");
  const [processingDelivery, setProcessingDelivery] = useState(false);
  
  // Customer search for external
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  
  const [newExternalRepair, setNewExternalRepair] = useState({
    customer_name: "",
    customer_phone: "",
    customer_id: null,
    equipment_description: "",
    services: [],
    delivery_date: "",
    delivery_time: "",
    priority: "normal",
    price: 0,
    notes: ""
  });

  useEffect(() => {
    loadData();
  }, [filterStatus, externalFilterStatus, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsRes, itemsRes] = await Promise.all([
        maintenanceApi.getAll(filterStatus),
        itemApi.getAll({})
      ]);
      
      setRecords(recordsRes.data);
      
      // Calculate maintenance alerts
      const items = itemsRes.data;
      const needsMaintenance = [];
      const upcoming = [];
      
      items.forEach(item => {
        const interval = item.maintenance_interval || 30;
        const daysUsed = item.days_used || 0;
        const remaining = interval - (daysUsed % interval);
        
        if (item.status !== 'maintenance' && item.status !== 'retired') {
          if (remaining <= 0 || daysUsed >= interval) {
            needsMaintenance.push({ ...item, remaining: 0, progress: 100 });
          } else if (remaining <= 5) {
            upcoming.push({ ...item, remaining, progress: ((daysUsed % interval) / interval) * 100 });
          }
        }
      });
      
      setAlertItems(needsMaintenance);
      setUpcomingItems(upcoming.sort((a, b) => a.remaining - b.remaining));
      
      // Load external repairs
      await loadExternalRepairs();
      
    } catch (error) {
      toast.error("Error al cargar datos de mantenimiento");
    } finally {
      setLoading(false);
    }
  };

  const loadExternalRepairs = async () => {
    try {
      const response = await axios.get(`${API}/external-repairs`, {
        params: { status: externalFilterStatus === "all" ? undefined : externalFilterStatus },
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setExternalRepairs(response.data);
    } catch (error) {
      console.error("Error loading external repairs:", error);
    }
  };

  const loadAvailableItems = async () => {
    try {
      const response = await itemApi.getAll({ status: "available" });
      setAvailableItems(response.data);
    } catch (error) {
      console.error("Error loading items:", error);
    }
  };

  const searchCustomers = async (term) => {
    if (term.length < 2) {
      setCustomerSuggestions([]);
      return;
    }
    
    setSearchingCustomers(true);
    try {
      const response = await customerApi.search(term);
      setCustomerSuggestions(response.data.slice(0, 5));
    } catch (error) {
      console.error("Error searching customers:", error);
    } finally {
      setSearchingCustomers(false);
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
  };

  const openAddDialog = (preselectedItem = null) => {
    loadAvailableItems();
    if (preselectedItem) {
      setNewMaintenance({
        ...newMaintenance,
        item_id: preselectedItem.id
      });
    }
    setShowAddDialog(true);
  };

  const createMaintenance = async () => {
    if (!newMaintenance.item_id || !newMaintenance.description) {
      toast.error("Selecciona un artículo y añade descripción");
      return;
    }
    
    try {
      await maintenanceApi.create({
        ...newMaintenance,
        cost: parseFloat(newMaintenance.cost) || 0
      });
      toast.success("Mantenimiento programado");
      setShowAddDialog(false);
      setNewMaintenance({
        item_id: "",
        maintenance_type: "sharpen",
        description: "",
        cost: "",
        scheduled_date: ""
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear mantenimiento");
    }
  };

  const completeMaintenance = async (id) => {
    try {
      await maintenanceApi.complete(id);
      toast.success("Mantenimiento completado");
      loadData();
    } catch (error) {
      toast.error("Error al completar mantenimiento");
    }
  };

  const sendToMaintenance = async (item) => {
    openAddDialog(item);
  };

  // External Workshop Functions
  const openExternalDialog = () => {
    setNewExternalRepair({
      customer_name: "",
      customer_phone: "",
      customer_id: null,
      equipment_description: "",
      services: [],
      delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default +2 days
      delivery_time: "18:00",
      priority: "normal",
      price: 0,
      notes: ""
    });
    setCustomerSearch("");
    setShowExternalDialog(true);
  };

  const toggleService = (serviceValue) => {
    const currentServices = newExternalRepair.services;
    let newServices;
    let newPrice = newExternalRepair.price;
    
    const service = EXTERNAL_SERVICES.find(s => s.value === serviceValue);
    
    if (currentServices.includes(serviceValue)) {
      newServices = currentServices.filter(s => s !== serviceValue);
      newPrice -= service?.price || 0;
    } else {
      newServices = [...currentServices, serviceValue];
      newPrice += service?.price || 0;
    }
    
    setNewExternalRepair({
      ...newExternalRepair,
      services: newServices,
      price: Math.max(0, newPrice)
    });
  };

  const createExternalRepair = async () => {
    if (!newExternalRepair.customer_name || !newExternalRepair.equipment_description || newExternalRepair.services.length === 0) {
      toast.error("Completa: nombre cliente, equipo y al menos un servicio");
      return;
    }
    
    try {
      await axios.post(`${API}/external-repairs`, newExternalRepair, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Reparación externa registrada");
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
      toast.success("Reparación marcada como finalizada");
      loadExternalRepairs();
    } catch (error) {
      toast.error("Error al completar reparación");
    }
  };

  const openDeliverDialog = (repair) => {
    setSelectedRepair(repair);
    setDeliveryPaymentMethod("cash");
    setShowDeliverDialog(true);
  };

  const deliverAndCharge = async () => {
    if (!selectedRepair) return;
    
    setProcessingDelivery(true);
    try {
      await axios.post(`${API}/external-repairs/${selectedRepair.id}/deliver`, {
        payment_method: deliveryPaymentMethod
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success(`Entregado y cobrado: €${selectedRepair.price.toFixed(2)}`);
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

  const getPriorityBadge = (priority) => {
    const opt = PRIORITY_OPTIONS.find(p => p.value === priority);
    return opt?.color || "bg-slate-100 text-slate-700";
  };

  const isOverdue = (deliveryDate) => {
    return new Date(deliveryDate) < new Date(new Date().toDateString());
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8" data-testid="maintenance-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Mantenimiento y Taller
          </h1>
          <p className="text-slate-500 mt-1">Gestión de equipos propios y reparaciones externas</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openAddDialog()} variant="outline" data-testid="add-maintenance-btn">
            <Plus className="h-4 w-4 mr-2" />
            Mant. Interno
          </Button>
          <Button 
            onClick={openExternalDialog} 
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            data-testid="add-external-repair-btn"
          >
            <Users className="h-4 w-4 mr-2" />
            + Nueva Reparación Externa
          </Button>
        </div>
      </div>

      {/* Tabs for Internal vs External */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="internal" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Material Propio
          </TabsTrigger>
          <TabsTrigger value="external" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Taller Clientes
            {externalRepairs.filter(r => r.status === 'pending' || r.status === 'completed').length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {externalRepairs.filter(r => r.status === 'pending' || r.status === 'completed').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* INTERNAL MAINTENANCE TAB */}
        <TabsContent value="internal" className="space-y-6">
          {/* Alert Cards */}
          {(alertItems.length > 0 || upcomingItems.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alertItems.length > 0 && (
                <Card className="border-red-200 bg-red-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-5 w-5" />
                      Requieren Mantenimiento AHORA ({alertItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {alertItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                          <div>
                            <p className="font-medium text-slate-900">{item.brand} {item.model}</p>
                            <p className="text-sm text-slate-500">
                              <span className="font-mono">{item.barcode}</span> • {item.days_used} días de uso
                            </p>
                          </div>
                          <Button size="sm" variant="destructive" onClick={() => sendToMaintenance(item)}>
                            <Wrench className="h-4 w-4 mr-1" />
                            Enviar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {upcomingItems.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                      <Clock className="h-5 w-5" />
                      Próximo Mantenimiento ({upcomingItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {upcomingItems.map((item) => (
                        <div key={item.id} className="p-3 bg-white rounded-lg border border-amber-200">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium text-slate-900">{item.brand} {item.model}</p>
                              <p className="text-xs text-slate-500 font-mono">{item.barcode}</p>
                            </div>
                            <Badge variant="outline" className="text-amber-700 border-amber-300">
                              En {item.remaining} salidas
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={item.progress} className="h-2 flex-1" />
                            <span className="text-xs text-slate-500">{Math.round(item.progress)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Internal Maintenance Records */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-slate-500" />
                  Registros de Mantenimiento
                </CardTitle>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36 h-10" data-testid="filter-maintenance-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="completed">Completados</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-emerald-500" />
                  <p>No hay registros de mantenimiento pendientes</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artículo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Coste</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.item_description}</p>
                            <p className="text-xs text-slate-500 font-mono">{record.item_barcode}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {MAINTENANCE_TYPES.find(t => t.value === record.maintenance_type)?.label || record.maintenance_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{record.description}</TableCell>
                        <TableCell>€{record.cost.toFixed(2)}</TableCell>
                        <TableCell>
                          {record.status === 'pending' ? (
                            <Badge className="bg-amber-100 text-amber-700">Pendiente</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700">Completado</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.scheduled_date || record.created_at?.split('T')[0]}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => completeMaintenance(record.id)}
                              data-testid={`complete-${record.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Completar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXTERNAL WORKSHOP TAB */}
        <TabsContent value="external" className="space-y-6">
          <Card className="border-violet-200 bg-gradient-to-br from-violet-50/50 to-purple-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-violet-800">
                  <Users className="h-5 w-5" />
                  Material de Clientes (Taller)
                </CardTitle>
                <Select value={externalFilterStatus} onValueChange={setExternalFilterStatus}>
                  <SelectTrigger className="w-40 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En proceso</SelectItem>
                    <SelectItem value="completed">Listos</SelectItem>
                    <SelectItem value="delivered">Entregados</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {externalRepairs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay reparaciones externas {externalFilterStatus !== 'all' ? 'en este estado' : ''}</p>
                  <Button variant="outline" className="mt-4" onClick={openExternalDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Reparación Externa
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {externalRepairs.map((repair) => (
                    <div 
                      key={repair.id}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        repair.status === 'delivered' 
                          ? 'bg-slate-50 border-slate-200 opacity-70'
                          : repair.status === 'completed'
                          ? 'bg-emerald-50 border-emerald-300'
                          : isOverdue(repair.delivery_date)
                          ? 'bg-red-50 border-red-300'
                          : 'bg-white border-violet-200'
                      }`}
                      data-testid={`external-repair-${repair.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {/* Customer and Priority */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-slate-900">{repair.customer_name}</span>
                            <Badge className={getPriorityBadge(repair.priority)}>
                              {PRIORITY_OPTIONS.find(p => p.value === repair.priority)?.label}
                            </Badge>
                            {repair.status === 'completed' && (
                              <Badge className="bg-emerald-500 text-white">✓ Listo</Badge>
                            )}
                            {repair.status === 'delivered' && (
                              <Badge className="bg-slate-500 text-white">Entregado</Badge>
                            )}
                            {isOverdue(repair.delivery_date) && repair.status === 'pending' && (
                              <Badge className="bg-red-500 text-white animate-pulse">ATRASADO</Badge>
                            )}
                          </div>
                          
                          {/* Equipment */}
                          <p className="text-slate-700 mb-2">
                            <Package className="h-4 w-4 inline mr-1 text-slate-400" />
                            {repair.equipment_description}
                          </p>
                          
                          {/* Services */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {repair.services.map(s => (
                              <Badge key={s} variant="outline" className="text-xs">
                                {EXTERNAL_SERVICES.find(es => es.value === s)?.label || s}
                              </Badge>
                            ))}
                          </div>
                          
                          {/* Delivery Info */}
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
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xl font-bold text-violet-700">€{repair.price.toFixed(2)}</span>
                          
                          <div className="flex items-center gap-1">
                            {/* WhatsApp Button */}
                            {repair.customer_phone && repair.status !== 'delivered' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => sendWhatsAppReminder(repair)}
                                title="Enviar WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {/* Complete Button */}
                            {repair.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => completeExternalRepair(repair.id)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Finalizar
                              </Button>
                            )}
                            
                            {/* Deliver and Charge Button */}
                            {repair.status === 'completed' && (
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => openDeliverDialog(repair)}
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                Entregar y Cobrar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Internal Maintenance Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Programar Mantenimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Artículo *</Label>
              <Select 
                value={newMaintenance.item_id} 
                onValueChange={(v) => setNewMaintenance({ ...newMaintenance, item_id: v })}
              >
                <SelectTrigger className="h-11 mt-1" data-testid="maintenance-item-select">
                  <SelectValue placeholder="Seleccionar artículo" />
                </SelectTrigger>
                <SelectContent>
                  {availableItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.barcode} - {item.brand} {item.model}
                    </SelectItem>
                  ))}
                  {alertItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      ⚠️ {item.barcode} - {item.brand} {item.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Mantenimiento</Label>
              <Select 
                value={newMaintenance.maintenance_type} 
                onValueChange={(v) => setNewMaintenance({ ...newMaintenance, maintenance_type: v })}
              >
                <SelectTrigger className="h-11 mt-1" data-testid="maintenance-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descripción *</Label>
              <Textarea
                value={newMaintenance.description}
                onChange={(e) => setNewMaintenance({ ...newMaintenance, description: e.target.value })}
                className="mt-1"
                rows={3}
                placeholder="Describe el mantenimiento a realizar..."
                data-testid="maintenance-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Coste (€)</Label>
                <Input
                  type="number"
                  value={newMaintenance.cost}
                  onChange={(e) => setNewMaintenance({ ...newMaintenance, cost: e.target.value })}
                  className="h-11 mt-1"
                  data-testid="maintenance-cost"
                />
              </div>
              <div>
                <Label>Fecha Programada</Label>
                <Input
                  type="date"
                  value={newMaintenance.scheduled_date}
                  onChange={(e) => setNewMaintenance({ ...newMaintenance, scheduled_date: e.target.value })}
                  className="h-11 mt-1"
                  data-testid="maintenance-date"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={createMaintenance} data-testid="save-maintenance-btn">
              Programar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add External Repair Dialog */}
      <Dialog open={showExternalDialog} onOpenChange={setShowExternalDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-600" />
              Nueva Reparación Externa
            </DialogTitle>
            <DialogDescription>
              Registra un trabajo de taller para un cliente externo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Customer Search */}
            <div>
              <Label>Cliente *</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar cliente existente..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    searchCustomers(e.target.value);
                  }}
                  className="h-11 pl-10"
                />
                {customerSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {customerSuggestions.map(c => (
                      <button
                        key={c.id}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 flex justify-between"
                        onClick={() => selectCustomer(c)}
                      >
                        <span>{c.name}</span>
                        <span className="text-slate-400 text-sm">{c.phone || c.dni}</span>
                      </button>
                    ))}
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
                  className="h-11 mt-1"
                  placeholder="Nombre del cliente"
                  data-testid="external-customer-name"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={newExternalRepair.customer_phone}
                  onChange={(e) => setNewExternalRepair({ ...newExternalRepair, customer_phone: e.target.value })}
                  className="h-11 mt-1"
                  placeholder="600 123 456"
                  data-testid="external-customer-phone"
                />
              </div>
            </div>
            
            {/* Equipment */}
            <div>
              <Label>Equipo *</Label>
              <Textarea
                value={newExternalRepair.equipment_description}
                onChange={(e) => setNewExternalRepair({ ...newExternalRepair, equipment_description: e.target.value })}
                className="mt-1"
                rows={2}
                placeholder="Ej: Skis Head blancos, Tabla Nitro 155cm..."
                data-testid="external-equipment"
              />
            </div>
            
            {/* Services Selection */}
            <div>
              <Label>Servicios *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {EXTERNAL_SERVICES.map(service => (
                  <label
                    key={service.value}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      newExternalRepair.services.includes(service.value)
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={newExternalRepair.services.includes(service.value)}
                        onCheckedChange={() => toggleService(service.value)}
                      />
                      <span className="text-sm font-medium">{service.label}</span>
                    </div>
                    <span className="text-sm text-violet-600 font-semibold">€{service.price}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Delivery Date and Priority */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Fecha Entrega</Label>
                <Input
                  type="date"
                  value={newExternalRepair.delivery_date}
                  onChange={(e) => setNewExternalRepair({ ...newExternalRepair, delivery_date: e.target.value })}
                  className="h-11 mt-1"
                  data-testid="external-delivery-date"
                />
              </div>
              <div>
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={newExternalRepair.delivery_time}
                  onChange={(e) => setNewExternalRepair({ ...newExternalRepair, delivery_time: e.target.value })}
                  className="h-11 mt-1"
                />
              </div>
              <div>
                <Label>Prioridad</Label>
                <Select 
                  value={newExternalRepair.priority}
                  onValueChange={(v) => setNewExternalRepair({ ...newExternalRepair, priority: v })}
                >
                  <SelectTrigger className="h-11 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Price */}
            <div className="p-4 rounded-xl bg-violet-50 border border-violet-200">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-violet-700">Precio Total</Label>
                  <p className="text-xs text-violet-500 mt-1">Ajusta si es necesario</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg text-violet-600">€</span>
                  <Input
                    type="number"
                    value={newExternalRepair.price}
                    onChange={(e) => setNewExternalRepair({ ...newExternalRepair, price: parseFloat(e.target.value) || 0 })}
                    className="w-24 h-12 text-xl font-bold text-center"
                    data-testid="external-price"
                  />
                </div>
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
              className="bg-violet-600 hover:bg-violet-700"
              data-testid="save-external-repair-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              Registrar Trabajo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deliver and Charge Dialog */}
      <Dialog open={showDeliverDialog} onOpenChange={setShowDeliverDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600" />
              Entregar y Cobrar
            </DialogTitle>
          </DialogHeader>
          {selectedRepair && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-xl bg-slate-50">
                <p className="font-semibold text-slate-900">{selectedRepair.customer_name}</p>
                <p className="text-sm text-slate-600">{selectedRepair.equipment_description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedRepair.services.map(s => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {EXTERNAL_SERVICES.find(es => es.value === s)?.label || s}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="text-center p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                <p className="text-sm text-emerald-700 mb-1">Importe a cobrar</p>
                <p className="text-4xl font-bold text-emerald-700">€{selectedRepair.price.toFixed(2)}</p>
              </div>
              
              <div>
                <Label>Método de pago</Label>
                <Select value={deliveryPaymentMethod} onValueChange={setDeliveryPaymentMethod}>
                  <SelectTrigger className="h-12 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <p className="text-xs text-slate-500 text-center">
                Este ingreso se registrará automáticamente en la pestaña de Caja como "Ingreso Taller"
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
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processingDelivery ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              Cobrar y Entregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
