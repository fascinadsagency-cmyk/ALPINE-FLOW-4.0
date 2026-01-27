import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { customerApi } from "@/lib/api";
import { Search, Users, History, Loader2, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async (search = "") => {
    setLoading(true);
    try {
      const response = await customerApi.getAll(search);
      setCustomers(response.data);
    } catch (error) {
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadCustomers(searchTerm);
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

  return (
    <div className="p-6 lg:p-8" data-testid="customers-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Clientes
        </h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Buscar por DNI, nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 h-11"
            data-testid="customer-search"
          />
          <Button type="submit" className="h-11">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

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
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DNI</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Población</TableHead>
                  <TableHead>Alquileres</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono">{customer.dni}</TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>{customer.city || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{customer.total_rentals}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewHistory(customer)}
                        data-testid={`view-history-${customer.id}`}
                      >
                        <History className="h-4 w-4 mr-1" />
                        Historial
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* History Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : customerHistory && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="p-4 rounded-xl bg-slate-50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-4 w-4" />
                    {selectedCustomer?.phone || 'Sin teléfono'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4" />
                    {selectedCustomer?.city || 'Sin población'}
                  </div>
                </div>
              </div>

              {/* Preferred Sizes */}
              {customerHistory.preferred_sizes && Object.keys(customerHistory.preferred_sizes).length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Tallas Preferidas</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(customerHistory.preferred_sizes).map(([type, sizes]) => (
                      <Badge key={type} variant="outline">
                        {type}: {sizes.join(", ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Rental History */}
              <div>
                <h4 className="font-medium text-slate-900 mb-2">
                  Historial de Alquileres ({customerHistory.total_rentals})
                </h4>
                {customerHistory.rentals.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Sin alquileres previos</p>
                ) : (
                  <div className="space-y-2">
                    {customerHistory.rentals.map((rental) => (
                      <div key={rental.id} className="p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-500">
                            {rental.start_date} - {rental.end_date}
                          </span>
                          <Badge variant={
                            rental.status === 'active' ? 'default' :
                            rental.status === 'returned' ? 'secondary' : 'outline'
                          }>
                            {rental.status === 'active' ? 'Activo' :
                             rental.status === 'returned' ? 'Devuelto' : 'Parcial'}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-600">
                          {rental.items?.map(i => `${i.brand} ${i.model} (${i.size})`).join(', ')}
                        </div>
                        <div className="text-right mt-2 font-semibold">
                          €{rental.total_amount?.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
