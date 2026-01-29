import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { itemApi } from "@/lib/api";
import { Package, Plus, Search, Loader2, Upload, Download, Barcode, Copy, Check, AlertCircle, Edit2, Trash2, Printer, Tag, Zap, TrendingUp, TrendingDown, DollarSign, ArrowUpDown, BarChart3, FileSpreadsheet, CheckCircle, XCircle, ArrowRight, Settings2, GripVertical, Eye, EyeOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import JsBarcode from 'jsbarcode';
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

// Column definitions for customizable table
const ALL_COLUMNS = [
  { id: "internal_code", label: "Código/Nombre", width: "w-32", required: true },
  { id: "barcode", label: "Cód. Barras", width: "w-28" },
  { id: "serial_number", label: "Nº Serie", width: "w-28" },
  { id: "item_type", label: "Tipo", width: "w-24" },
  { id: "brand_model", label: "Marca / Modelo", width: "w-40" },
  { id: "size", label: "Talla", width: "w-16" },
  { id: "binding", label: "Fijación", width: "w-28" },
  { id: "category", label: "Gama", width: "w-24" },
  { id: "status", label: "Estado", width: "w-24" },
  { id: "stock", label: "Stock", width: "w-24" },
  { id: "location", label: "Ubicación", width: "w-24" },
  { id: "days_used", label: "Días Uso", width: "w-20" },
  { id: "maintenance", label: "Mantenimiento", width: "w-28" },
  { id: "purchase_price", label: "Coste", width: "w-20" },
  { id: "rental_price", label: "Precio Alq.", width: "w-20" },
  { id: "purchase_date", label: "F. Compra", width: "w-24" },
];

const DEFAULT_VISIBLE_COLUMNS = ["internal_code", "barcode", "item_type", "brand_model", "size", "status", "stock", "days_used", "maintenance"];
const DEFAULT_COLUMN_ORDER = ALL_COLUMNS.map(c => c.id);

// Sortable Header Component
function SortableHeader({ id, children, width }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };
  
  return (
    <TableHead 
      ref={setNodeRef} 
      style={style} 
      className={`${width} select-none`}
      {...attributes}
    >
      <div className="flex items-center gap-1" {...listeners}>
        <GripVertical className="h-3 w-3 text-slate-400 opacity-50" />
        {children}
      </div>
    </TableHead>
  );
}

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
  const importFileRef = useRef(null);
  
  // Column customization states
  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = localStorage.getItem('inventory_column_order');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMN_ORDER;
  });
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('inventory_visible_columns');
    return saved ? JSON.parse(saved) : DEFAULT_VISIBLE_COLUMNS;
  });
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  // Save column preferences to localStorage
  useEffect(() => {
    localStorage.setItem('inventory_column_order', JSON.stringify(columnOrder));
  }, [columnOrder]);
  
  useEffect(() => {
    localStorage.setItem('inventory_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Get ordered and visible columns
  const orderedVisibleColumns = useMemo(() => {
    return columnOrder
      .filter(id => visibleColumns.includes(id))
      .map(id => ALL_COLUMNS.find(c => c.id === id))
      .filter(Boolean);
  }, [columnOrder, visibleColumns]);

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      toast.success("Orden de columnas guardado");
    }
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnId) => {
    const column = ALL_COLUMNS.find(c => c.id === columnId);
    if (column?.required) return; // Can't hide required columns
    
    setVisibleColumns(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  // Reset column configuration
  const resetColumnConfig = () => {
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    toast.success("Configuración de columnas restaurada");
  };
  
  // Import states for new universal importer
  const [importStep, setImportStep] = useState(1);
  const [importFile, setImportFile] = useState(null);
  const [importData, setImportData] = useState([]);
  const [fileColumns, setFileColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});

  // System fields for inventory mapping
  const inventoryFields = [
    { value: "internal_code", label: "Código Interno *", required: true },
    { value: "barcode", label: "Código de Barras", required: false },
    { value: "serial_number", label: "Número de Serie", required: false },
    { value: "item_type", label: "Tipo de Artículo *", required: true },
    { value: "brand", label: "Marca *", required: true },
    { value: "model", label: "Modelo", required: false },
    { value: "size", label: "Talla *", required: true },
    { value: "binding", label: "Fijación", required: false },
    { value: "category", label: "Gama (MEDIA/ALTA/SUPERIOR)", required: false },
    { value: "purchase_price", label: "Precio de Compra", required: false },
    { value: "purchase_date", label: "Fecha de Compra", required: false },
    { value: "location", label: "Ubicación", required: false }
  ];
  
  const [newItem, setNewItem] = useState({
    internal_code: "",
    barcode: "",
    serial_number: "",
    item_type: "",  // Empty by default - user selects from custom types
    brand: "",
    model: "",
    size: "",
    binding: "",
    purchase_price: "",
    acquisition_cost: "",
    purchase_date: new Date().toISOString().split('T')[0],
    location: "",
    maintenance_interval: "30",
    category: "MEDIA",
    // Generic item fields
    is_generic: false,
    name: "",
    stock_total: "",
    rental_price: ""
  });

  useEffect(() => {
    loadItemTypes();
  }, []);

  const loadItemTypes = async () => {
    try {
      const response = await axios.get(`${API}/item-types`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setItemTypes(response.data);
    } catch (error) {
      console.error("Error loading item types:", error);
      // No fallback - empty list if API fails (user creates their own types)
      setItemTypes([]);
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
      if (sortBy) params.sort_by = sortBy;
      
      // Use profitability endpoint if enabled
      if (showProfitability) {
        const response = await axios.get(`${API}/items/with-profitability`, {
          params,
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setItems(response.data.items);
        setProfitabilitySummary(response.data.summary);
      } else {
        const response = await itemApi.getAll(params);
        setItems(response.data);
        setProfitabilitySummary(null);
      }
    } catch (error) {
      toast.error("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [filterStatus, filterType, filterCategory, showProfitability, sortBy]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadItems();
  };

  const createItem = async () => {
    // Validation depends on item type
    if (newItem.is_generic) {
      // Generic item validation
      const stockNum = parseInt(newItem.stock_total);
      if (!newItem.name?.trim()) {
        toast.error("El nombre es obligatorio");
        return;
      }
      if (!newItem.item_type) {
        toast.error("Selecciona un tipo de artículo");
        return;
      }
      if (!newItem.stock_total || isNaN(stockNum) || stockNum < 1) {
        toast.error("El stock debe ser al menos 1 unidad");
        return;
      }
    } else {
      // Regular item validation
      if (!newItem.internal_code?.trim()) {
        toast.error("El código interno es obligatorio");
        return;
      }
      if (!newItem.item_type) {
        toast.error("Selecciona un tipo de artículo");
        return;
      }
    }
    
    try {
      // Clean numeric fields - convert empty strings to proper defaults
      const cleanNumber = (val, defaultVal = 0) => {
        const num = parseFloat(val);
        return isNaN(num) ? defaultVal : num;
      };
      const cleanInt = (val, defaultVal = 0) => {
        const num = parseInt(val);
        return isNaN(num) ? defaultVal : num;
      };

      const itemToCreate = {
        item_type: newItem.item_type,
        is_generic: newItem.is_generic || false,
        name: newItem.name?.trim() || "",
        barcode: newItem.is_generic ? "" : (newItem.barcode || `BC-${newItem.internal_code}`),
        internal_code: newItem.internal_code || "",
        serial_number: newItem.serial_number || "",
        brand: newItem.brand || "",
        model: newItem.model || "",
        size: newItem.size || "",
        binding: newItem.binding || "",
        location: newItem.location || "",
        category: newItem.category || "MEDIA",
        purchase_price: cleanNumber(newItem.purchase_price, 0),
        purchase_date: newItem.purchase_date || "",
        maintenance_interval: cleanInt(newItem.maintenance_interval, 30),
        stock_total: cleanInt(newItem.stock_total, 0),
        rental_price: cleanNumber(newItem.rental_price, 0)
      };
      
      await itemApi.create(itemToCreate);
      toast.success(newItem.is_generic ? "Artículo genérico creado correctamente" : "Artículo creado correctamente");
      setShowAddDialog(false);
      resetNewItem();
      loadItems();
    } catch (error) {
      // Handle Pydantic validation errors (array of objects) or string errors
      const detail = error.response?.data?.detail;
      let errorMsg = "Error al crear artículo";
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        errorMsg = detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
      }
      toast.error(errorMsg);
    }
  };

  const resetNewItem = () => {
    setNewItem({
      internal_code: "",
      barcode: "",
      serial_number: "",
      item_type: "",
      brand: "",
      model: "",
      size: "",
      binding: "",
      purchase_price: "",
      purchase_date: new Date().toISOString().split('T')[0],
      location: "",
      maintenance_interval: "30",
      category: "MEDIA",
      is_generic: false,
      name: "",
      stock_total: "",
      rental_price: ""
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

  // ============== UNIVERSAL IMPORT FUNCTIONS ==============
  const handleImportFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
      toast.error("Formato no válido. Usa CSV, XLS o XLSX");
      return;
    }

    setImportFile(file);
    parseImportFile(file);
  };

  const parseImportFile = async (file) => {
    setImportLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (jsonData.length < 2) {
        toast.error("El archivo debe tener al menos una fila de cabecera y una de datos");
        setImportLoading(false);
        return;
      }

      const headers = jsonData[0].map((h, idx) => ({
        index: idx,
        name: String(h).trim() || `Columna ${idx + 1}`
      }));

      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''));

      setFileColumns(headers);
      setImportData(rows);
      
      // Auto-map columns
      const autoMapping = {};
      headers.forEach(header => {
        const headerLower = header.name.toLowerCase();
        inventoryFields.forEach(field => {
          const fieldLower = field.label.toLowerCase().replace(' *', '');
          if (
            headerLower === field.value ||
            headerLower.includes(field.value.replace('_', ' ')) ||
            headerLower.includes(field.value.replace('_', '')) ||
            (field.value === 'internal_code' && (headerLower.includes('interno') || headerLower.includes('código') || headerLower.includes('codigo') || headerLower.includes('ref'))) ||
            (field.value === 'barcode' && (headerLower.includes('barras') || headerLower.includes('ean') || headerLower.includes('upc'))) ||
            (field.value === 'item_type' && (headerLower.includes('tipo') || headerLower.includes('categoría') || headerLower.includes('categoria'))) ||
            (field.value === 'brand' && (headerLower.includes('marca') || headerLower.includes('fabricante'))) ||
            (field.value === 'model' && (headerLower.includes('modelo') || headerLower.includes('referencia'))) ||
            (field.value === 'size' && (headerLower.includes('talla') || headerLower.includes('tamaño') || headerLower.includes('medida'))) ||
            (field.value === 'category' && (headerLower.includes('gama') || headerLower.includes('nivel') || headerLower.includes('calidad'))) ||
            (field.value === 'purchase_price' && (headerLower.includes('precio') || headerLower.includes('coste') || headerLower.includes('costo') || headerLower.includes('pvp'))) ||
            (field.value === 'purchase_date' && (headerLower.includes('fecha') || headerLower.includes('compra'))) ||
            (field.value === 'location' && (headerLower.includes('ubicación') || headerLower.includes('ubicacion') || headerLower.includes('almacén') || headerLower.includes('almacen')))
          ) {
            if (!autoMapping[field.value]) {
              autoMapping[field.value] = header.index;
            }
          }
        });
      });

      setColumnMapping(autoMapping);
      setImportStep(2);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Error al leer el archivo");
    } finally {
      setImportLoading(false);
    }
  };

  const getMappedInventoryPreview = () => {
    return importData.slice(0, 5).map(row => {
      const mapped = {};
      Object.entries(columnMapping).forEach(([field, colIndex]) => {
        if (colIndex !== undefined && colIndex !== null && colIndex !== -1) {
          mapped[field] = row[colIndex] || '';
        }
      });
      return mapped;
    });
  };

  const validateInventoryMapping = () => {
    const requiredFields = inventoryFields.filter(f => f.required).map(f => f.value);
    const missingFields = requiredFields.filter(field => 
      columnMapping[field] === undefined || columnMapping[field] === null || columnMapping[field] === -1
    );

    if (missingFields.length > 0) {
      const missingLabels = missingFields.map(f => 
        inventoryFields.find(sf => sf.value === f)?.label
      ).join(', ');
      toast.error(`Campos obligatorios sin mapear: ${missingLabels}`);
      return false;
    }
    return true;
  };

  const goToInventoryPreview = () => {
    if (validateInventoryMapping()) {
      setImportStep(3);
    }
  };

  const executeInventoryImport = async () => {
    setImportLoading(true);
    try {
      const itemsToImport = importData.map(row => {
        const item = {};
        Object.entries(columnMapping).forEach(([field, colIndex]) => {
          if (colIndex !== undefined && colIndex !== null && colIndex !== -1) {
            let value = row[colIndex] || '';
            // Convert all values to strings first (XLSX may parse numbers)
            value = String(value).trim();
            
            if (field === 'internal_code') {
              value = value.toUpperCase();
            }
            if (field === 'item_type') {
              value = value.toLowerCase();
            }
            if (field === 'category') {
              value = value.toUpperCase();
              if (!['SUPERIOR', 'ALTA', 'MEDIA'].includes(value)) {
                value = 'MEDIA';
              }
            }
            if (field === 'purchase_price') {
              value = parseFloat(value.replace(',', '.')) || 0;
            }
            item[field] = value;
          }
        });
        return item;
      }).filter(i => i.internal_code && i.item_type && i.brand && i.size);

      if (itemsToImport.length === 0) {
        toast.error("No hay artículos válidos para importar");
        setImportLoading(false);
        return;
      }

      const response = await axios.post(`${API}/items/import`, {
        items: itemsToImport
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      setImportResult(response.data);
      setImportStep(4);
      
      if (response.data.imported > 0) {
        toast.success(`${response.data.imported} artículos importados correctamente`);
        loadItems();
      }
    } catch (error) {
      console.error("Import error:", error);
      let errorMessage = "Error al importar artículos";
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = typeof error.response.data.detail === 'string' 
            ? error.response.data.detail 
            : JSON.stringify(error.response.data.detail);
        }
      }
      toast.error(errorMessage);
    } finally {
      setImportLoading(false);
    }
  };

  const resetInventoryImport = () => {
    setImportStep(1);
    setImportFile(null);
    setImportData([]);
    setFileColumns([]);
    setColumnMapping({});
    setImportResult(null);
    if (importFileRef.current) {
      importFileRef.current.value = '';
    }
  };

  const closeImportDialog = () => {
    setShowImportDialog(false);
    resetInventoryImport();
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
      serial_number: item.serial_number || "",
      binding: item.binding || "",
      purchase_price: item.purchase_price.toString(),
      maintenance_interval: item.maintenance_interval.toString()
    });
    setShowEditDialog(true);
  };

  const updateItem = async () => {
    if (!editingItem.internal_code || !editingItem.brand || !editingItem.size) {
      toast.error("Completa todos los campos obligatorios (Código Interno, Marca, Talla)");
      return;
    }
    
    try {
      await axios.put(`${API}/items/${editingItem.id}`, {
        barcode: editingItem.barcode,
        internal_code: editingItem.internal_code,
        serial_number: editingItem.serial_number || "",
        item_type: editingItem.item_type,
        brand: editingItem.brand,
        model: editingItem.model,
        size: editingItem.size,
        binding: editingItem.binding || "",
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

  const deleteItemType = async (typeId, typeName) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el tipo "${typeName}"?\n\nSi hay artículos usando este tipo, no se podrá eliminar.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/item-types/${typeId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success(`Tipo "${typeName}" eliminado correctamente`);
      
      // Reload types to update all dropdowns
      await loadItemTypes();
      
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Error al eliminar tipo";
      
      // Check if error is about items using the type
      if (errorMessage.includes("items are using it") || errorMessage.includes("productos asociados")) {
        const itemsCount = errorMessage.match(/\d+/)?.[0] || "algunos";
        toast.error(
          `No se puede eliminar este tipo porque ${itemsCount} artículos lo están usando. Cambia el tipo de esos productos primero.`,
          { duration: 5000 }
        );
      } else {
        toast.error(errorMessage);
      }
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
          <div className="flex flex-col gap-4">
            {/* Profitability Toggle */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <Button
                variant={showProfitability ? "default" : "outline"}
                onClick={() => setShowProfitability(!showProfitability)}
                className={`gap-2 ${showProfitability ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                data-testid="toggle-profitability"
              >
                <BarChart3 className="h-4 w-4" />
                {showProfitability ? "Modo Rentabilidad Activo" : "Ver Rentabilidad"}
              </Button>
              
              {showProfitability && (
                <Select value={sortBy || "none"} onValueChange={(v) => setSortBy(v === "none" ? "" : v)}>
                  <SelectTrigger className="w-52 h-10">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Ordenar por..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin ordenar</SelectItem>
                    <SelectItem value="profit">Mayor Beneficio</SelectItem>
                    <SelectItem value="profit_asc">Menor Beneficio</SelectItem>
                    <SelectItem value="revenue">Más Ingresos</SelectItem>
                    <SelectItem value="amortization">Mayor Amortización</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Profitability Summary */}
            {showProfitability && profitabilitySummary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Artículos</p>
                  <p className="text-xl font-bold text-slate-900">{profitabilitySummary.total_items}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Coste Total</p>
                  <p className="text-xl font-bold text-slate-900">€{profitabilitySummary.total_cost.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Ingresos Totales</p>
                  <p className="text-xl font-bold text-emerald-600">€{profitabilitySummary.total_revenue.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Beneficio Neto</p>
                  <p className={`text-xl font-bold ${profitabilitySummary.total_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    €{profitabilitySummary.total_profit.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Amortizados</p>
                  <p className="text-xl font-bold text-blue-600">
                    {profitabilitySummary.amortized_count} ({profitabilitySummary.amortized_percent}%)
                  </p>
                </div>
              </div>
            )}

            {/* Standard Filters */}
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
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-slate-500" />
              Artículos ({items.length})
            </CardTitle>
            
            {/* Column Configuration Button */}
            <Popover open={showColumnConfig} onOpenChange={setShowColumnConfig}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="column-config-btn">
                  <Settings2 className="h-4 w-4" />
                  Columnas
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Configurar Columnas</h4>
                    <Button variant="ghost" size="sm" onClick={resetColumnConfig} className="h-8 text-xs">
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restaurar
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Arrastra las cabeceras para reordenar. Marca/desmarca para mostrar/ocultar.
                  </p>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {ALL_COLUMNS.map((col) => (
                      <label
                        key={col.id}
                        className={`flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer ${
                          col.required ? 'opacity-70' : ''
                        }`}
                      >
                        <Checkbox
                          checked={visibleColumns.includes(col.id)}
                          onCheckedChange={() => toggleColumnVisibility(col.id)}
                          disabled={col.required}
                          data-testid={`col-toggle-${col.id}`}
                        />
                        <span className="text-sm flex-1">{col.label}</span>
                        {col.required && (
                          <span className="text-xs text-slate-400">(fija)</span>
                        )}
                        {visibleColumns.includes(col.id) ? (
                          <Eye className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-slate-300" />
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="pt-2 border-t text-xs text-slate-500">
                    {visibleColumns.length} de {ALL_COLUMNS.length} columnas visibles
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableContext items={orderedVisibleColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                        {orderedVisibleColumns.map((col) => (
                          <SortableHeader key={col.id} id={col.id} width={col.width}>
                            {col.label}
                          </SortableHeader>
                        ))}
                      </SortableContext>
                      <TableHead className="text-right w-24">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const usesRemaining = (item.maintenance_interval || 30) - (item.days_used || 0);
                    const needsMaintenance = usesRemaining <= 0;
                    
                    // Cell render function
                    const renderCell = (colId) => {
                      switch(colId) {
                        case 'internal_code':
                          return item.is_generic ? (
                            <div>
                              <span className="font-semibold text-emerald-700">{item.name}</span>
                              <Badge variant="outline" className="ml-2 text-xs bg-amber-50 text-amber-700">Genérico</Badge>
                            </div>
                          ) : (
                            <span className="font-mono text-sm font-bold text-primary">{item.internal_code || '-'}</span>
                          );
                        case 'barcode':
                          return item.is_generic ? <span className="text-xs text-slate-400">N/A</span> : <span className="font-mono text-xs text-slate-500">{item.barcode || '-'}</span>;
                        case 'serial_number':
                          return item.is_generic ? <span className="text-xs text-slate-400">N/A</span> : <span className="font-mono text-xs text-slate-500">{item.serial_number || '-'}</span>;
                        case 'item_type':
                          return <Badge variant="outline">{itemTypes.find(t => t.value === item.item_type)?.label || item.item_type}</Badge>;
                        case 'brand_model':
                          return item.is_generic ? <span className="text-slate-400">-</span> : <span className="font-medium">{item.brand} {item.model}</span>;
                        case 'size':
                          return item.is_generic ? '-' : item.size;
                        case 'binding':
                          return item.is_generic ? '-' : <span className="text-sm text-slate-600">{item.binding || '-'}</span>;
                        case 'category':
                          return <Badge className={getCategoryBadge(item.category)}>{item.category}</Badge>;
                        case 'status':
                          return item.is_generic ? (
                            <Badge className={item.stock_available > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                              {item.stock_available > 0 ? 'Disponible' : 'Agotado'}
                            </Badge>
                          ) : getStatusBadge(item.status);
                        case 'stock':
                          return item.is_generic ? (
                            <div className="text-center">
                              <span className="font-bold text-lg text-emerald-600">{item.stock_available}</span>
                              <span className="text-slate-400 text-xs">/{item.stock_total}</span>
                            </div>
                          ) : <span className="text-slate-400">-</span>;
                        case 'location':
                          return <span className="text-sm">{item.location || '-'}</span>;
                        case 'days_used':
                          return item.is_generic ? '-' : <span className="text-center">{item.days_used || 0}</span>;
                        case 'maintenance':
                          return item.is_generic ? <span className="text-slate-400">N/A</span> : needsMaintenance ? (
                            <Badge variant="destructive" className="animate-pulse"><AlertCircle className="h-3 w-3 mr-1" />¡MANT!</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700">{usesRemaining} usos</Badge>
                          );
                        case 'purchase_price':
                          return <span className="font-mono">€{(item.purchase_price || 0).toFixed(0)}</span>;
                        case 'rental_price':
                          return item.is_generic && item.rental_price ? (
                            <span className="font-mono text-emerald-600">€{item.rental_price.toFixed(2)}/d</span>
                          ) : '-';
                        case 'purchase_date':
                          return <span className="text-xs">{item.purchase_date || '-'}</span>;
                        default:
                          return '-';
                      }
                    };
                    
                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50">
                        {orderedVisibleColumns.map((col) => (
                          <TableCell key={col.id}>{renderCell(col.id)}</TableCell>
                        ))}
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
              </DndContext>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Añadir Artículo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Toggle: Generic vs Traceable */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="is_generic"
                  checked={newItem.is_generic}
                  onCheckedChange={(checked) => setNewItem({ 
                    ...newItem, 
                    is_generic: checked,
                    // Clear traceability fields when switching to generic
                    internal_code: checked ? "" : newItem.internal_code,
                    barcode: checked ? "" : newItem.barcode,
                    serial_number: checked ? "" : newItem.serial_number,
                    brand: checked ? "" : newItem.brand,
                    model: checked ? "" : newItem.model
                  })}
                  className="h-5 w-5"
                  data-testid="generic-item-checkbox"
                />
                <div>
                  <Label htmlFor="is_generic" className="text-sm font-semibold cursor-pointer">
                    Artículo Genérico (Sin numeración)
                  </Label>
                  <p className="text-xs text-amber-700">
                    Gestión por cantidad/stock. Sin códigos individuales.
                  </p>
                </div>
              </div>
            </div>

            {/* Generic Item Fields */}
            {newItem.is_generic ? (
              <>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-xs font-semibold text-emerald-700 uppercase mb-3">Datos del Artículo Genérico</p>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-semibold">Nombre del Artículo *</Label>
                      <Input
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        placeholder="Ej: Casco Adulto, Bastones Aluminio..."
                        className="h-11 mt-1 border-2 border-emerald-300 focus:border-emerald-500"
                        data-testid="generic-item-name"
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-semibold">Tipo *</Label>
                        <Select 
                          value={newItem.item_type} 
                          onValueChange={(v) => setNewItem({ ...newItem, item_type: v })}
                        >
                          <SelectTrigger className="h-11 mt-1" data-testid="generic-item-type">
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {itemTypes.length === 0 ? (
                              <div className="p-2 text-sm text-slate-500 text-center">
                                No hay tipos creados
                              </div>
                            ) : (
                              itemTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))
                            )}
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
                      <div>
                        <Label className="text-sm font-semibold">Stock Total *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newItem.stock_total}
                          onChange={(e) => setNewItem({ ...newItem, stock_total: e.target.value })}
                          placeholder="Ej: 50"
                          className="h-11 mt-1 text-lg font-bold border-2 border-emerald-300"
                          data-testid="generic-item-stock"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-semibold">Precio Alquiler (€/día) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newItem.rental_price}
                          onChange={(e) => setNewItem({ ...newItem, rental_price: e.target.value })}
                          placeholder="Ej: 5.00"
                          className="h-11 mt-1"
                          data-testid="generic-item-rental-price"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Precio Coste (€) opcional</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newItem.purchase_price}
                          onChange={(e) => setNewItem({ ...newItem, purchase_price: e.target.value })}
                          placeholder="Coste unitario"
                          className="h-11 mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Ubicación</Label>
                      <Input
                        value={newItem.location}
                        onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                        placeholder="Ej: Estante cascos"
                        className="h-11 mt-1"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Regular Item Fields (with traceability) */}
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Identificación</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-sm font-semibold">Código Interno *</Label>
                      <Input
                        value={newItem.internal_code}
                        onChange={(e) => setNewItem({ ...newItem, internal_code: e.target.value.toUpperCase() })}
                        placeholder="SKI-001"
                        className="h-10 mt-1 font-mono font-semibold text-sm border-2 border-primary/50 focus:border-primary"
                        data-testid="new-item-internal-code"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Cód. Barras</Label>
                      <Input
                        value={newItem.barcode}
                        onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
                        placeholder="Auto-genera"
                        className="h-10 mt-1 font-mono text-sm"
                        data-testid="new-item-barcode"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Nº Serie</Label>
                      <Input
                        value={newItem.serial_number}
                        onChange={(e) => setNewItem({ ...newItem, serial_number: e.target.value })}
                        placeholder="Fabricante"
                        className="h-10 mt-1 font-mono text-sm"
                        data-testid="new-item-serial"
                      />
                    </div>
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
                            <div 
                              key={type.value}
                              className="flex items-center justify-between hover:bg-slate-100 rounded"
                            >
                              <SelectItem 
                                value={type.value}
                                className="flex-1 cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  {type.label}
                                </div>
                              </SelectItem>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteItemType(type.id, type.label);
                                }}
                                title="Eliminar tipo"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
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
                    <Label>Marca *</Label>
                    <Input
                      value={newItem.brand}
                      onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                      className="h-11 mt-1"
                      data-testid="new-item-brand"
                    />
                  </div>
                  <div>
                    <Label>Modelo</Label>
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
                    <Label>Fijación</Label>
                    <Input
                      value={newItem.binding}
                      onChange={(e) => setNewItem({ ...newItem, binding: e.target.value })}
                      placeholder="Ej: Marker Griffon 13"
                      className="h-11 mt-1"
                      data-testid="new-item-binding"
                    />
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
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={createItem} data-testid="save-item-btn">
              {newItem.is_generic ? "Guardar Artículo Genérico" : "Guardar Artículo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog - Universal Importer */}
      <Dialog open={showImportDialog} onOpenChange={closeImportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              Importar Inventario
            </DialogTitle>
            <DialogDescription>
              Importa artículos desde un archivo CSV o Excel
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 py-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  importStep >= step 
                    ? 'bg-primary text-white' 
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {importStep > step ? <CheckCircle className="h-5 w-5" /> : step}
                </div>
                {step < 4 && (
                  <div className={`w-12 h-1 mx-1 ${
                    importStep > step ? 'bg-primary' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: File Upload */}
          {importStep === 1 && (
            <div className="py-6">
              <div 
                className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-primary hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => importFileRef.current?.click()}
              >
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleImportFileSelect}
                  className="hidden"
                  data-testid="import-inventory-file-input"
                />
                <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                <p className="text-lg font-semibold text-slate-700">
                  Arrastra o haz clic para seleccionar
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Formatos aceptados: CSV, XLS, XLSX
                </p>
                {importLoading && (
                  <div className="mt-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-slate-500 mt-2">Procesando archivo...</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium mb-2">💡 Consejos para la importación:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• La primera fila debe contener los nombres de las columnas</li>
                  <li>• Campos obligatorios: Código Interno, Tipo de Artículo, Marca, Talla</li>
                  <li>• Los duplicados por código interno serán detectados automáticamente</li>
                </ul>
              </div>
              
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <Button onClick={downloadTemplate} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Plantilla Excel
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {importStep === 2 && (
            <div className="py-4 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>📄 Archivo:</strong> {importFile?.name} ({importData.length} registros)
                </p>
              </div>

              <p className="text-sm text-slate-600">
                Asocia las columnas de tu archivo con los campos del sistema:
              </p>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {inventoryFields.map(field => (
                  <div key={field.value} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                    <div className="w-48 flex items-center gap-2">
                      <span className={`font-medium text-sm ${field.required ? 'text-slate-900' : 'text-slate-600'}`}>
                        {field.label}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                    <Select
                      value={columnMapping[field.value]?.toString() ?? "-1"}
                      onValueChange={(v) => setColumnMapping({
                        ...columnMapping,
                        [field.value]: v === "-1" ? -1 : parseInt(v)
                      })}
                    >
                      <SelectTrigger className="flex-1 h-11" data-testid={`mapping-inventory-${field.value}`}>
                        <SelectValue placeholder="Seleccionar columna..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">-- No importar --</SelectItem>
                        {fileColumns.map(col => (
                          <SelectItem key={col.index} value={col.index.toString()}>
                            {col.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={resetInventoryImport}>
                  Volver
                </Button>
                <Button onClick={goToInventoryPreview} data-testid="go-to-inventory-preview-btn">
                  Previsualizar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 3: Preview */}
          {importStep === 3 && (
            <div className="py-4 space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-800">
                  <strong>✅ Vista previa:</strong> Mostrando las primeras 5 filas de {importData.length} registros
                </p>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100">
                      {inventoryFields.filter(f => columnMapping[f.value] !== undefined && columnMapping[f.value] !== -1).map(field => (
                        <TableHead key={field.value} className="font-semibold text-xs">
                          {field.label.replace(' *', '')}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getMappedInventoryPreview().map((row, idx) => (
                      <TableRow key={idx}>
                        {inventoryFields.filter(f => columnMapping[f.value] !== undefined && columnMapping[f.value] !== -1).map(field => (
                          <TableCell key={field.value} className="text-xs">
                            {row[field.value] || <span className="text-slate-400">-</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>📊 Resumen:</strong> Se importarán {importData.length} artículos. 
                  Los duplicados por código interno serán omitidos automáticamente.
                </p>
              </div>

              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setImportStep(2)}>
                  Volver al Mapeo
                </Button>
                <Button 
                  onClick={executeInventoryImport} 
                  disabled={importLoading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  data-testid="execute-inventory-import-btn"
                >
                  {importLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar {importData.length} Artículos
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 4: Results */}
          {importStep === 4 && importResult && (
            <div className="py-6 space-y-6">
              <div className="text-center">
                {importResult.imported > 0 ? (
                  <CheckCircle className="h-16 w-16 mx-auto text-emerald-500 mb-4" />
                ) : (
                  <XCircle className="h-16 w-16 mx-auto text-orange-500 mb-4" />
                )}
                <h3 className="text-2xl font-bold text-slate-900">
                  Importación Completada
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-emerald-600">{importResult.imported || 0}</p>
                    <p className="text-sm text-emerald-700 mt-1">Importados</p>
                  </CardContent>
                </Card>
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-amber-600">{importResult.duplicates || 0}</p>
                    <p className="text-sm text-amber-700 mt-1">Duplicados (omitidos)</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-red-600">{importResult.errors || 0}</p>
                    <p className="text-sm text-red-700 mt-1">Errores</p>
                  </CardContent>
                </Card>
              </div>

              {importResult.duplicate_codes && importResult.duplicate_codes.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 mb-2">Códigos duplicados omitidos:</p>
                  <div className="flex flex-wrap gap-2">
                    {importResult.duplicate_codes.slice(0, 10).map((code, idx) => (
                      <Badge key={idx} variant="outline" className="bg-white font-mono">
                        {code}
                      </Badge>
                    ))}
                    {importResult.duplicate_codes.length > 10 && (
                      <Badge variant="secondary">
                        +{importResult.duplicate_codes.length - 10} más
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button onClick={closeImportDialog} className="w-full" data-testid="close-inventory-import-btn">
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          )}
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
                        <div 
                          key={type.value}
                          className="flex items-center justify-between hover:bg-slate-100 rounded"
                        >
                          <SelectItem 
                            value={type.value}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              {type.label}
                              {!type.is_default && (
                                <Badge variant="secondary" className="text-xs">Personalizado</Badge>
                              )}
                            </div>
                          </SelectItem>
                          {!type.is_default && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteItemType(type.id, type.label);
                              }}
                              title="Eliminar tipo personalizado"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
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
