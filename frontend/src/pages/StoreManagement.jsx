import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Store, Plus, Users, Package, ShoppingCart, Building2, TrendingUp, Settings, Loader2 } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";

const API = process.env.REACT_APP_BACKEND_URL;

export default function StoreManagement() {
  const { darkMode } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeStats, setStoreStats] = useState({});

  // New store form
  const [newStore, setNewStore] = useState({
    name: "",
    plan: "basic",
    max_users: 10,
    max_items: 10000,
    max_customers: 10000,
    contact_email: "",
    contact_phone: "",
    address: ""
  });

  // Verificar permisos de super_admin
  useEffect(() => {
    if (user && user.role !== "super_admin") {
      toast.error("Esta página es solo para administradores del sistema");
      navigate("/");
      return;
    }
    if (user) {
      loadStores();
    }
  }, [user, navigate]);

  const loadStores = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/stores`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setStores(response.data);
      
      // Load stats for each store
      for (const store of response.data) {
        loadStoreStats(store.store_id);
      }
    } catch (error) {
      toast.error("Error al cargar tiendas");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (storeId) => {
    try {
      const response = await axios.post(
        `${API}/api/stores/${storeId}/impersonate`,
        {},
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Save new token and reload
      localStorage.setItem('token', response.data.access_token);
      toast.success(`Accediendo a la tienda...`);
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      toast.error("Error al acceder a la tienda");
      console.error(error);
    }
  };

  const handleToggleStatus = async (storeId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activar' : 'desactivar';
    
    if (!confirm(`¿Estás seguro de que deseas ${action} esta tienda?`)) {
      return;
    }

    try {
      await axios.put(
        `${API}/api/stores/${storeId}`,
        { status: newStatus },
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      
      toast.success(`Tienda ${action === 'activar' ? 'activada' : 'desactivada'} exitosamente`);
      loadStores(); // Reload stores
    } catch (error) {
      toast.error(`Error al ${action} la tienda`);
      console.error(error);
    }
  };

  const handleDeleteStore = async (storeId, storeName) => {
    if (storeId === 1) {
      toast.error("No se puede eliminar la tienda principal");
      return;
    }

    const confirmText = `¿ELIMINAR ${storeName}?`;
    const userInput = prompt(`Esta acción es IRREVERSIBLE.\n\nSe eliminarán:\n- La tienda\n- Todos los usuarios asociados\n\nPara confirmar, escribe: ${confirmText}`);
    
    if (userInput !== confirmText) {
      toast.error("Cancelado - Texto de confirmación incorrecto");
      return;
    }

    try {
      const response = await axios.delete(
        `${API}/api/stores/${storeId}`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      
      toast.success(`Tienda eliminada: ${response.data.deleted_users} usuarios eliminados`);
      loadStores(); // Reload stores
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al eliminar la tienda");
      console.error(error);
    }
  };

  const loadStoreStats = async (storeId) => {
    try {
      const response = await axios.get(`${API}/api/stores/${storeId}/stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setStoreStats(prev => ({ ...prev, [storeId]: response.data }));
    } catch (error) {
      console.error(`Error loading stats for store ${storeId}:`, error);
    }
  };

  const handleCreateStore = async () => {
    if (!newStore.name) {
      toast.error("El nombre de la tienda es obligatorio");
      return;
    }

    try {
      await axios.post(`${API}/api/stores`, newStore, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Tienda creada exitosamente");
      setShowCreateDialog(false);
      setNewStore({
        name: "",
        plan: "basic",
        max_users: 10,
        max_items: 10000,
        max_customers: 10000,
        contact_email: "",
        contact_phone: "",
        address: ""
      });
      loadStores();
    } catch (error) {
      toast.error("Error al crear tienda");
      console.error(error);
    }
  };

  const getPlanBadge = (plan) => {
    // Handle null/undefined plans
    const planType = plan || 'basic';
    
    const colors = {
      basic: "bg-gray-100 text-gray-800",
      pro: "bg-blue-100 text-blue-800",
      enterprise: "bg-purple-100 text-purple-800",
      trial: "bg-yellow-100 text-yellow-800"
    };
    return (
      <Badge className={colors[planType] || colors.basic}>
        {planType.toUpperCase()}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    return status === "active" ? (
      <Badge className="bg-green-100 text-green-800">Activa</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Inactiva</Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`p-6 lg:p-8 space-y-6 min-h-screen ${darkMode ? 'bg-[#121212]' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Building2 className="inline-block h-8 w-8 mr-2" />
            Gestión de Tiendas
          </h1>
          <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Panel de Super Administrador - {stores.length} tienda{stores.length !== 1 ? 's' : ''} registrada{stores.length !== 1 ? 's' : ''}
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tienda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nueva Tienda</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de la Tienda *</Label>
                  <Input
                    value={newStore.name}
                    onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                    placeholder="Ej: Mi Tienda Madrid"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={newStore.plan} onValueChange={(val) => setNewStore({ ...newStore, plan: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Máx. Usuarios</Label>
                  <Input
                    type="number"
                    value={newStore.max_users}
                    onChange={(e) => setNewStore({ ...newStore, max_users: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Máx. Artículos</Label>
                  <Input
                    type="number"
                    value={newStore.max_items}
                    onChange={(e) => setNewStore({ ...newStore, max_items: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Máx. Clientes</Label>
                  <Input
                    type="number"
                    value={newStore.max_customers}
                    onChange={(e) => setNewStore({ ...newStore, max_customers: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newStore.contact_email}
                    onChange={(e) => setNewStore({ ...newStore, contact_email: e.target.value })}
                    placeholder="contacto@tienda.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={newStore.contact_phone}
                    onChange={(e) => setNewStore({ ...newStore, contact_phone: e.target.value })}
                    placeholder="+34 600 000 000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={newStore.address}
                  onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                  placeholder="Calle Principal, 123"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateStore}>
                Crear Tienda
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map((store) => {
          const stats = storeStats[store.store_id] || {};
          return (
            <Card key={store.store_id} className={darkMode ? 'bg-[#1a1a1a] border-[#333]' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="h-5 w-5" />
                      {store.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      ID: {store.store_id}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {getPlanBadge(store.plan || store.plan_type)}
                    {getStatusBadge(store.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-xs text-slate-500">Clientes</p>
                        <p className="font-semibold">{stats.customers || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-xs text-slate-500">Artículos</p>
                        <p className="font-semibold">{stats.items || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-xs text-slate-500">Alquileres</p>
                        <p className="font-semibold">{stats.rentals || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-xs text-slate-500">Usuarios</p>
                        <p className="font-semibold">{stats.users || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Limits */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 mb-2">Límites del Plan</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Usuarios:</span>
                        <span className="font-medium">{stats.users || 0}/{store.settings.max_users}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Artículos:</span>
                        <span className="font-medium">{stats.items || 0}/{store.settings.max_items}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Clientes:</span>
                        <span className="font-medium">{stats.customers || 0}/{store.settings.max_customers}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => navigate(`/tiendas/${store.store_id}/ajustes`)}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Configurar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleImpersonate(store.store_id)}
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Acceder
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant={store.status === 'active' ? 'destructive' : 'default'}
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleToggleStatus(store.store_id, store.status)}
                      >
                        {store.status === 'active' ? 'Desactivar' : 'Activar'}
                      </Button>
                      {store.store_id !== 1 && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleDeleteStore(store.store_id, store.name)}
                        >
                          Eliminar
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

      {/* Empty state */}
      {stores.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Store className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold mb-2">No hay tiendas registradas</h3>
            <p className="text-slate-500 mb-4">Crea tu primera tienda para comenzar</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tienda
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
