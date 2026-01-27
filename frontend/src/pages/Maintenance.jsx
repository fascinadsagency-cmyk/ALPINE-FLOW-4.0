import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { maintenanceApi, itemApi } from "@/lib/api";
import { Wrench, Plus, Check, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const MAINTENANCE_TYPES = [
  { value: "sharpen", label: "Afilado" },
  { value: "wax", label: "Encerado" },
  { value: "repair", label: "Reparación" },
  { value: "inspection", label: "Inspección" },
  { value: "other", label: "Otro" },
];

export default function Maintenance() {
  const [records, setRecords] = useState([]);
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

  useEffect(() => {
    loadRecords();
  }, [filterStatus]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const response = await maintenanceApi.getAll(filterStatus);
      setRecords(response.data);
    } catch (error) {
      toast.error("Error al cargar mantenimientos");
    } finally {
      setLoading(false);
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

  const openAddDialog = () => {
    loadAvailableItems();
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
      loadRecords();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear mantenimiento");
    }
  };

  const completeMaintenance = async (id) => {
    try {
      await maintenanceApi.complete(id);
      toast.success("Mantenimiento completado");
      loadRecords();
    } catch (error) {
      toast.error("Error al completar mantenimiento");
    }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="maintenance-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Mantenimiento
          </h1>
          <p className="text-slate-500 mt-1">Gestiona el mantenimiento de los equipos</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-11" data-testid="filter-maintenance-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
              <SelectItem value="">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openAddDialog} data-testid="add-maintenance-btn">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo
          </Button>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5 text-slate-500" />
            Registros de Mantenimiento ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay registros de mantenimiento</p>
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

      {/* Add Maintenance Dialog */}
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
    </div>
  );
}
