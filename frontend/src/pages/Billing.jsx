import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  FileText, 
  Download, 
  Building2, 
  CreditCard, 
  Loader2,
  CheckCircle,
  Clock,
  Save,
  Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Billing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [payments, setPayments] = useState([]);
  const [billingData, setBillingData] = useState({
    company_name: "",
    cif_nif: "",
    address: "",
    city: "",
    postal_code: "",
    country: "España"
  });

  useEffect(() => {
    // Check if user is admin
    if (user && user.role !== "admin" && user.role !== "super_admin") {
      toast.error("Acceso denegado: Solo administradores");
      navigate("/");
      return;
    }

    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [billingRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/billing/data`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/billing/payments`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setBillingData(billingRes.data);
      setPayments(paymentsRes.data.payments || []);
    } catch (error) {
      console.error("Error fetching billing data:", error);
      if (error.response?.status === 403) {
        toast.error("Acceso denegado: Solo administradores");
        navigate("/");
      } else {
        toast.error("Error al cargar datos de facturación");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBillingData = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/billing/data`, billingData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Datos de facturación actualizados");
    } catch (error) {
      console.error("Error saving billing data:", error);
      toast.error("Error al guardar los datos");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadInvoice = async (paymentId, invoiceNumber) => {
    setDownloading(paymentId);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API}/billing/invoice/${paymentId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob"
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Factura descargada correctamente");
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error("Error al descargar la factura");
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR"
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Facturación</h1>
        <p className="text-slate-500 mt-1">
          Gestiona tus datos fiscales y descarga tus facturas
        </p>
      </div>

      {/* Billing Data Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Datos Fiscales</CardTitle>
              <CardDescription>
                Estos datos aparecerán en todas tus facturas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="company_name">Razón Social *</Label>
              <Input
                id="company_name"
                value={billingData.company_name}
                onChange={(e) => setBillingData({ ...billingData, company_name: e.target.value })}
                placeholder="Nombre de la empresa"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cif_nif">NIF/CIF *</Label>
              <Input
                id="cif_nif"
                value={billingData.cif_nif}
                onChange={(e) => setBillingData({ ...billingData, cif_nif: e.target.value })}
                placeholder="B12345678"
                className="h-11"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Dirección Fiscal *</Label>
              <Input
                id="address"
                value={billingData.address}
                onChange={(e) => setBillingData({ ...billingData, address: e.target.value })}
                placeholder="Calle, número, piso..."
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={billingData.city}
                onChange={(e) => setBillingData({ ...billingData, city: e.target.value })}
                placeholder="Madrid"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal_code">Código Postal</Label>
              <Input
                id="postal_code"
                value={billingData.postal_code}
                onChange={(e) => setBillingData({ ...billingData, postal_code: e.target.value })}
                placeholder="28001"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={billingData.country}
                onChange={(e) => setBillingData({ ...billingData, country: e.target.value })}
                placeholder="España"
                className="h-11"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveBillingData} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Datos
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Historial de Pagos</CardTitle>
              <CardDescription>
                Registro de todos los pagos realizados por tu suscripción
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="font-medium">No hay pagos registrados</p>
              <p className="text-sm mt-1">
                Los pagos aparecerán aquí cuando actives un plan de pago
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Fecha</TableHead>
                    <TableHead className="font-semibold">Nº Factura</TableHead>
                    <TableHead className="font-semibold">Plan</TableHead>
                    <TableHead className="font-semibold text-right">Importe</TableHead>
                    <TableHead className="font-semibold text-center">Estado</TableHead>
                    <TableHead className="font-semibold text-right">Factura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-slate-50">
                      <TableCell>{formatDate(payment.date)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.invoice_number}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {payment.plan_name || payment.plan}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {payment.status === "paid" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Pagado
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendiente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(payment.id, payment.invoice_number)}
                          disabled={downloading === payment.id}
                        >
                          {downloading === payment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Información sobre facturación</p>
              <p className="text-sm text-blue-700 mt-1">
                Las facturas se generan automáticamente al realizar cada pago anual. 
                Asegúrate de mantener tus datos fiscales actualizados para que aparezcan 
                correctamente en todas tus facturas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
