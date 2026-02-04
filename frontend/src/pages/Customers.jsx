import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { customerApi } from "@/lib/api";
import { Search, Users, History, Loader2, Phone, MapPin, Plus, Edit2, Trash2, AlertTriangle, FileText, DollarSign, Calendar, Package, ArrowUpRight, ArrowDownLeft, Banknote, Mail, MessageCircle, Upload, FileSpreadsheet, CheckCircle, XCircle, ArrowRight, Mountain, Ruler, Scale, Edit3, Save, X, ChevronDown, Download } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import * as XLSX from "xlsx";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all"); // all, active, inactive
  const [statusCounts, setStatusCounts] = useState({ total: 0, active: 0, inactive: 0 });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    dni: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    source: "",
    notes: "",
    boot_size: "",
    height: "",
    weight: "",
    ski_level: ""
  });

  // Technical data editing state
  const [editingTechnicalData, setEditingTechnicalData] = useState(false);
  const [technicalDataExpanded, setTechnicalDataExpanded] = useState(false); // Accordion state
  const [technicalDataForm, setTechnicalDataForm] = useState({
    boot_size: "",
    height: "",
    weight: "",
    ski_level: ""
  });
  const [savingTechnicalData, setSavingTechnicalData] = useState(false);

  const SKI_LEVELS = [
    { value: "sin_especificar", label: "Sin especificar" },
    { value: "principiante", label: "Principiante" },
    { value: "intermedio", label: "Intermedio" },
    { value: "avanzado", label: "Avanzado" },
    { value: "experto", label: "Experto" }
  ];

  // Import states
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importStep, setImportStep] = useState(1); // 1: upload, 2: mapping, 3: preview, 4: result
  const [importFile, setImportFile] = useState(null);
  const [importData, setImportData] = useState([]);
  const [fileColumns, setFileColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // ========== BULK SELECTION STATES ==========
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [customersWithActiveRentals, setCustomersWithActiveRentals] = useState([]);

  // System fields for mapping
  const systemFields = [
    { value: "dni", label: "DNI/Pasaporte *", required: true },
    { value: "name", label: "Nombre *", required: true },
    { value: "phone", label: "Teléfono *", required: true },
    { value: "email", label: "Email", required: false },
    { value: "address", label: "Dirección", required: false },
    { value: "city", label: "Ciudad/Población", required: false },
    { value: "source", label: "Proveedor/Fuente", required: false },
    { value: "notes", label: "Notas", required: false }
  ];

  useEffect(() => {
    loadCustomersWithStatus();
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const response = await axios.get(`${API}/sources`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setProviders(response.data);
    } catch (error) {
      console.error("Error loading providers:", error);
    }
  };

  const loadCustomersWithStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/customers/with-status`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setAllCustomers(response.data.customers);
      setCustomers(response.data.customers);
      setStatusCounts(response.data.counts);
    } catch (error) {
      toast.error("Error al cargar clientes");
      // Fallback to old method
      try {
        const fallbackResponse = await customerApi.getAll("");
        setCustomers(fallbackResponse.data);
        setAllCustomers(fallbackResponse.data);
      } catch (e) {
        console.error("Fallback also failed:", e);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async (search = "") => {
    setLoading(true);
    try {
      const response = await customerApi.getAll(search);
      setCustomers(response.data);
      setAllCustomers(response.data);
    } catch (error) {
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = [...allCustomers];

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(term) ||
        c.dni.toLowerCase().includes(term) ||
        (c.phone && c.phone.toLowerCase().includes(term))
      );
    }

    // Filter by provider
    if (selectedProvider === "none") {
      filtered = filtered.filter(c => !c.source || c.source === "");
    } else if (selectedProvider !== "all") {
      filtered = filtered.filter(c => c.source === selectedProvider);
    }

    // Filter by status (active/inactive)
    if (selectedStatus === "active") {
      filtered = filtered.filter(c => c.has_active_rental === true);
    } else if (selectedStatus === "inactive") {
      filtered = filtered.filter(c => c.has_active_rental !== true);
    }

    setCustomers(filtered);
  };

  useEffect(() => {
    filterCustomers();
  }, [searchTerm, selectedProvider, selectedStatus, allCustomers]);

  // ========== BULK SELECTION FUNCTIONS ==========
  
  // Toggle selection of a single customer
  const toggleCustomerSelection = (customerId) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  // Toggle selection of all visible customers
  const toggleSelectAll = () => {
    if (selectedCustomers.size === customers.length && customers.length > 0) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customers.map(c => c.id)));
    }
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedCustomers(new Set());
  };

  // Open bulk delete confirmation dialog
  const openBulkDeleteDialog = async () => {
    if (selectedCustomers.size === 0) return;
    
    // Check which customers have active rentals
    try {
      const customerIds = Array.from(selectedCustomers);
      const response = await axios.post(`${API}/customers/check-active-rentals`, 
        { customer_ids: customerIds },
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }}
      );
      setCustomersWithActiveRentals(response.data.customers_with_rentals || []);
      setShowBulkDeleteDialog(true);
    } catch (error) {
      // If endpoint doesn't exist, proceed without check
      setCustomersWithActiveRentals([]);
      setShowBulkDeleteDialog(true);
    }
  };

  // Execute bulk delete
  const bulkDeleteCustomers = async () => {
    if (selectedCustomers.size === 0) return;
    
    setBulkDeleteLoading(true);
    try {
      // Filter out customers with active rentals
      const safeToDelete = Array.from(selectedCustomers).filter(
        id => !customersWithActiveRentals.some(c => c.id === id)
      );
      
      if (safeToDelete.length === 0) {
        toast.error("No hay clientes que se puedan eliminar. Todos tienen alquileres activos.");
        setBulkDeleteLoading(false);
        return;
      }
      
      const response = await axios.post(`${API}/customers/bulk-delete`, 
        { customer_ids: safeToDelete },
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }}
      );
      
      const deleted = response.data.deleted || safeToDelete.length;
      const failed = response.data.failed || 0;
      
      if (deleted > 0) {
        toast.success(`${deleted} cliente${deleted !== 1 ? 's' : ''} eliminado${deleted !== 1 ? 's' : ''} correctamente`);
      }
      if (failed > 0) {
        toast.warning(`${failed} cliente${failed !== 1 ? 's' : ''} no se pudieron eliminar`);
      }
      
      setShowBulkDeleteDialog(false);
      setSelectedCustomers(new Set());
      setCustomersWithActiveRentals([]);
      loadCustomersWithStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al eliminar clientes");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const viewHistory = async (customer) => {
    setSelectedCustomer(customer);
    setHistoryLoading(true);
    try {
      const response = await customerApi.getHistory(customer.id);
      setCustomerHistory(response.data);
    } catch (error) {
      toast.error("Error al cargar historial");
    } finally {
      setHistoryLoading(false);
    }
  };

  const createCustomer = async () => {
    if (!newCustomer.name || !newCustomer.dni || !newCustomer.phone) {
      toast.error("Nombre, DNI y Teléfono son obligatorios");
      return;
    }

    try {
      await customerApi.create({
        name: newCustomer.name,
        dni: newCustomer.dni.toUpperCase(),
        phone: newCustomer.phone,
        email: newCustomer.email || "",
        address: newCustomer.address || "",
        city: newCustomer.city || "",
        source: newCustomer.source || "",
        notes: newCustomer.notes || ""
      });
      toast.success("Cliente creado correctamente");
      setShowNewCustomerDialog(false);
      resetNewCustomerForm();
      loadCustomersWithStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al crear cliente");
    }
  };

  const openEditDialog = (customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name,
      dni: customer.dni,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      city: customer.city || "",
      source: customer.source || "",
      notes: customer.notes || ""
    });
    setShowEditDialog(true);
  };

  const updateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.dni || !newCustomer.phone) {
      toast.error("Nombre, DNI y Teléfono son obligatorios");
      return;
    }

    try {
      await axios.put(`${API}/customers/${editingCustomer.id}`, {
        name: newCustomer.name,
        dni: newCustomer.dni.toUpperCase(),
        phone: newCustomer.phone,
        email: newCustomer.email || "",
        address: newCustomer.address || "",
        city: newCustomer.city || "",
        source: newCustomer.source || "",
        notes: newCustomer.notes || ""
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Cliente actualizado correctamente");
      setShowEditDialog(false);
      setEditingCustomer(null);
      resetNewCustomerForm();
      loadCustomersWithStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al actualizar cliente");
    }
  };

  const openDeleteDialog = (customer) => {
    setDeletingCustomer(customer);
    setShowDeleteDialog(true);
  };

  const deleteCustomer = async () => {
    try {
      await axios.delete(`${API}/customers/${deletingCustomer.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Cliente eliminado correctamente");
      setShowDeleteDialog(false);
      setDeletingCustomer(null);
      loadCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al eliminar cliente");
    }
  };

  const resetNewCustomerForm = () => {
    setNewCustomer({
      name: "",
      dni: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      source: "",
      notes: "",
      boot_size: "",
      height: "",
      weight: "",
      ski_level: ""
    });
  };

  const getProviderDiscount = (sourceName) => {
    if (!sourceName) return null;
    const provider = providers.find(p => p.name === sourceName);
    return provider?.discount_percent || 0;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Contact functions
  const sendWhatsAppMessage = (phone, customerName) => {
    if (!phone) {
      toast.error("No hay teléfono registrado para este cliente");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hola ${customerName}, te contactamos de la tienda de esquí. ¿En qué podemos ayudarte?`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const callPhone = (phone) => {
    if (!phone) {
      toast.error("No hay teléfono registrado");
      return;
    }
    window.open(`tel:${phone}`, '_self');
  };

  const sendEmail = (email, customerName) => {
    if (!email) {
      toast.error("No hay email registrado");
      return;
    }
    const subject = encodeURIComponent("Información sobre tu alquiler - Tienda de Esquí");
    const body = encodeURIComponent(
      `Hola ${customerName},\n\nTe contactamos desde la tienda de esquí.\n\nGracias.`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  // ============== TECHNICAL DATA FUNCTIONS ==============
  const startEditingTechnicalData = () => {
    setTechnicalDataForm({
      boot_size: selectedCustomer?.boot_size || "",
      height: selectedCustomer?.height || "",
      weight: selectedCustomer?.weight || "",
      ski_level: selectedCustomer?.ski_level || "sin_especificar"
    });
    setEditingTechnicalData(true);
  };

  const cancelEditingTechnicalData = () => {
    setEditingTechnicalData(false);
    setTechnicalDataForm({
      boot_size: "",
      height: "",
      weight: "",
      ski_level: ""
    });
  };

  const saveTechnicalData = async () => {
    if (!selectedCustomer?.id) {
      toast.error("No se puede guardar: cliente no identificado");
      return;
    }

    setSavingTechnicalData(true);
    try {
      await axios.patch(`${API}/customers/${selectedCustomer.id}/technical-data`, technicalDataForm, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      // Update local state
      setSelectedCustomer(prev => ({
        ...prev,
        boot_size: technicalDataForm.boot_size,
        height: technicalDataForm.height,
        weight: technicalDataForm.weight,
        ski_level: technicalDataForm.ski_level
      }));

      toast.success("Datos técnicos guardados correctamente");
      setEditingTechnicalData(false);
      
      // Reload customers list to reflect changes
      loadCustomersWithStatus();
    } catch (error) {
      toast.error("Error al guardar datos técnicos");
    } finally {
      setSavingTechnicalData(false);
    }
  };

  // ============== IMPORT FUNCTIONS ==============
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
      toast.error("Formato no válido. Usa CSV, XLS o XLSX");
      return;
    }

    setImportFile(file);
    parseFile(file);
  };

  const parseFile = async (file) => {
    setImportLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (jsonData.length < 2) {
        toast.error("El archivo debe tener al menos una fila de cabecera y una de datos");
        return;
      }

      // First row is headers
      const headers = jsonData[0].map((h, idx) => ({
        index: idx,
        name: String(h).trim() || `Columna ${idx + 1}`
      }));

      // Rest is data
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''));

      setFileColumns(headers);
      setImportData(rows);
      
      // Auto-map columns with similar names
      const autoMapping = {};
      headers.forEach(header => {
        const headerLower = header.name.toLowerCase();
        systemFields.forEach(field => {
          const fieldLower = field.label.toLowerCase().replace(' *', '');
          if (
            headerLower === field.value ||
            headerLower === fieldLower ||
            headerLower.includes(field.value) ||
            headerLower.includes(fieldLower) ||
            (field.value === 'dni' && (headerLower.includes('documento') || headerLower.includes('pasaporte') || headerLower.includes('nif'))) ||
            (field.value === 'name' && (headerLower.includes('nombre') || headerLower.includes('cliente'))) ||
            (field.value === 'phone' && (headerLower.includes('telefono') || headerLower.includes('móvil') || headerLower.includes('movil'))) ||
            (field.value === 'city' && (headerLower.includes('ciudad') || headerLower.includes('población') || headerLower.includes('poblacion') || headerLower.includes('localidad'))) ||
            (field.value === 'address' && (headerLower.includes('direccion') || headerLower.includes('dirección') || headerLower.includes('domicilio'))) ||
            (field.value === 'email' && (headerLower.includes('email') || headerLower.includes('correo') || headerLower.includes('e-mail'))) ||
            (field.value === 'source' && (headerLower.includes('proveedor') || headerLower.includes('fuente') || headerLower.includes('origen'))) ||
            (field.value === 'notes' && (headerLower.includes('nota') || headerLower.includes('observacion') || headerLower.includes('comentario')))
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

  const getMappedPreview = () => {
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

  const validateMapping = () => {
    const requiredFields = systemFields.filter(f => f.required).map(f => f.value);
    const missingFields = requiredFields.filter(field => 
      columnMapping[field] === undefined || columnMapping[field] === null || columnMapping[field] === -1
    );

    if (missingFields.length > 0) {
      const missingLabels = missingFields.map(f => 
        systemFields.find(sf => sf.value === f)?.label
      ).join(', ');
      toast.error(`Campos obligatorios sin mapear: ${missingLabels}`);
      return false;
    }

    return true;
  };

  const goToPreview = () => {
    if (validateMapping()) {
      setImportStep(3);
    }
  };

  const executeImport = async () => {
    setImportLoading(true);
    try {
      const customersToImport = importData.map(row => {
        const customer = {};
        Object.entries(columnMapping).forEach(([field, colIndex]) => {
          if (colIndex !== undefined && colIndex !== null && colIndex !== -1) {
            let value = row[colIndex] || '';
            // Clean up DNI
            if (field === 'dni') {
              value = String(value).toUpperCase().trim();
            }
            customer[field] = value;
          }
        });
        return customer;
      }).filter(c => c.dni && c.name); // Filter out empty rows

      if (customersToImport.length === 0) {
        toast.error("No hay clientes válidos para importar. Verifica que DNI y Nombre estén mapeados.");
        setImportLoading(false);
        return;
      }

      const response = await axios.post(`${API}/customers/import`, {
        customers: customersToImport
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      setImportResult(response.data);
      setImportStep(4);
      
      if (response.data.imported > 0) {
        toast.success(`${response.data.imported} clientes importados correctamente`);
        loadCustomersWithStatus();
      }
    } catch (error) {
      console.error("Import error:", error);
      // Extract error message properly
      let errorMessage = "Error al importar clientes";
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = typeof error.response.data.detail === 'string' 
            ? error.response.data.detail 
            : JSON.stringify(error.response.data.detail);
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setImportLoading(false);
    }
  };

  const resetImport = () => {
    setImportStep(1);
    setImportFile(null);
    setImportData([]);
    setFileColumns([]);
    setColumnMapping({});
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const closeImportDialog = () => {
    setShowImportDialog(false);
    resetImport();
  };

  // ========== EXPORT FUNCTIONALITY ==========
  const exportCustomers = (customersToExport = null) => {
    try {
      // Determine which customers to export
      let dataToExport;
      let fileName;
      
      if (customersToExport) {
        // Export selected customers
        dataToExport = allCustomers.filter(c => customersToExport.includes(c.id));
        fileName = `clientes_seleccionados_${new Date().toISOString().split('T')[0]}.xlsx`;
      } else {
        // Export all filtered customers
        dataToExport = customers;
        fileName = `clientes_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      }

      if (dataToExport.length === 0) {
        toast.error("No hay clientes para exportar");
        return;
      }

      // Format data for Excel
      const excelData = dataToExport.map(customer => ({
        'Nombre Completo': customer.name || '',
        'DNI/Pasaporte': customer.dni || '',
        'Email': customer.email || '',
        'Teléfono': customer.phone || '',
        'Dirección': customer.address || '',
        'Ciudad': customer.city || '',
        'País': 'España', // Default o agregar campo si existe
        'Número de Pie': customer.boot_size || '',
        'Altura (cm)': customer.height || '',
        'Peso (kg)': customer.weight || '',
        'Nivel de Esquí': customer.ski_level ? SKI_LEVELS.find(l => l.value === customer.ski_level)?.label : '',
        'Proveedor/Fuente': customer.source || '',
        'Fecha de Registro': customer.created_at ? new Date(customer.created_at).toLocaleDateString('es-ES') : '',
        'Notas': customer.notes || ''
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      const columnWidths = [
        { wch: 25 }, // Nombre
        { wch: 15 }, // DNI
        { wch: 25 }, // Email
        { wch: 15 }, // Teléfono
        { wch: 30 }, // Dirección
        { wch: 15 }, // Ciudad
        { wch: 12 }, // País
        { wch: 12 }, // Pie
        { wch: 12 }, // Altura
        { wch: 10 }, // Peso
        { wch: 15 }, // Nivel
        { wch: 20 }, // Proveedor
        { wch: 15 }, // Fecha
        { wch: 40 }  // Notas
      ];
      worksheet['!cols'] = columnWidths;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

      // Generate and download file
      XLSX.writeFile(workbook, fileName);
      
      toast.success(`✅ ${dataToExport.length} cliente${dataToExport.length !== 1 ? 's' : ''} exportado${dataToExport.length !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error exporting customers:', error);
      toast.error('Error al exportar clientes');
    }
  };

  const exportSelectedCustomers = () => {
    if (selectedCustomers.size === 0) {
      toast.error("No hay clientes seleccionados");
      return;
    }
    exportCustomers(Array.from(selectedCustomers));
  };

  return (
    <div className="p-6 lg:p-8" data-testid="customers-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Base de Datos de Clientes
          </h1>
          <p className="text-slate-500 mt-1">Gestión profesional de clientes</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => exportCustomers()}
            data-testid="export-customers-btn"
          >
            <Download className="h-5 w-5 mr-2" />
            Exportar
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowImportDialog(true)}
            data-testid="import-customers-btn"
          >
            <Upload className="h-5 w-5 mr-2" />
            Importar
          </Button>
          <Button onClick={() => setShowNewCustomerDialog(true)} size="lg" data-testid="new-customer-btn">
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-slate-200 mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("all")}
                className="gap-2"
                data-testid="filter-all"
              >
                <Users className="h-4 w-4" />
                Todos
                <Badge variant="secondary" className="ml-1 bg-slate-200 text-slate-700">
                  {statusCounts.total}
                </Badge>
              </Button>
              <Button
                variant={selectedStatus === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("active")}
                className={`gap-2 ${selectedStatus === "active" ? "bg-emerald-600 hover:bg-emerald-700" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}
                data-testid="filter-active"
              >
                <Package className="h-4 w-4" />
                Activos Hoy
                <Badge className={`ml-1 ${selectedStatus === "active" ? "bg-emerald-800 text-white" : "bg-emerald-100 text-emerald-700"}`}>
                  {statusCounts.active}
                </Badge>
              </Button>
              <Button
                variant={selectedStatus === "inactive" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("inactive")}
                className={`gap-2 ${selectedStatus === "inactive" ? "bg-slate-600 hover:bg-slate-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                data-testid="filter-inactive"
              >
                <History className="h-4 w-4" />
                Inactivos
                <Badge variant="secondary" className="ml-1">
                  {statusCounts.inactive}
                </Badge>
              </Button>
            </div>

            {/* Search and Provider Filter */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre, DNI o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 pl-10 text-base"
                  data-testid="customer-search"
                />
              </div>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="w-full md:w-64 h-12">
                  <SelectValue placeholder="Filtrar por proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proveedores</SelectItem>
                  <SelectItem value="none">Sin proveedor</SelectItem>
                  {providers.map(provider => (
                    <SelectItem key={provider.id} value={provider.name}>
                      {provider.name} ({provider.discount_percent}% dto.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-500" />
            Lista de Clientes ({customers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Barra de acciones masivas - solo visible cuando hay selección */}
          {selectedCustomers.size > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedCustomers.size === customers.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium text-blue-700">
                  {selectedCustomers.size} cliente{selectedCustomers.size !== 1 ? 's' : ''} seleccionado{selectedCustomers.size !== 1 ? 's' : ''}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelections}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                >
                  <X className="h-4 w-4 mr-1" />
                  Deseleccionar
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportSelectedCustomers}
                  className="gap-2 bg-white hover:bg-blue-50"
                  data-testid="export-selected-customers-btn"
                >
                  <Download className="h-4 w-4" />
                  Exportar Seleccionados ({selectedCustomers.size})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={openBulkDeleteDialog}
                  className="gap-2"
                  data-testid="bulk-delete-customers-btn"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar Seleccionados
                </Button>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No se encontraron clientes</p>
              <p className="text-sm mt-1">Prueba con otros términos de búsqueda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={customers.length > 0 && selectedCustomers.size === customers.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Seleccionar todos"
                        data-testid="select-all-customers"
                      />
                    </TableHead>
                    <TableHead>DNI/Pasaporte</TableHead>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Población</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead className="text-center">Alquileres</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => {
                    const discount = getProviderDiscount(customer.source);
                    const isSelected = selectedCustomers.has(customer.id);
                    return (
                      <TableRow 
                        key={customer.id} 
                        className={`hover:bg-slate-50 ${customer.has_active_rental ? 'bg-emerald-50/30' : ''} ${isSelected ? 'bg-blue-50' : ''}`}
                      >
                        <TableCell className="w-12">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleCustomerSelection(customer.id)}
                            aria-label={`Seleccionar ${customer.name}`}
                            data-testid={`select-customer-${customer.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">{customer.dni}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewHistory(customer)}
                              className="font-semibold text-slate-900 hover:text-primary hover:underline text-left cursor-pointer"
                              data-testid={`customer-name-${customer.id}`}
                            >
                              {customer.name}
                            </button>
                            {customer.has_active_rental && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                                <Package className="h-3 w-3 mr-1" />
                                Activo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.phone ? (
                            <div className="flex items-center gap-1 text-slate-600">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.city ? (
                            <div className="flex items-center gap-1 text-slate-600">
                              <MapPin className="h-3 w-3" />
                              {customer.city}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.source ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {customer.source}
                              </Badge>
                              {discount > 0 && (
                                <Badge className="bg-emerald-100 text-emerald-700">
                                  -{discount}%
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">Directo</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-semibold">
                            {customer.total_rentals || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewHistory(customer)}
                              data-testid={`view-history-${customer.id}`}
                              title="Ver ficha completa"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(customer)}
                              title="Editar cliente"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(customer)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar cliente"
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

      {/* History Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => { setSelectedCustomer(null); setEditingTechnicalData(false); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Ficha de Cliente</DialogTitle>
            <DialogDescription>
              Información completa e historial de alquileres
            </DialogDescription>
          </DialogHeader>
          
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Info Card */}
              <Card className="border-slate-200 bg-slate-50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500">Nombre Completo</Label>
                      <p className="text-lg font-semibold text-slate-900">{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">DNI/Pasaporte</Label>
                      <p className="text-lg font-mono font-semibold text-slate-900">{selectedCustomer.dni}</p>
                    </div>
                  </div>

                  {/* ===== TECHNICAL DATA - COLLAPSIBLE ACCORDION ===== */}
                  <div className="mt-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 overflow-hidden">
                    {/* HEADER - Always visible with summary */}
                    <div 
                      className={`p-3 flex items-center justify-between cursor-pointer hover:bg-blue-100/50 transition-colors ${technicalDataExpanded ? 'border-b border-blue-200' : ''}`}
                      onClick={() => !editingTechnicalData && setTechnicalDataExpanded(!technicalDataExpanded)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                          <Mountain className="h-4 w-4 text-blue-600" />
                        </div>
                        
                        {/* COMPACT SUMMARY - One line with key data */}
                        <div className="flex items-center gap-3 flex-wrap text-sm min-w-0">
                          {selectedCustomer.height && (
                            <span className="flex items-center gap-1 text-slate-700">
                              <Ruler className="h-3 w-3 text-blue-500" />
                              <strong>{selectedCustomer.height}</strong>cm
                            </span>
                          )}
                          {selectedCustomer.weight && (
                            <span className="flex items-center gap-1 text-slate-700">
                              <Scale className="h-3 w-3 text-blue-500" />
                              <strong>{selectedCustomer.weight}</strong>kg
                            </span>
                          )}
                          {selectedCustomer.boot_size && (
                            <span className="flex items-center gap-1 text-slate-700">
                              <Package className="h-3 w-3 text-blue-500" />
                              Pie <strong>{selectedCustomer.boot_size}</strong>
                            </span>
                          )}
                          {selectedCustomer.ski_level && selectedCustomer.ski_level !== 'sin_especificar' && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-300 capitalize text-xs">
                              {selectedCustomer.ski_level}
                            </Badge>
                          )}
                          {!selectedCustomer.height && !selectedCustomer.weight && !selectedCustomer.boot_size && (
                            <span className="text-slate-400 italic text-xs">Sin datos técnicos</span>
                          )}
                        </div>
                      </div>
                      
                      {/* EXPAND/COLLAPSE BUTTON */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-blue-600 hover:bg-blue-100 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!editingTechnicalData) setTechnicalDataExpanded(!technicalDataExpanded);
                        }}
                      >
                        {technicalDataExpanded ? (
                          <>
                            <ChevronDown className="h-4 w-4 rotate-180 transition-transform" />
                            <span className="hidden sm:inline text-xs">Cerrar</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs">Editar</span>
                            <ChevronDown className="h-4 w-4 transition-transform" />
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {/* EXPANDED CONTENT */}
                    {technicalDataExpanded && (
                      <div className="p-4 pt-3">
                        {/* Edit/Save buttons */}
                        <div className="flex justify-end mb-3">
                          {!editingTechnicalData ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={startEditingTechnicalData}
                              className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-100"
                              data-testid="edit-technical-data-btn"
                            >
                              <Edit3 className="h-3 w-3" />
                              Editar datos
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  cancelEditingTechnicalData();
                                }}
                                className="gap-1"
                              >
                                <X className="h-3 w-3" />
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={saveTechnicalData}
                                disabled={savingTechnicalData}
                                className="gap-1 bg-blue-600 hover:bg-blue-700"
                                data-testid="save-technical-data-btn"
                              >
                                {savingTechnicalData ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3" />
                                )}
                                Guardar
                              </Button>
                            </div>
                          )}
                        </div>

                        {!editingTechnicalData ? (
                          /* VIEW MODE - Badges */
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3 bg-white rounded-lg border border-blue-100 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Package className="h-4 w-4 text-blue-500" />
                                <span className="text-xs text-slate-500 font-medium">Talla Bota</span>
                              </div>
                              <p className="text-xl font-bold text-slate-900">
                                {selectedCustomer.boot_size || '-'}
                              </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-blue-100 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Ruler className="h-4 w-4 text-blue-500" />
                                <span className="text-xs text-slate-500 font-medium">Altura</span>
                              </div>
                              <p className="text-xl font-bold text-slate-900">
                                {selectedCustomer.height ? `${selectedCustomer.height} cm` : '-'}
                              </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-blue-100 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Scale className="h-4 w-4 text-blue-500" />
                                <span className="text-xs text-slate-500 font-medium">Peso</span>
                              </div>
                              <p className="text-xl font-bold text-slate-900">
                                {selectedCustomer.weight ? `${selectedCustomer.weight} kg` : '-'}
                              </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-blue-100 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Mountain className="h-4 w-4 text-blue-500" />
                                <span className="text-xs text-slate-500 font-medium">Nivel</span>
                              </div>
                              <p className="text-xl font-bold text-slate-900 capitalize">
                                {selectedCustomer.ski_level || '-'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          /* EDIT MODE - Inputs */
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs text-slate-600">Talla Bota</Label>
                              <Input
                                value={technicalDataForm.boot_size}
                                onChange={(e) => setTechnicalDataForm(prev => ({ ...prev, boot_size: e.target.value }))}
                                placeholder="Ej: 42, 27.5"
                                className="h-10 mt-1 text-center font-bold"
                                data-testid="boot-size-input"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Altura (cm)</Label>
                              <Input
                                value={technicalDataForm.height}
                                onChange={(e) => setTechnicalDataForm(prev => ({ ...prev, height: e.target.value }))}
                                placeholder="Ej: 175"
                                className="h-10 mt-1 text-center font-bold"
                                data-testid="height-input"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Peso (kg)</Label>
                              <Input
                                value={technicalDataForm.weight}
                                onChange={(e) => setTechnicalDataForm(prev => ({ ...prev, weight: e.target.value }))}
                                placeholder="Ej: 70"
                                className="h-10 mt-1 text-center font-bold"
                                data-testid="weight-input"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Nivel Esquí</Label>
                              <Select
                                value={technicalDataForm.ski_level}
                                onValueChange={(v) => setTechnicalDataForm(prev => ({ ...prev, ski_level: v }))}
                              >
                                <SelectTrigger className="h-10 mt-1" data-testid="ski-level-select">
                                  <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {SKI_LEVELS.map(level => (
                                    <SelectItem key={level.value} value={level.value}>
                                      {level.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {/* Show historical preferred sizes if available */}
                        {customerHistory?.preferred_sizes && 
                         Object.keys(customerHistory.preferred_sizes).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                              <History className="h-3 w-3" />
                              Tallas usadas anteriormente:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(customerHistory.preferred_sizes).map(([type, sizes]) => (
                                <Badge key={type} variant="outline" className="text-xs bg-white">
                                  {type}: {Array.isArray(sizes) ? sizes.slice(0, 3).join(", ") : sizes}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Contact Actions */}
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                    {/* Phone */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-xs text-emerald-600 font-medium">Teléfono</p>
                          <p className="font-semibold text-slate-900">{selectedCustomer.phone || 'No registrado'}</p>
                        </div>
                      </div>
                      {selectedCustomer.phone && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                            onClick={() => callPhone(selectedCustomer.phone)}
                          >
                            <Phone className="h-3 w-3" />
                            Llamar
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => sendWhatsAppMessage(selectedCustomer.phone, selectedCustomer.name)}
                            data-testid="whatsapp-btn"
                          >
                            <MessageCircle className="h-3 w-3" />
                            WhatsApp
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Email (if exists) */}
                    {selectedCustomer.email && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-xs text-blue-600 font-medium">Email</p>
                            <p className="font-semibold text-slate-900">{selectedCustomer.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-100"
                          onClick={() => sendEmail(selectedCustomer.email, selectedCustomer.name)}
                        >
                          <Mail className="h-3 w-3" />
                          Enviar Email
                        </Button>
                      </div>
                    )}

                    {/* Address/Hotel */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="text-xs text-purple-600 font-medium">Población / Dirección</p>
                          <p className="font-semibold text-slate-900">
                            {selectedCustomer.city || selectedCustomer.address || 'No registrado'}
                            {selectedCustomer.city && selectedCustomer.address && ` - ${selectedCustomer.address}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Provider Info */}
                  {selectedCustomer.source && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <Label className="text-xs text-slate-500">Colaborador/Proveedor</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {selectedCustomer.source}
                        </Badge>
                        {getProviderDiscount(selectedCustomer.source) > 0 && (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            Descuento: {getProviderDiscount(selectedCustomer.source)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Total Rentals */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <Label className="text-xs text-slate-500">Total Alquileres</Label>
                    <p className="text-base font-semibold text-slate-900">{customerHistory?.total_rentals || 0}</p>
                  </div>

                  {/* Observaciones */}
                  {selectedCustomer.notes && (
                    <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <Label className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Observaciones Internas
                      </Label>
                      <p className="text-sm text-amber-900 mt-1">{selectedCustomer.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financial Summary & Transaction History */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-slate-600" />
                    Historial de Transacciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Financial Summary */}
                  {customerHistory?.financial_summary && (
                    <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50">
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-1">Total Pagado</p>
                        <p className="text-xl font-bold text-emerald-600">
                          €{customerHistory.financial_summary.total_paid?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-1">Devoluciones</p>
                        <p className="text-xl font-bold text-orange-600">
                          €{customerHistory.financial_summary.total_refunded?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-1">Ingreso Neto</p>
                        <p className="text-xl font-bold text-slate-900">
                          €{customerHistory.financial_summary.net_revenue?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Transactions List */}
                  {!customerHistory?.transactions || customerHistory.transactions.length === 0 ? (
                    <p className="text-slate-500 text-center py-4 text-sm">Sin transacciones registradas</p>
                  ) : (
                    <div className="max-h-[250px] overflow-y-auto space-y-2">
                      {customerHistory.transactions.map((tx, idx) => (
                        <div 
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            tx.type === 'income' 
                              ? 'bg-emerald-50 border-emerald-200' 
                              : 'bg-orange-50 border-orange-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {tx.type === 'income' ? (
                              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                                <ArrowDownLeft className="h-4 w-4 text-orange-600" />
                              </div>
                            )}
                            <div>
                              <p className={`font-medium text-sm ${
                                tx.type === 'income' ? 'text-emerald-900' : 'text-orange-900'
                              }`}>
                                {tx.type === 'income' ? 'Pago Alquiler' : 'Devolución'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(tx.date).toLocaleDateString('es-ES', { 
                                  day: '2-digit', 
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })} • {tx.payment_method}
                              </p>
                              {tx.notes && tx.notes.trim() && (
                                <p className="text-xs text-slate-500 mt-0.5 italic">{tx.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${
                              tx.type === 'income' ? 'text-emerald-700' : 'text-orange-700'
                            }`}>
                              {tx.type === 'income' ? '+' : '-'}€{tx.amount.toFixed(2)}
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">
                              #{tx.reference_id?.slice(0, 8)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rental History */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historial de Alquileres ({customerHistory?.total_rentals || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!customerHistory?.rentals || customerHistory.rentals.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">Sin alquileres previos</p>
                  ) : (
                    <div className="space-y-3">
                      {customerHistory.rentals.map((rental, idx) => (
                        <div 
                          key={idx}
                          className="p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-500" />
                              <span className="font-medium text-slate-900">
                                {formatDate(rental.start_date)} - {formatDate(rental.end_date)}
                              </span>
                              <Badge variant="outline">
                                {rental.days} {rental.days === 1 ? 'día' : 'días'}
                              </Badge>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <DollarSign className="h-3 w-3 mr-1" />
                              €{rental.total_amount.toFixed(2)}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Package className="h-4 w-4" />
                              <span className="font-medium">Equipos alquilados:</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                              {rental.items.map((item, itemIdx) => (
                                <div key={itemIdx} className="flex items-center justify-between p-2 rounded bg-slate-50 text-sm">
                                  <span className="text-slate-700">
                                    {item.item_type} - {item.brand} {item.model}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    Talla {item.size}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                            <span>Método: {rental.payment_method}</span>
                            <span className={rental.payment_status === 'paid' ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                              {rental.payment_status === 'paid' ? '✓ Pagado' : '⏳ Pendiente'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New/Edit Customer Dialog */}
      <Dialog open={showNewCustomerDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowNewCustomerDialog(false);
          setShowEditDialog(false);
          setEditingCustomer(null);
          resetNewCustomerForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showEditDialog ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
            <DialogDescription>
              {showEditDialog ? 'Modifica la información del cliente' : 'Completa los datos del cliente'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nombre Completo <span className="text-red-500">*</span></Label>
                <Input
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Ej: Juan Pérez García"
                  className="h-11 mt-1"
                  data-testid="customer-name"
                />
              </div>
              <div>
                <Label>DNI/Pasaporte <span className="text-red-500">*</span></Label>
                <Input
                  value={newCustomer.dni}
                  onChange={(e) => setNewCustomer({ ...newCustomer, dni: e.target.value.toUpperCase() })}
                  placeholder="12345678A"
                  className="h-11 mt-1 font-mono"
                  data-testid="customer-dni"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Teléfono <span className="text-red-500">*</span></Label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="+34 600 000 000"
                  className="h-11 mt-1"
                  data-testid="customer-phone"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newCustomer.email || ""}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="cliente@email.com"
                  className="h-11 mt-1"
                  data-testid="customer-email"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Población</Label>
                <Input
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                  placeholder="Ej: Madrid"
                  className="h-11 mt-1"
                />
              </div>
              <div>
                <Label>Dirección</Label>
                <Input
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Calle, número, piso..."
                  className="h-11 mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Colaborador/Proveedor</Label>
              <Select 
                value={newCustomer.source || "none"} 
                onValueChange={(v) => setNewCustomer({ ...newCustomer, source: v === "none" ? "" : v })}
              >
                <SelectTrigger className="h-11 mt-1">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar / Directo</SelectItem>
                  {providers.map(p => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name} (Descuento {p.discount_percent}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Si el cliente viene de un colaborador, se aplicará su descuento automáticamente
              </p>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Observaciones Internas
              </Label>
              <Textarea
                value={newCustomer.notes}
                onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                placeholder="Ej: Cliente VIP, prefiere botas más grandes, cuidado con el equipo..."
                className="mt-1"
                rows={3}
              />
              <p className="text-xs text-slate-500 mt-1">
                Notas privadas que solo verá el equipo (preferencias, advertencias, etc.)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNewCustomerDialog(false);
                setShowEditDialog(false);
                setEditingCustomer(null);
                resetNewCustomerForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={showEditDialog ? updateCustomer : createCustomer}>
              {showEditDialog ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar a <strong>{deletingCustomer?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">
                <strong>Advertencia:</strong> Esta acción no se puede deshacer. Se eliminará:
              </p>
              <ul className="text-sm text-red-700 mt-2 space-y-1 ml-4">
                <li>• Toda la información del cliente</li>
                <li>• Sus datos de contacto y observaciones</li>
                <li>• El historial de alquileres asociado</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteCustomer}>
              Sí, Eliminar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Customers Dialog */}
      <Dialog open={showImportDialog} onOpenChange={closeImportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              Importar Clientes
            </DialogTitle>
            <DialogDescription>
              Importa clientes desde un archivo CSV o Excel
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
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="import-file-input"
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
                  <li>• Campos obligatorios: DNI, Nombre y Teléfono</li>
                  <li>• Los duplicados por DNI serán detectados automáticamente</li>
                </ul>
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

              <div className="space-y-3">
                {systemFields.map(field => (
                  <div key={field.value} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                    <div className="w-40 flex items-center gap-2">
                      <span className={`font-medium ${field.required ? 'text-slate-900' : 'text-slate-600'}`}>
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
                      <SelectTrigger className="flex-1 h-11" data-testid={`mapping-${field.value}`}>
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
                <Button variant="outline" onClick={resetImport}>
                  Volver
                </Button>
                <Button onClick={goToPreview} data-testid="go-to-preview-btn">
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
                      {systemFields.filter(f => columnMapping[f.value] !== undefined && columnMapping[f.value] !== -1).map(field => (
                        <TableHead key={field.value} className="font-semibold">
                          {field.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getMappedPreview().map((row, idx) => (
                      <TableRow key={idx}>
                        {systemFields.filter(f => columnMapping[f.value] !== undefined && columnMapping[f.value] !== -1).map(field => (
                          <TableCell key={field.value} className="text-sm">
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
                  <strong>📊 Resumen:</strong> Se importarán {importData.length} clientes. 
                  Los duplicados por DNI serán omitidos automáticamente.
                </p>
              </div>

              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setImportStep(2)}>
                  Volver al Mapeo
                </Button>
                <Button 
                  onClick={executeImport} 
                  disabled={importLoading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  data-testid="execute-import-btn"
                >
                  {importLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar {importData.length} Clientes
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
                    <p className="text-3xl font-bold text-emerald-600">{importResult.imported}</p>
                    <p className="text-sm text-emerald-700 mt-1">Importados</p>
                  </CardContent>
                </Card>
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-amber-600">{importResult.duplicates}</p>
                    <p className="text-sm text-amber-700 mt-1">Duplicados (omitidos)</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-red-600">{importResult.errors}</p>
                    <p className="text-sm text-red-700 mt-1">Errores</p>
                  </CardContent>
                </Card>
              </div>

              {importResult.duplicate_dnis && importResult.duplicate_dnis.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 mb-2">DNIs duplicados omitidos:</p>
                  <div className="flex flex-wrap gap-2">
                    {importResult.duplicate_dnis.slice(0, 10).map((dni, idx) => (
                      <Badge key={idx} variant="outline" className="bg-white">
                        {dni}
                      </Badge>
                    ))}
                    {importResult.duplicate_dnis.length > 10 && (
                      <Badge variant="secondary">
                        +{importResult.duplicate_dnis.length - 10} más
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button onClick={closeImportDialog} className="w-full" data-testid="close-import-btn">
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de borrado masivo */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Eliminar Clientes
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Resumen de selección */}
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-700">
                ¿Estás seguro de que quieres eliminar{' '}
                <span className="text-red-600 font-bold">{selectedCustomers.size}</span>{' '}
                cliente{selectedCustomers.size !== 1 ? 's' : ''}?
              </p>
            </div>
            
            {/* Advertencia de clientes con alquileres activos */}
            {customersWithActiveRentals.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      {customersWithActiveRentals.length} cliente{customersWithActiveRentals.length !== 1 ? 's' : ''} tiene{customersWithActiveRentals.length === 1 ? '' : 'n'} alquileres activos
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Estos clientes NO serán eliminados:
                    </p>
                    <ul className="text-xs text-amber-700 mt-1 list-disc list-inside">
                      {customersWithActiveRentals.slice(0, 5).map(c => (
                        <li key={c.id}>{c.name} - {c.dni}</li>
                      ))}
                      {customersWithActiveRentals.length > 5 && (
                        <li>y {customersWithActiveRentals.length - 5} más...</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {/* Contador de clientes que SÍ se eliminarán */}
            {customersWithActiveRentals.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  <span className="font-bold">{selectedCustomers.size - customersWithActiveRentals.length}</span>{' '}
                  cliente{(selectedCustomers.size - customersWithActiveRentals.length) !== 1 ? 's' : ''}{' '}
                  será{(selectedCustomers.size - customersWithActiveRentals.length) !== 1 ? 'n' : ''} eliminado{(selectedCustomers.size - customersWithActiveRentals.length) !== 1 ? 's' : ''}.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={bulkDeleteLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={bulkDeleteCustomers}
              disabled={bulkDeleteLoading || (selectedCustomers.size === customersWithActiveRentals.length)}
              data-testid="confirm-bulk-delete-btn"
            >
              {bulkDeleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar {selectedCustomers.size - customersWithActiveRentals.length} Cliente{(selectedCustomers.size - customersWithActiveRentals.length) !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
