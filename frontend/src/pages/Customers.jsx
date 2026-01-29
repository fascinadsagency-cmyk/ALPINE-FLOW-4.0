import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { customerApi } from "@/lib/api";
import { Search, Users, History, Loader2, Phone, MapPin, Plus, Edit2, Trash2, AlertTriangle, FileText, DollarSign, Calendar, Package, ArrowUpRight, ArrowDownLeft, Banknote, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("all");
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
    address: "",
    city: "",
    source: "",
    notes: ""
  });

  useEffect(() => {
    loadCustomers();
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

    setCustomers(filtered);
  };

  useEffect(() => {
    filterCustomers();
  }, [searchTerm, selectedProvider, allCustomers]);

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
    if (!newCustomer.name || !newCustomer.dni) {
      toast.error("Nombre y DNI son obligatorios");
      return;
    }

    try {
      await customerApi.create({
        name: newCustomer.name,
        dni: newCustomer.dni.toUpperCase(),
        phone: newCustomer.phone || "",
        address: newCustomer.address || "",
        city: newCustomer.city || "",
        source: newCustomer.source || "",
        notes: newCustomer.notes || ""
      });
      toast.success("Cliente creado correctamente");
      setShowNewCustomerDialog(false);
      resetNewCustomerForm();
      loadCustomers();
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
      address: customer.address || "",
      city: customer.city || "",
      source: customer.source || "",
      notes: customer.notes || ""
    });
    setShowEditDialog(true);
  };

  const updateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.dni) {
      toast.error("Nombre y DNI son obligatorios");
      return;
    }

    try {
      await axios.put(`${API}/customers/${editingCustomer.id}`, {
        name: newCustomer.name,
        dni: newCustomer.dni.toUpperCase(),
        phone: newCustomer.phone || "",
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
      loadCustomers();
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
      address: "",
      city: "",
      source: "",
      notes: ""
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

  return (
    <div className="p-6 lg:p-8" data-testid="customers-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Base de Datos de Clientes
          </h1>
          <p className="text-slate-500 mt-1">Gestión profesional de clientes</p>
        </div>
        <Button onClick={() => setShowNewCustomerDialog(true)} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="border-slate-200 mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o DNI en tiempo real..."
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
                    return (
                      <TableRow key={customer.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-sm font-medium">{customer.dni}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => viewHistory(customer)}
                            className="font-semibold text-slate-900 hover:text-primary hover:underline text-left cursor-pointer"
                            data-testid={`customer-name-${customer.id}`}
                          >
                            {customer.name}
                          </button>
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
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
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
                    <div>
                      <Label className="text-xs text-slate-500">Teléfono</Label>
                      <p className="text-base text-slate-700">{selectedCustomer.phone || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Población</Label>
                      <p className="text-base text-slate-700">{selectedCustomer.city || '-'}</p>
                    </div>
                    {selectedCustomer.address && (
                      <div className="col-span-2">
                        <Label className="text-xs text-slate-500">Dirección</Label>
                        <p className="text-base text-slate-700">{selectedCustomer.address}</p>
                      </div>
                    )}
                    {selectedCustomer.source && (
                      <div>
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
                    <div>
                      <Label className="text-xs text-slate-500">Total Alquileres</Label>
                      <p className="text-base font-semibold text-slate-900">{customerHistory?.total_rentals || 0}</p>
                    </div>
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

              {/* Preferred Sizes */}
              {customerHistory?.preferred_sizes && Object.keys(customerHistory.preferred_sizes).length > 0 && (
                <Card className="border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Tallas Preferidas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(customerHistory.preferred_sizes).map(([type, sizes]) => (
                        <Badge key={type} variant="outline" className="text-sm">
                          {type}: {sizes.join(", ")}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

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
                <Label>Nombre Completo *</Label>
                <Input
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Ej: Juan Pérez García"
                  className="h-11 mt-1"
                  data-testid="customer-name"
                />
              </div>
              <div>
                <Label>DNI/Pasaporte *</Label>
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
                <Label>Teléfono</Label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="+34 600 000 000"
                  className="h-11 mt-1"
                  data-testid="customer-phone"
                />
              </div>
              <div>
                <Label>Población</Label>
                <Input
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                  placeholder="Ej: Madrid"
                  className="h-11 mt-1"
                />
              </div>
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
    </div>
  );
}
