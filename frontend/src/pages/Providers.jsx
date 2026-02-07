import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import axios from "axios";
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  BarChart3,
  Loader2,
  Users,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Trophy
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Providers() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [deletingProvider, setDeletingProvider] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteCheckResult, setDeleteCheckResult] = useState(null); // { canDelete, customers, items }
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [globalStats, setGlobalStats] = useState(null);
  const [showGlobalMetrics, setShowGlobalMetrics] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    discount_percent: "0",
    commission_percent: "0",
    contact_person: "",
    email: "",
    phone: "",
    notes: "",
    active: true
  });

  useEffect(() => {
    loadProviders();
    loadGlobalStats();
    // Obtener rol del usuario desde el token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || 'employee');
      } catch (e) {
        setUserRole('employee');
      }
    }
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/sources`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setProviders(response.data);
    } catch (error) {
      toast.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalStats = async () => {
    try {
      // Calcular estadísticas globales desde todos los proveedores
      const response = await axios.get(`${API}/sources`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const totalCustomers = response.data.reduce((sum, p) => sum + (p.customer_count || 0), 0);
      const avgDiscount = response.data.filter(p => p.discount_percent > 0).length > 0
        ? response.data.reduce((sum, p) => sum + p.discount_percent, 0) / response.data.filter(p => p.discount_percent > 0).length
        : 0;
      const avgCommission = response.data.filter(p => p.commission_percent > 0).length > 0
        ? response.data.reduce((sum, p) => sum + p.commission_percent, 0) / response.data.filter(p => p.commission_percent > 0).length
        : 0;
      
      setGlobalStats({
        total_providers: response.data.length,
        active_providers: response.data.filter(p => p.active).length,
        total_customers: totalCustomers,
        avg_discount: avgDiscount,
        avg_commission: avgCommission,
        providers_with_discount: response.data.filter(p => p.discount_percent > 0).length,
        providers_with_commission: response.data.filter(p => p.commission_percent > 0).length
      });
    } catch (error) {
      console.error("Error loading global stats:", error);
    }
  };

  const openCreateDialog = () => {
    setEditingProvider(null);
    setFormData({
      name: "",
      discount_percent: "0",
      commission_percent: "0",
      contact_person: "",
      email: "",
      phone: "",
      notes: "",
      active: true
    });
    setShowDialog(true);
  };

  const openEditDialog = (provider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      discount_percent: provider.discount_percent.toString(),
      commission_percent: provider.commission_percent.toString(),
      contact_person: provider.contact_person || "",
      email: provider.email || "",
      phone: provider.phone || "",
      notes: provider.notes || "",
      active: provider.active
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        discount_percent: parseFloat(formData.discount_percent) || 0,
        commission_percent: parseFloat(formData.commission_percent) || 0,
        contact_person: formData.contact_person,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes,
        active: formData.active,
        is_favorite: false
      };

      if (editingProvider) {
        await axios.put(
          `${API}/sources/${editingProvider.id}`,
          payload,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
        );
        toast.success("Proveedor actualizado");
      } else {
        await axios.post(
          `${API}/sources`,
          payload,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
        );
        toast.success("Proveedor creado");
      }

      setShowDialog(false);
      loadProviders();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al guardar proveedor");
    }
  };

  const openDeleteDialog = async (provider) => {
    setDeletingProvider(provider);
    setDeleteCheckResult(null);
    setShowDeleteDialog(true);
    
    // Verificar si se puede eliminar (check clientes y artículos asociados)
    setDeleteLoading(true);
    try {
      // Obtener conteo de clientes asociados a este proveedor
      const customersRes = await axios.get(`${API}/customers?source=${encodeURIComponent(provider.name)}&limit=1`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      // El API ya devuelve el customer_count en el proveedor
      const customerCount = provider.customer_count || 0;
      
      // Por ahora asumimos 0 artículos, el backend hará la validación final
      const itemCount = 0;
      
      setDeleteCheckResult({
        canDelete: customerCount === 0 && itemCount === 0,
        customers: customerCount,
        items: itemCount
      });
    } catch (error) {
      console.error("Error checking delete eligibility:", error);
      setDeleteCheckResult({
        canDelete: false,
        customers: provider.customer_count || 0,
        items: 0,
        error: "Error al verificar"
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${API}/sources/${deletingProvider.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Proveedor eliminado correctamente");
      setShowDeleteDialog(false);
      setDeletingProvider(null);
      setDeleteCheckResult(null);
      loadProviders();
      loadGlobalStats();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Error al eliminar proveedor";
      toast.error(errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Verificar si el usuario puede eliminar (solo admin/super_admin)
  const canDeleteProviders = userRole === 'admin' || userRole === 'super_admin';

  const openStatistics = async (provider) => {
    setStatsLoading(true);
    setShowStatsDialog(true);
    try {
      const response = await axios.get(`${API}/sources/${provider.id}/stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setStatsData(response.data);
    } catch (error) {
      toast.error("Error al cargar estadísticas");
      setShowStatsDialog(false);
    } finally {
      setStatsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `€${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="p-6 lg:p-8" data-testid="providers-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Proveedores
          </h1>
          <p className="text-slate-500">Gestiona colaboradores y fuentes de clientes</p>
        </div>
        <Button onClick={openCreateDialog} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-500" />
            Lista de Proveedores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">No hay proveedores registrados</p>
              <p className="text-sm">Crea el primer proveedor para empezar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Condiciones</TableHead>
                    <TableHead>Clientes</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((provider) => (
                    <TableRow key={provider.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{provider.name}</p>
                            {provider.notes && (
                              <p className="text-xs text-slate-500">{provider.notes.slice(0, 40)}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {provider.discount_percent > 0 && (
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                              -{provider.discount_percent}%
                            </Badge>
                          )}
                          {provider.commission_percent > 0 && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              +{provider.commission_percent}%
                            </Badge>
                          )}
                          {provider.discount_percent === 0 && provider.commission_percent === 0 && (
                            <span className="text-slate-400 text-sm">Sin config.</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${
                            provider.customer_count > 10 ? 'bg-emerald-500' :
                            provider.customer_count > 5 ? 'bg-blue-500' :
                            provider.customer_count > 0 ? 'bg-amber-500' : 'bg-slate-300'
                          }`} />
                          <Users className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">{provider.customer_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {provider.contact_person ? (
                          <div className="text-sm">
                            <p className="font-medium text-slate-700">{provider.contact_person}</p>
                            {provider.phone && (
                              <p className="text-slate-500">{provider.phone}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={provider.active ? "default" : "secondary"}>
                          {provider.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(provider)}
                            className="h-8 w-8"
                            title="Editar proveedor"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openStatistics(provider)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Ver estadísticas"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          {canDeleteProviders && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(provider)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar proveedor"
                              data-testid={`delete-provider-${provider.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* Global Metrics Panel - Below the table */}
      {globalStats && (
        <Card className="mt-6 border-slate-200 bg-gradient-to-br from-slate-50 to-white">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Resumen de Rendimiento Global
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGlobalMetrics(!showGlobalMetrics)}
                className="text-slate-500"
              >
                {showGlobalMetrics ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
          </CardHeader>
          
          {showGlobalMetrics && (
            <CardContent className="pt-6">
              {/* KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                {/* Total Providers */}
                <Card className="bg-white border-slate-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-600 text-xs mb-2">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="font-medium">Proveedores</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{globalStats.total_providers}</p>
                    <p className="text-xs text-emerald-600 mt-1">
                      {globalStats.active_providers} activos
                    </p>
                  </CardContent>
                </Card>

                {/* Total Customers */}
                <Card className="bg-blue-50 border-blue-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-blue-600 text-xs mb-2">
                      <Users className="h-3.5 w-3.5" />
                      <span className="font-medium">Clientes</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{globalStats.total_customers}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Total referidos
                    </p>
                  </CardContent>
                </Card>

                {/* Avg Discount */}
                <Card className="bg-emerald-50 border-emerald-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-emerald-600 text-xs mb-2">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span className="font-medium">Dto. Medio</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-900">
                      {globalStats.avg_discount.toFixed(1)}%
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      {globalStats.providers_with_discount} con descuento
                    </p>
                  </CardContent>
                </Card>

                {/* Avg Commission */}
                <Card className="bg-amber-50 border-amber-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-amber-600 text-xs mb-2">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="font-medium">Com. Media</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-900">
                      {globalStats.avg_commission.toFixed(1)}%
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      {globalStats.providers_with_commission} con comisión
                    </p>
                  </CardContent>
                </Card>

                {/* Best Provider */}
                <Card className="bg-purple-50 border-purple-200 hover:shadow-md transition-shadow col-span-2 md:col-span-2 lg:col-span-3">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-purple-600 text-xs mb-2">
                      <Trophy className="h-3.5 w-3.5" />
                      <span className="font-medium">Top Proveedor</span>
                    </div>
                    {providers.length > 0 ? (
                      <>
                        <p className="text-lg font-bold text-purple-900 truncate">
                          {[...providers].sort((a, b) => (b.customer_count || 0) - (a.customer_count || 0))[0]?.name || "-"}
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          {[...providers].sort((a, b) => (b.customer_count || 0) - (a.customer_count || 0))[0]?.customer_count || 0} clientes
                        </p>
                      </>
                    ) : (
                      <p className="text-lg text-purple-400">Sin datos</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Distribution Chart */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Distribution by Customer Count */}
                <Card className="border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-700">
                      Distribución por Clientes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { label: "Alta (10+)", count: providers.filter(p => p.customer_count > 10).length, color: "bg-emerald-500" },
                        { label: "Media (5-10)", count: providers.filter(p => p.customer_count >= 5 && p.customer_count <= 10).length, color: "bg-blue-500" },
                        { label: "Baja (1-4)", count: providers.filter(p => p.customer_count > 0 && p.customer_count < 5).length, color: "bg-amber-500" },
                        { label: "Sin clientes", count: providers.filter(p => p.customer_count === 0).length, color: "bg-slate-300" }
                      ].map((segment) => (
                        <div key={segment.label} className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${segment.color}`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-slate-600">{segment.label}</span>
                              <span className="text-sm font-medium text-slate-900">{segment.count}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${segment.color}`}
                                style={{ width: `${providers.length > 0 ? (segment.count / providers.length * 100) : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Configuration Summary */}
                <Card className="border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-700">
                      Resumen de Configuración
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">Con descuento</span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-900">{globalStats.providers_with_discount}</p>
                          <p className="text-xs text-emerald-600">
                            {providers.length > 0 ? ((globalStats.providers_with_discount / providers.length) * 100).toFixed(0) : 0}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-amber-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">Con comisión</span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-900">{globalStats.providers_with_commission}</p>
                          <p className="text-xs text-amber-600">
                            {providers.length > 0 ? ((globalStats.providers_with_commission / providers.length) * 100).toFixed(0) : 0}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">Activos</span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-900">{globalStats.active_providers}</p>
                          <p className="text-xs text-blue-600">
                            {providers.length > 0 ? ((globalStats.active_providers / providers.length) * 100).toFixed(0) : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-slate-100 border border-slate-200">
                <p className="text-xs text-slate-600 text-center">
                  💡 <strong>Tip:</strong> Haz scroll hacia arriba para gestionar la lista de proveedores. Las métricas aquí te ayudan a tener una visión global del rendimiento.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? "Editar Proveedor" : "Nuevo Proveedor"}
            </DialogTitle>
            <DialogDescription>
              Configura los datos del proveedor o colaborador
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Nombre del Proveedor *</Label>
              <Input
                placeholder="Ej: Hotel Ski Paradise"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>% Descuento Cliente</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="0"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">Descuento aplicado a clientes</p>
              </div>
              <div>
                <Label>% Comisión Proveedor</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="0"
                  value={formData.commission_percent}
                  onChange={(e) => setFormData({ ...formData, commission_percent: e.target.value })}
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">Comisión a pagar</p>
              </div>
            </div>

            <div>
              <Label>Persona de Contacto</Label>
              <Input
                placeholder="Nombre del contacto"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="contacto@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  type="tel"
                  placeholder="+34 600 000 000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                placeholder="Información adicional sobre el proveedor..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-2"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <div>
                <Label className="text-sm font-medium">Estado</Label>
                <p className="text-xs text-slate-500">Activo/Inactivo</p>
              </div>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingProvider ? "Actualizar" : "Crear"} Proveedor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {deletingProvider && (
        <Dialog open={showDeleteDialog} onOpenChange={(open) => {
          if (!open) {
            setShowDeleteDialog(false);
            setDeletingProvider(null);
            setDeleteCheckResult(null);
          }
        }}>
          <DialogContent className="sm:max-w-md" data-testid="delete-provider-dialog">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Eliminar Proveedor
              </DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que quieres eliminar a este proveedor? <strong>Esta acción no se puede deshacer.</strong>
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {/* Info del proveedor */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{deletingProvider.name}</p>
                    {deletingProvider.contact_person && (
                      <p className="text-sm text-slate-500">{deletingProvider.contact_person}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Estado de verificación */}
              {deleteLoading ? (
                <div className="mt-4 p-4 bg-slate-100 rounded-lg flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                  <span className="text-slate-600">Verificando dependencias...</span>
                </div>
              ) : deleteCheckResult && (
                <>
                  {/* Clientes asociados */}
                  {deleteCheckResult.customers > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-red-800">
                          {deleteCheckResult.customers} cliente(s) asociado(s)
                        </p>
                        <p className="text-sm text-red-700 mt-1">
                          No se puede eliminar el proveedor porque tiene clientes asociados. 
                          Reasigna los clientes a otro proveedor primero.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Artículos asociados */}
                  {deleteCheckResult.items > 0 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-800">
                          {deleteCheckResult.items} artículo(s) asociado(s)
                        </p>
                        <p className="text-sm text-amber-700 mt-1">
                          No se puede eliminar el proveedor porque tiene artículos asociados. 
                          Reasigna los artículos a otro proveedor primero.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Todo OK */}
                  {deleteCheckResult.canDelete && (
                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-emerald-800">
                          Sin dependencias
                        </p>
                        <p className="text-sm text-emerald-700 mt-1">
                          El proveedor no tiene clientes ni artículos asociados y puede ser eliminado de forma segura.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeletingProvider(null);
                  setDeleteCheckResult(null);
                }}
                disabled={deleteLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteLoading || !deleteCheckResult?.canDelete}
                data-testid="confirm-delete-provider"
              >
                {deleteLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Eliminar Proveedor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Statistics Dialog */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Estadísticas: {statsData?.source.name}
            </DialogTitle>
            <DialogDescription>
              Análisis de rendimiento y comisiones del proveedor
            </DialogDescription>
          </DialogHeader>

          {statsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : statsData && (
            <div className="space-y-6 py-4">
              {/* Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
                      <Users className="h-4 w-4" />
                      <span>Clientes</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{statsData.stats.total_customers}</p>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-emerald-600 text-sm mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>Ingresos</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-900">
                      {formatCurrency(statsData.stats.total_revenue)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-purple-600 text-sm mb-1">
                      <BarChart3 className="h-4 w-4" />
                      <span>Ticket Medio</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatCurrency(statsData.stats.average_ticket)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-amber-600 text-sm mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span>Comisión</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-900">
                      {formatCurrency(statsData.stats.total_commission)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Rentals Table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Últimos Alquileres ({statsData.rentals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statsData.rentals.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <p>No hay alquileres registrados</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Importe</TableHead>
                            <TableHead className="text-right">Comisión</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statsData.rentals.slice(0, 50).map((rental, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-sm">
                                {formatDate(rental.date)}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{rental.customer_name}</p>
                                  <p className="text-xs text-slate-500">{rental.customer_dni}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(rental.amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge className="bg-amber-100 text-amber-700">
                                  {formatCurrency(rental.commission)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatsDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
