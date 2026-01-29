import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { itemApi } from "@/lib/api";
import { Package, Plus, Search, Loader2, Upload, Download, Barcode, Copy, Check, AlertCircle, Edit2, Trash2, Printer, Tag, Zap, TrendingUp, TrendingDown, DollarSign, ArrowUpDown, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import JsBarcode from 'jsbarcode';
import { Progress } from "@/components/ui/progress";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "available", label: "Disponible" },
  { value: "rented", label: "Alquilado" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "retired", label: "Baja" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "Todas las gamas" },
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

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [generatedBarcodes, setGeneratedBarcodes] = useState([]);
  const [barcodePrefix, setBarcodePrefix] = useState("SKI");
  const [barcodeCount, setBarcodeCount] = useState(5);
  const [itemTypes, setItemTypes] = useState([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [showProfitability, setShowProfitability] = useState(false);
  const [profitabilitySummary, setProfitabilitySummary] = useState(null);
  const [sortBy, setSortBy] = useState("");
  const fileInputRef = useRef(null);
  
  const [newItem, setNewItem] = useState({
    internal_code: "",
    barcode: "",
    item_type: "ski",
    brand: "",
    model: "",
    size: "",
    purchase_price: "",
    acquisition_cost: "",
    purchase_date: new Date().toISOString().split('T')[0],
    location: "",
    maintenance_interval: "30",
    category: "MEDIA"
  });

  useEffect(() => {
    loadItems();
    loadItemTypes();
  }, [filterStatus, filterType, filterCategory]);

  const loadItemTypes = async () => {
    try {
      const response = await axios.get(`${API}/item-types`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setItemTypes(response.data);
    } catch (error) {
      console.error("Error loading item types:", error);
      // Fallback to default types if API fails
      setItemTypes([
        { value: "ski", label: "Esquís", is_default: true },
        { value: "snowboard", label: "Snowboard", is_default: true },
        { value: "boots", label: "Botas", is_default: true },
        { value: "helmet", label: "Casco", is_default: true },
        { value: "poles", label: "Bastones", is_default: true },
      ]);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus && filterStatus !== "all") params.status = filterStatus;
      if (filterType && filterType !== "all") params.item_type = filterType;
      if (filterCategory && filterCategory !== "all") params.category = filterCategory;
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
    if (!newItem.internal_code || !newItem.brand || !newItem.model || !newItem.size) {
      toast.error("Completa todos los campos obligatorios (Código Interno, Marca, Modelo, Talla)");
      return;
    }
    
    try {
      // Si no hay barcode, generar uno automáticamente basado en internal_code
      const itemToCreate = {
        ...newItem,
        barcode: newItem.barcode || `BC-${newItem.internal_code}`,
        purchase_price: parseFloat(newItem.purchase_price) || 0,
        maintenance_interval: parseInt(newItem.maintenance_interval) || 30
      };
      
      await itemApi.create(itemToCreate);
      toast.success("Artículo creado correctamente");
      setShowAddDialog(false);
      resetNewItem();
      loadItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear artículo");
    }
  };

  const resetNewItem = () => {
    setNewItem({
      internal_code: "",
      barcode: "",
      item_type: "ski",
      brand: "",
      model: "",
      size: "",
      purchase_price: "",
      purchase_date: new Date().toISOString().split('T')[0],
      location: "",
      maintenance_interval: "30",
      category: "MEDIA"
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportLoading(true);
    setImportResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/items/import-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setImportResult(response.data);
      if (response.data.created > 0) {
        toast.success(`${response.data.created} artículos importados`);
        loadItems();
      }
      if (response.data.errors?.length > 0) {
        toast.warning(`${response.data.errors.length} errores en la importación`);
      }
    } catch (error) {
      toast.error("Error al importar CSV");
      setImportResult({ error: error.response?.data?.detail || "Error desconocido" });
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const exportCSV = async () => {
    try {
      const response = await axios.get(`${API}/items/export-csv`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inventario.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Inventario exportado");
    } catch (error) {
      toast.error("Error al exportar");
    }
  };

  const generateBarcodes = async () => {
    try {
      const response = await axios.post(`${API}/items/generate-barcodes`, {
        prefix: barcodePrefix,
        count: barcodeCount
      });
      setGeneratedBarcodes(response.data.barcodes);
      toast.success(`${response.data.barcodes.length} códigos generados`);
    } catch (error) {
      toast.error("Error al generar códigos");
    }
  };

  const copyBarcode = (barcode) => {
    navigator.clipboard.writeText(barcode);
    toast.success("Código copiado");
  };

  const selectGeneratedBarcode = (barcode) => {
    setNewItem({ ...newItem, barcode });
    setShowGenerateDialog(false);
    setShowAddDialog(true);
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

  const downloadTemplate = () => {
    const template = `barcode,item_type,brand,model,size,purchase_price,purchase_date,location,maintenance_interval,category
SKI001,ski,Salomon,X-Max,170,350,2024-01-15,Estante A1,30,ALTA
SKI002,boots,Atomic,Hawx,27.5,200,2024-01-15,Estante B2,50,MEDIA
SKI003,helmet,Giro,Neo,M,80,2024-01-15,Estante C1,100,SUPERIOR`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_inventario.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("Plantilla descargada");
  };

  const openEditDialog = (item) => {
    setEditingItem({
      ...item,
      purchase_price: item.purchase_price.toString(),
      maintenance_interval: item.maintenance_interval.toString()
    });
    setShowEditDialog(true);
  };

  const updateItem = async () => {
    if (!editingItem.internal_code || !editingItem.brand || !editingItem.model || !editingItem.size) {
      toast.error("Completa todos los campos obligatorios (Código Interno, Marca, Modelo, Talla)");
      return;
    }
    
    try {
      await axios.put(`${API}/items/${editingItem.id}`, {
        barcode: editingItem.barcode,
        internal_code: editingItem.internal_code,
        item_type: editingItem.item_type,
        brand: editingItem.brand,
        model: editingItem.model,
        size: editingItem.size,
        purchase_price: parseFloat(editingItem.purchase_price) || 0,
        purchase_date: editingItem.purchase_date,
        location: editingItem.location || "",
        maintenance_interval: parseInt(editingItem.maintenance_interval) || 30,
        category: editingItem.category
      });
      toast.success("Artículo actualizado correctamente");
      setShowEditDialog(false);
      setEditingItem(null);
      loadItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al actualizar artículo");
    }
  };

  const openDeleteDialog = (item) => {
    setDeletingItem(item);
    setShowDeleteDialog(true);
  };

  const deleteItem = async () => {
    try {
      await axios.delete(`${API}/items/${deletingItem.id}`);
      toast.success("Artículo eliminado correctamente");
      setShowDeleteDialog(false);
      setDeletingItem(null);
      loadItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al eliminar artículo");
    }
  };

  const createNewItemType = async () => {
    if (!newTypeName.trim()) {
      toast.error("Ingresa un nombre para el nuevo tipo");
      return;
    }

    try {
      const response = await axios.post(`${API}/item-types`, {
        value: newTypeName.toLowerCase().replace(/\s+/g, '_'),
        label: newTypeName.trim()
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success(`Tipo "${newTypeName}" creado correctamente`);
      setShowAddTypeDialog(false);
      setNewTypeName("");
      
      // Reload types and set the new type as selected
      await loadItemTypes();
      setNewItem({ ...newItem, item_type: response.data.value });
      
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear tipo");
    }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="inventory-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Inventario
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)} data-testid="import-csv-btn">
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <Button variant="outline" onClick={exportCSV} data-testid="export-csv-btn">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={() => setShowGenerateDialog(true)} data-testid="generate-barcodes-btn">
            <Barcode className="h-4 w-4 mr-2" />
            Generar Códigos
          </Button>
          <Button onClick={() => setShowAddDialog(true)} data-testid="add-item-btn">
            <Plus className="h-4 w-4 mr-2" />
            Añadir Artículo
          </Button>
        </div>
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
                  <SelectItem value="all">Todos</SelectItem>
                  {itemTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40 h-11" data-testid="filter-category">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                    <TableHead>Código Barras</TableHead>
                    <TableHead>Código Interno</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Marca / Modelo</TableHead>
                    <TableHead>Talla</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Días Uso</TableHead>
                    <TableHead>Usos para Mant.</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const usesRemaining = (item.maintenance_interval || 30) - (item.days_used || 0);
                    const needsMaintenance = usesRemaining <= 0;
                    
                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-sm">{item.barcode}</TableCell>
                        <TableCell className="font-mono text-sm font-semibold text-primary">
                          {item.internal_code || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {itemTypes.find(t => t.value === item.item_type)?.label || item.item_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryBadge(item.category || 'MEDIA')}>
                            {item.category || 'MEDIA'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.brand} {item.model}
                        </TableCell>
                        <TableCell>{item.size}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-center">{item.days_used}</TableCell>
                        <TableCell>
                          {needsMaintenance ? (
                            <Badge variant="destructive" className="whitespace-nowrap animate-pulse">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              ¡MANTENIMIENTO!
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="whitespace-nowrap bg-emerald-50 text-emerald-700 border-emerald-200">
                              {usesRemaining} {usesRemaining === 1 ? 'uso' : 'usos'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{item.location || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(item)}
                              className="h-8 w-8"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(item)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                <Label className="text-base font-semibold">Código Interno * <span className="text-primary">🏷️</span></Label>
                <Input
                  value={newItem.internal_code}
                  onChange={(e) => setNewItem({ ...newItem, internal_code: e.target.value.toUpperCase() })}
                  placeholder="Ej: SKI-G-001"
                  className="h-11 mt-1 font-mono font-semibold text-base border-2 border-primary/50 focus:border-primary"
                  data-testid="new-item-internal-code"
                  autoFocus
                />
                <p className="text-xs text-primary font-medium mt-1">Tu numeración principal de tienda</p>
              </div>
              <div>
                <Label>Código de Barras <span className="text-slate-400 text-xs">(Opcional)</span></Label>
                <Input
                  value={newItem.barcode}
                  onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
                  placeholder="Escanear o dejar vacío"
                  className="h-11 mt-1 font-mono"
                  data-testid="new-item-barcode"
                />
                <p className="text-xs text-slate-500 mt-1">Se auto-genera si está vacío</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <div className="flex gap-2 mt-1">
                  <Select 
                    value={newItem.item_type} 
                    onValueChange={(v) => setNewItem({ ...newItem, item_type: v })}
                  >
                    <SelectTrigger className="h-11 flex-1" data-testid="new-item-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {itemTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                          {!type.is_default && (
                            <Badge variant="secondary" className="ml-2 text-xs">Personalizado</Badge>
                          )}
                        </SelectItem>
                      ))}
                      <div className="border-t my-1"></div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setShowAddTypeDialog(true);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-slate-100 rounded text-primary font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        Añadir nuevo tipo
                      </button>
                    </SelectContent>
                  </Select>
                </div>
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
                <Label>Categoría</Label>
                <Select 
                  value={newItem.category} 
                  onValueChange={(v) => setNewItem({ ...newItem, category: v })}
                >
                  <SelectTrigger className="h-11 mt-1" data-testid="new-item-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPERIOR">Gama Superior</SelectItem>
                    <SelectItem value="ALTA">Gama Alta</SelectItem>
                    <SelectItem value="MEDIA">Gama Media</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Precio Coste (€)</Label>
                <Input
                  type="number"
                  value={newItem.purchase_price}
                  onChange={(e) => setNewItem({ ...newItem, purchase_price: e.target.value })}
                  className="h-11 mt-1"
                  data-testid="new-item-price"
                />
              </div>
              <div>
                <Label>Mantenimiento cada (días)</Label>
                <Input
                  type="number"
                  value={newItem.maintenance_interval}
                  onChange={(e) => setNewItem({ ...newItem, maintenance_interval: e.target.value })}
                  className="h-11 mt-1"
                  data-testid="new-item-maintenance"
                />
              </div>
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

      {/* Import CSV Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Inventario desde CSV</DialogTitle>
            <DialogDescription>
              Sube un archivo CSV con los datos de los artículos
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="upload" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Subir Archivo</TabsTrigger>
              <TabsTrigger value="template">Plantilla</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4 pt-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <Upload className="h-10 w-10 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-600 mb-3">Arrastra un archivo CSV o haz clic para seleccionar</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button variant="outline" className="cursor-pointer" asChild>
                    <span>
                      {importLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Seleccionar Archivo
                    </span>
                  </Button>
                </label>
              </div>
              
              {importResult && (
                <div className={`p-4 rounded-lg ${importResult.error ? 'bg-red-50' : 'bg-slate-50'}`}>
                  {importResult.error ? (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      <span>{importResult.error}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <Check className="h-5 w-5" />
                        <span>{importResult.created} artículos importados</span>
                      </div>
                      {importResult.errors?.length > 0 && (
                        <div className="text-amber-600 text-sm">
                          {importResult.errors.length} errores (códigos duplicados u otros)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="template" className="space-y-4 pt-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Columnas requeridas:</h4>
                <div className="text-sm text-slate-600 space-y-1 font-mono">
                  <p>barcode, item_type, brand, model, size,</p>
                  <p>purchase_price, purchase_date, location,</p>
                  <p>maintenance_interval</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Tipos de artículo válidos:</h4>
                <p className="text-sm text-slate-600">ski, snowboard, boots, helmet, poles</p>
              </div>
              <Button onClick={downloadTemplate} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Descargar Plantilla CSV
              </Button>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportDialog(false);
              setImportResult(null);
            }}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Barcodes Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generar Códigos de Barras</DialogTitle>
            <DialogDescription>
              Genera códigos únicos para nuevos artículos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prefijo</Label>
                <Select value={barcodePrefix} onValueChange={setBarcodePrefix}>
                  <SelectTrigger className="h-11 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SKI">SKI (Esquís)</SelectItem>
                    <SelectItem value="SNB">SNB (Snowboard)</SelectItem>
                    <SelectItem value="BOT">BOT (Botas)</SelectItem>
                    <SelectItem value="CAS">CAS (Cascos)</SelectItem>
                    <SelectItem value="BAS">BAS (Bastones)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={barcodeCount}
                  onChange={(e) => setBarcodeCount(parseInt(e.target.value) || 1)}
                  className="h-11 mt-1"
                />
              </div>
            </div>
            
            <Button onClick={generateBarcodes} className="w-full">
              <Barcode className="h-4 w-4 mr-2" />
              Generar Códigos
            </Button>
            
            {generatedBarcodes.length > 0 && (
              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {generatedBarcodes.map((barcode) => (
                  <div key={barcode} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="font-mono text-sm">{barcode}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => copyBarcode(barcode)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => selectGeneratedBarcode(barcode)}>
                        Usar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowGenerateDialog(false);
              setGeneratedBarcodes([]);
            }}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      {editingItem && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Artículo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-base font-semibold">Código Interno * <span className="text-primary">🏷️</span></Label>
                  <Input
                    value={editingItem.internal_code || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, internal_code: e.target.value.toUpperCase() })}
                    placeholder="Ej: SKI-G-001"
                    className="h-11 mt-1 font-mono font-semibold text-base border-2 border-primary/50 focus:border-primary"
                  />
                  <p className="text-xs text-primary font-medium mt-1">Tu numeración principal de tienda</p>
                </div>
                <div>
                  <Label>Código de Barras</Label>
                  <Input
                    value={editingItem.barcode}
                    onChange={(e) => setEditingItem({ ...editingItem, barcode: e.target.value })}
                    className="h-11 mt-1 font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">Para escaneo con lector</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo *</Label>
                  <Select 
                    value={editingItem.item_type} 
                    onValueChange={(v) => setEditingItem({ ...editingItem, item_type: v })}
                  >
                    <SelectTrigger className="h-11 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {itemTypes.map(type => (
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
                    value={editingItem.brand}
                    onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                    className="h-11 mt-1"
                  />
                </div>
                <div>
                  <Label>Modelo *</Label>
                  <Input
                    value={editingItem.model}
                    onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                    className="h-11 mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Talla *</Label>
                  <Input
                    value={editingItem.size}
                    onChange={(e) => setEditingItem({ ...editingItem, size: e.target.value })}
                    className="h-11 mt-1"
                  />
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Select 
                    value={editingItem.category} 
                    onValueChange={(v) => setEditingItem({ ...editingItem, category: v })}
                  >
                    <SelectTrigger className="h-11 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPERIOR">Gama Superior</SelectItem>
                      <SelectItem value="ALTA">Gama Alta</SelectItem>
                      <SelectItem value="MEDIA">Gama Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Precio Coste (€)</Label>
                  <Input
                    type="number"
                    value={editingItem.purchase_price}
                    onChange={(e) => setEditingItem({ ...editingItem, purchase_price: e.target.value })}
                    className="h-11 mt-1"
                  />
                </div>
                <div>
                  <Label>Mantenimiento cada (días)</Label>
                  <Input
                    type="number"
                    value={editingItem.maintenance_interval}
                    onChange={(e) => setEditingItem({ ...editingItem, maintenance_interval: e.target.value })}
                    className="h-11 mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Ubicación</Label>
                <Input
                  value={editingItem.location}
                  onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                  className="h-11 mt-1"
                  placeholder="Ej: Estante A1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowEditDialog(false);
                setEditingItem(null);
              }}>
                Cancelar
              </Button>
              <Button onClick={updateItem}>
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingItem && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Eliminar Artículo</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que quieres eliminar este artículo?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <p className="font-mono font-medium">{deletingItem.barcode}</p>
                <p className="text-sm text-slate-600">
                  {deletingItem.brand} {deletingItem.model} - {deletingItem.size}
                </p>
                <Badge className={getCategoryBadge(deletingItem.category)}>
                  {deletingItem.category}
                </Badge>
              </div>
              {deletingItem.status === 'rented' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">
                    No se puede eliminar este artículo porque está actualmente alquilado.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowDeleteDialog(false);
                setDeletingItem(null);
              }}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={deleteItem}
                disabled={deletingItem.status === 'rented'}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* Add New Type Dialog */}
      <Dialog open={showAddTypeDialog} onOpenChange={setShowAddTypeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Añadir Nuevo Tipo de Artículo
            </DialogTitle>
            <DialogDescription>
              Crea un nuevo tipo personalizado que se guardará en tu inventario
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Nombre del Tipo *</Label>
              <Input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Ej: Snowblade, Trineo, Protecciones..."
                className="mt-2 h-11"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    createNewItemType();
                  }
                }}
              />
              <p className="text-xs text-slate-500 mt-2">
                Este tipo aparecerá en el desplegable para futuros artículos y en los filtros del sistema
              </p>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>💡 Consejo:</strong> Usa nombres descriptivos y únicos para facilitar la identificación
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddTypeDialog(false);
              setNewTypeName("");
            }}>
              Cancelar
            </Button>
            <Button onClick={createNewItemType} disabled={!newTypeName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Tipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
