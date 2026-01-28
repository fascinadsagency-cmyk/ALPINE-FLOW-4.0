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
  AlertCircle
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
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
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

  const openDeleteDialog = (provider) => {
    setDeletingProvider(provider);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/sources/${deletingProvider.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Proveedor eliminado");
      setShowDeleteDialog(false);
      setDeletingProvider(null);
      loadProviders();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al eliminar proveedor");
    }
  };

  const openStatistics = (provider) => {
    // TODO: Implementar en siguiente paso
    toast.info("Estadísticas próximamente");
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
                    <TableHead>Descuento</TableHead>
                    <TableHead>Comisión</TableHead>
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
                        {provider.discount_percent > 0 ? (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            -{provider.discount_percent}%
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {provider.commission_percent > 0 ? (
                          <Badge className="bg-blue-100 text-blue-700">
                            {provider.commission_percent}%
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
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
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openStatistics(provider)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(provider)}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
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
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Eliminar Proveedor</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que quieres eliminar este proveedor?
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <p className="font-medium text-slate-900">{deletingProvider.name}</p>
                {deletingProvider.customer_count > 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="h-4 w-4" />
                    <span>{deletingProvider.customer_count} clientes asociados</span>
                  </div>
                )}
              </div>

              {deletingProvider.customer_count > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">
                    No se puede eliminar este proveedor porque tiene {deletingProvider.customer_count} clientes asociados.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deletingProvider.customer_count > 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
