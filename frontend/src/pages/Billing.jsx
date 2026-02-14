import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Download, 
  Building2, 
  CreditCard, 
  Loader2,
  CheckCircle,
  Clock,
  Save,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Sparkles,
  Package,
  Users,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [planStatus, setPlanStatus] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [changeCalculation, setChangeCalculation] = useState(null);
  const [calculatingChange, setCalculatingChange] = useState(false);
  const [processingUpgrade, setProcessingUpgrade] = useState(false);
  const [billingData, setBillingData] = useState({
    company_name: "",
    cif_nif: "",
    address: "",
    city: "",
    postal_code: "",
    country: "España"
  });

  useEffect(() => {
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
      const headers = { Authorization: `Bearer ${token}` };
      
      const [billingRes, paymentsRes, planRes, plansRes] = await Promise.all([
        axios.get(`${API}/billing/data`, { headers }),
        axios.get(`${API}/billing/payments`, { headers }),
        axios.get(`${API}/plan/status`, { headers }),
        axios.get(`${API}/plan/available`, { headers })
      ]);
      
      setBillingData(billingRes.data);
      setPayments(paymentsRes.data?.payments || paymentsRes.data || []);
      setPlanStatus(planRes.data);
      setAvailablePlans(plansRes.data.plans || []);
    } catch (error) {
      console.error("Error fetching billing data:", error);
      toast.error("Error al cargar datos de facturación");
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
      toast.success("Datos fiscales guardados correctamente");
    } catch (error) {
      toast.error("Error al guardar los datos");
    } finally {
      setSaving(false);
    }
  };

  const handleCalculatePlanChange = async (planId) => {
    setSelectedPlan(planId);
    setCalculatingChange(true);
    setChangeCalculation(null);
    setShowChangePlanDialog(true);
    
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/plan/change/calculate/${planId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChangeCalculation(res.data);
    } catch (error) {
      toast.error("Error al calcular el cambio de plan");
      setShowChangePlanDialog(false);
    } finally {
      setCalculatingChange(false);
    }
  };

  const handleConfirmPlanChange = async () => {
    if (!changeCalculation || !changeCalculation.can_change) return;
    
    setProcessingUpgrade(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API}/plan/upgrade`, {
        new_plan_type: selectedPlan,
        origin_url: window.location.origin
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.requires_payment && res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        toast.success(res.data.message || "Plan actualizado correctamente");
        setShowChangePlanDialog(false);
        fetchData();
      }
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (typeof detail === 'object' && detail.blockers) {
        toast.error(detail.blockers.map(b => b.message).join('. '));
      } else {
        toast.error(detail || "Error al procesar el cambio de plan");
      }
    } finally {
      setProcessingUpgrade(false);
    }
  };

  const handleDownloadInvoice = async (paymentId, invoiceNumber) => {
    setDownloading(paymentId);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API}/billing/invoice/${paymentId}/download`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Factura descargada");
    } catch (error) {
      toast.error("Error al descargar la factura");
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric", month: "long", day: "numeric"
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);
  };

  const getPlanOrder = (planType) => {
    const order = { trial: 0, basic: 1, pro: 2, enterprise: 3 };
    return order[planType] || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const currentPlanOrder = getPlanOrder(planStatus?.plan_type);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Facturación</h1>
        <p className="text-slate-500 mt-1">Gestiona tu plan, datos fiscales y facturas</p>
      </div>

      {/* Current Plan */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Tu Plan Actual</CardTitle>
                <CardDescription>
                  {planStatus?.is_trial 
                    ? `Trial - ${planStatus.trial_days_remaining > 0 
                        ? `${planStatus.trial_days_remaining} días restantes` 
                        : `${planStatus.trial_hours_remaining || 0} horas restantes`}`
                    : planStatus?.plan_name}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={`text-lg px-4 py-1 ${
              planStatus?.is_trial ? 'border-amber-500 text-amber-600 bg-amber-500/10' : 'border-blue-500 text-blue-600 bg-blue-500/10'
            }`}>
              {planStatus?.is_trial ? 'Trial Gratuito' : planStatus?.plan_name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 mt-2">
            <div className="text-center p-4 bg-white rounded-lg border">
              <Package className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{planStatus?.current_items?.toLocaleString() || 0}</p>
              <p className="text-sm text-slate-500">
                de {planStatus?.max_items >= 999999 ? '∞' : planStatus?.max_items?.toLocaleString()} artículos
              </p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border">
              <Users className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
              <p className="text-2xl font-bold">{planStatus?.current_customers?.toLocaleString() || 0}</p>
              <p className="text-sm text-slate-500">
                de {planStatus?.max_customers >= 999999 ? '∞' : planStatus?.max_customers?.toLocaleString()} clientes
              </p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border">
              <UserPlus className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{planStatus?.current_users || 1}</p>
              <p className="text-sm text-slate-500">
                de {planStatus?.max_users >= 999 ? '∞' : planStatus?.max_users} usuarios
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Cambiar de Plan</CardTitle>
          <CardDescription>Selecciona el plan que mejor se adapte a tus necesidades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {availablePlans.map((plan) => {
              const planOrder = getPlanOrder(plan.id);
              const isCurrentPlan = planStatus?.plan_type === plan.id;
              const isUpgrade = planOrder > currentPlanOrder;
              
              return (
                <div key={plan.id} className={`relative rounded-xl border-2 p-6 transition-all ${
                  isCurrentPlan ? 'border-blue-500 bg-blue-500/10' 
                  : plan.recommended ? 'border-emerald-300 bg-emerald-500/10/50' 
                  : 'border-slate-200 hover:border-slate-300'
                }`}>
                  {plan.recommended && !isCurrentPlan && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600">Recomendado</Badge>
                  )}
                  {isCurrentPlan && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600">Plan Actual</Badge>
                  )}
                  
                  <h3 className="text-xl font-bold mt-2">{plan.name}</h3>
                  <p className="text-3xl font-bold mt-2">
                    {plan.price}€<span className="text-sm font-normal text-slate-500">/año</span>
                  </p>
                  
                  <ul className="mt-4 space-y-2">
                    {plan.features?.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-6">
                    {isCurrentPlan ? (
                      <Button disabled className="w-full" variant="secondary">Plan Actual</Button>
                    ) : isUpgrade ? (
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => handleCalculatePlanChange(plan.id)}>
                        <ArrowUpRight className="h-4 w-4 mr-2" />Subir de Nivel
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" onClick={() => handleCalculatePlanChange(plan.id)}>
                        <ArrowDownRight className="h-4 w-4 mr-2" />Cambiar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Billing Data */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/100/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Datos Fiscales</CardTitle>
              <CardDescription>Estos datos aparecerán en tus facturas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Razón Social *</Label>
              <Input value={billingData.company_name} onChange={(e) => setBillingData({ ...billingData, company_name: e.target.value })} placeholder="Nombre de la empresa" />
            </div>
            <div className="space-y-2">
              <Label>NIF/CIF *</Label>
              <Input value={billingData.cif_nif} onChange={(e) => setBillingData({ ...billingData, cif_nif: e.target.value })} placeholder="B12345678" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Dirección Fiscal *</Label>
              <Input value={billingData.address} onChange={(e) => setBillingData({ ...billingData, address: e.target.value })} placeholder="Calle, número, piso..." />
            </div>
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Input value={billingData.city} onChange={(e) => setBillingData({ ...billingData, city: e.target.value })} placeholder="Madrid" />
            </div>
            <div className="space-y-2">
              <Label>Código Postal</Label>
              <Input value={billingData.postal_code} onChange={(e) => setBillingData({ ...billingData, postal_code: e.target.value })} placeholder="28001" />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveBillingData} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</> : <><Save className="h-4 w-4 mr-2" />Guardar</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/100/20 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Historial de Pagos</CardTitle>
              <CardDescription>Registro de todos los pagos realizados</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="font-medium">No hay pagos registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Nº Factura</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Factura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell className="font-mono text-sm">{payment.invoice_number}</TableCell>
                    <TableCell><Badge variant="outline">{payment.plan_name || payment.plan}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell className="text-center">
                      {payment.status === "paid" ? (
                        <Badge className="bg-emerald-500/100/20 text-emerald-700"><CheckCircle className="h-3 w-3 mr-1" />Pagado</Badge>
                      ) : (
                        <Badge className="bg-amber-500/100/20 text-amber-700"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoice(payment.id, payment.invoice_number)} disabled={downloading === payment.id}>
                        {downloading === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4 mr-1" />PDF</>}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Change Plan Dialog */}
      <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cambiar de Plan</DialogTitle>
            <DialogDescription>
              {calculatingChange ? "Calculando..." : changeCalculation?.is_upgrade ? "Actualiza tu plan" : "Cambiar a un plan diferente"}
            </DialogDescription>
          </DialogHeader>
          
          {calculatingChange ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : changeCalculation && (
            <div className="space-y-4 py-4">
              {/* Blockers */}
              {changeCalculation.blockers?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">No puedes cambiar a este plan</p>
                      <ul className="mt-2 space-y-1">
                        {changeCalculation.blockers.map((blocker, idx) => (
                          <li key={idx} className="text-sm text-red-700">{blocker.message}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {changeCalculation.can_change && (
                <>
                  {/* Plan change summary */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-slate-500">Plan Actual</p>
                      <p className="font-bold">{changeCalculation.current_plan_name || changeCalculation.current_plan}</p>
                      <p className="text-slate-600">{changeCalculation.current_price}€/año</p>
                    </div>
                    <ArrowUpRight className={`h-6 w-6 ${changeCalculation.is_upgrade ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div className="text-center">
                      <p className="text-sm text-slate-500">Nuevo Plan</p>
                      <p className="font-bold text-emerald-600">{changeCalculation.new_plan_name || changeCalculation.new_plan}</p>
                      <p className="text-slate-600">{changeCalculation.new_price}€/año</p>
                    </div>
                  </div>

                  {/* Proration details */}
                  {changeCalculation.current_plan !== "trial" && (
                    <div className="space-y-2 p-4 border rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Días utilizados del plan actual:</span>
                        <span>{changeCalculation.days_used} días</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Días restantes:</span>
                        <span>{changeCalculation.days_remaining} días</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Crédito del plan actual:</span>
                        <span className="text-emerald-600">-{formatCurrency(changeCalculation.credit_amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Coste del nuevo plan (prorrateado):</span>
                        <span>{formatCurrency(changeCalculation.prorate_amount)}</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-bold">
                        <span>Total a pagar:</span>
                        <span className="text-blue-600">{formatCurrency(changeCalculation.amount_to_pay)}</span>
                      </div>
                    </div>
                  )}

                  {changeCalculation.current_plan === "trial" && (
                    <div className="p-4 bg-blue-500/10 rounded-lg">
                      <p className="font-medium text-blue-800">Activar Plan {changeCalculation.new_plan_name}</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(changeCalculation.amount_to_pay)}</p>
                      <p className="text-sm text-blue-600 mt-1">Suscripción anual</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePlanDialog(false)}>Cancelar</Button>
            <Button 
              onClick={handleConfirmPlanChange} 
              disabled={!changeCalculation?.can_change || processingUpgrade}
              className={changeCalculation?.is_upgrade ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {processingUpgrade ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {changeCalculation?.amount_to_pay > 0 ? `Pagar ${formatCurrency(changeCalculation?.amount_to_pay || 0)}` : "Confirmar Cambio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
