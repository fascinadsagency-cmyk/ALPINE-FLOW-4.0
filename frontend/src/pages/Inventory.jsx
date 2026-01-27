import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { itemApi } from "@/lib/api";
import { Package, Plus, Search, Loader2, Filter } from "lucide-react";
import { toast } from "sonner";

const ITEM_TYPES = [
  { value: "ski", label: "Esquís" },
  { value: "snowboard", label: "Snowboard" },
  { value: "boots", label: "Botas" },
  { value: "helmet", label: "Casco" },
  { value: "poles", label: "Bastones" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "available", label: "Disponible" },
  { value: "rented", label: "Alquilado" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "retired", label: "Baja" },
];

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    barcode: "",
    item_type: "ski",
    brand: "",
    model: "",
    size: "",
    purchase_price: "",
    purchase_date: new Date().toISOString().split('T')[0],
    location: ""
  });

  useEffect(() => {
    loadItems();
  }, [filterStatus, filterType]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.item_type = filterType;
      if (searchTerm) params.search = searchTerm;
      
      const response = await itemApi.getAll(params);
      setItems(response.data);
    } catch (error) {
      toast.error("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadItems();
  };

  const createItem = async () => {
    if (!newItem.barcode || !newItem.brand || !newItem.model || !newItem.size) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    
    try {
      await itemApi.create({
        ...newItem,
        purchase_price: parseFloat(newItem.purchase_price) || 0
      });
      toast.success("Artículo creado correctamente");
      setShowAddDialog(false);
      setNewItem({
        barcode: "",
        item_type: "ski",
        brand: "",
        model: "",
        size: "",
        purchase_price: "",
        purchase_date: new Date().toISOString().split('T')[0],
        location: ""
      });
      loadItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear artículo");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      available: "bg-emerald-100 text-emerald-700",
      rented: "bg-red-100 text-red-700",
      maintenance: "bg-amber-100 text-amber-700",
      retired: "bg-slate-100 text-slate-600"
    };
    const labels = {
      available: "Disponible",
      rented: "Alquilado",
      maintenance: "Mantenimiento",
      retired: "Baja"
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  return (
    <div className="p-6 lg:p-8" data-testid="inventory-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Inventario
        </h1>
        <Button onClick={() => setShowAddDialog(true)} data-testid="add-item-btn">
          <Plus className="h-4 w-4 mr-2" />
          Añadir Artículo
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar por código, marca o modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11"
                data-testid="inventory-search"
              />
              <Button type="submit" className="h-11">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 h-11" data-testid="filter-status">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 h-11" data-testid="filter-type">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {ITEM_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-500" />
            Artículos ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No se encontraron artículos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Marca / Modelo</TableHead>
                    <TableHead>Talla</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Días Uso</TableHead>
                    <TableHead>Amortización</TableHead>
                    <TableHead>Ubicación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono">{item.barcode}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ITEM_TYPES.find(t => t.value === item.item_type)?.label || item.item_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.brand} {item.model}
                      </TableCell>
                      <TableCell>{item.size}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>{item.days_used}</TableCell>
                      <TableCell className="font-mono">
                        €{item.amortization?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>{item.location || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Añadir Artículo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Código de Barras *</Label>
                <Input
                  value={newItem.barcode}
                  onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
                  className="h-11 mt-1 font-mono"
                  data-testid="new-item-barcode"
                />
              </div>
              <div>
                <Label>Tipo *</Label>
                <Select 
                  value={newItem.item_type} 
                  onValueChange={(v) => setNewItem({ ...newItem, item_type: v })}
                >
                  <SelectTrigger className="h-11 mt-1" data-testid="new-item-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Marca *</Label>
                <Input
                  value={newItem.brand}
                  onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                  className="h-11 mt-1"
                  data-testid="new-item-brand"
                />
              </div>
              <div>
                <Label>Modelo *</Label>
                <Input
                  value={newItem.model}
                  onChange={(e) => setNewItem({ ...newItem, model: e.target.value })}
                  className="h-11 mt-1"
                  data-testid="new-item-model"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Talla *</Label>
                <Input
                  value={newItem.size}
                  onChange={(e) => setNewItem({ ...newItem, size: e.target.value })}
                  className="h-11 mt-1"
                  data-testid="new-item-size"
                />
              </div>
              <div>
                <Label>Precio Coste</Label>
                <Input
                  type="number"
                  value={newItem.purchase_price}
                  onChange={(e) => setNewItem({ ...newItem, purchase_price: e.target.value })}
                  className="h-11 mt-1"
                  data-testid="new-item-price"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha Compra</Label>
                <Input
                  type="date"
                  value={newItem.purchase_date}
                  onChange={(e) => setNewItem({ ...newItem, purchase_date: e.target.value })}
                  className="h-11 mt-1"
                  data-testid="new-item-date"
                />
              </div>
              <div>
                <Label>Ubicación</Label>
                <Input
                  value={newItem.location}
                  onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                  className="h-11 mt-1"
                  placeholder="Ej: Estante A1"
                  data-testid="new-item-location"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={createItem} data-testid="save-item-btn">
              Guardar Artículo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
