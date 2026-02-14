import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Download, 
  Building2, 
  CreditCard, 
  Loader2,
  CheckCircle,
  Check,
  X,
  Clock,
  Save,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Sparkles,
  Package,
  Users,
  UserPlus,
  Crown,
  Rocket
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

      {/* Plans Section - Gradient Background */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #ec4899 100%)' }}>
        <div className="px-6 pt-8 pb-4">
          {/* Current Plan Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white">Tu Plan Actual</h2>
            <p className="text-white/70 mt-1">
              {planStatus?.is_trial 
                ? `Trial - ${planStatus.trial_days_remaining > 0 
                    ? `${planStatus.trial_days_remaining} días restantes` 
                    : `${planStatus.trial_hours_remaining || 0} horas restantes`}`
                : planStatus?.plan_name}
            </p>
          </div>

          {/* Usage Stats */}
          <div className="mb-8 p-5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
            <h3 className="font-bold text-white mb-4 text-sm text-center uppercase tracking-wider">Tu uso actual:</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-black text-white">{planStatus?.current_items?.toLocaleString() || 0}</p>
                <p className="text-sm text-white/70">
                  de {planStatus?.max_items >= 999999 ? '∞' : planStatus?.max_items?.toLocaleString()} artículos
                </p>
              </div>
              <div>
                <p className="text-3xl font-black text-white">{planStatus?.current_customers?.toLocaleString() || 0}</p>
                <p className="text-sm text-white/70">
                  de {planStatus?.max_customers >= 999999 ? '∞' : planStatus?.max_customers?.toLocaleString()} clientes
                </p>
              </div>
              <div>
                <p className="text-3xl font-black text-white">{planStatus?.current_users || 1}</p>
                <p className="text-sm text-white/70">
                  de {planStatus?.max_users >= 999 ? '∞' : planStatus?.max_users} usuarios
                </p>
              </div>
            </div>
          </div>

          {/* Plan Cards */}
          <div className="pb-8">
            <h3 className="text-lg font-bold text-white mb-1">Cambiar de Plan</h3>
            <p className="text-white/60 text-sm mb-6">Selecciona el plan que mejor se adapte a tus necesidades</p>
            
            <div className="grid md:grid-cols-3 gap-6">
              {availablePlans.map((plan) => {
                const planOrder = getPlanOrder(plan.id);
                const isCurrentPlan = planStatus?.plan_type === plan.id;
                const isUpgrade = planOrder > currentPlanOrder;
                const isPro = plan.id === "pro";

                const getPlanIcon = (planId) => {
                  switch (planId) {
                    case "basic": return <Rocket className="h-6 w-6 text-white" />;
                    case "pro": return <Crown className="h-6 w-6 text-white" />;
                    case "enterprise": return <Building2 className="h-6 w-6 text-white" />;
                    default: return <Rocket className="h-6 w-6 text-white" />;
                  }
                };

                return (
                  <div key={plan.id} className="relative" data-testid={`plan-card-${plan.id}`}>
                    {plan.recommended && !isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <Badge className="bg-white text-black font-bold px-4 py-1">POPULAR</Badge>
                      </div>
                    )}
                    {isCurrentPlan && (
                      <div className="absolute -top-3 right-4 z-10">
                        <Badge className="bg-emerald-500 text-white font-bold px-4 py-1">Plan Actual</Badge>
                      </div>
                    )}

                    <div className={`relative rounded-2xl overflow-hidden transition-all duration-300 h-full ${
                      isPro ? 'transform scale-105' : ''
                    }`}>
                      <div className={`absolute inset-0 ${
                        isPro ? 'bg-gradient-to-br from-black via-slate-900 to-black' : 'bg-white'
                      }`}></div>
                      
                      <div className={`relative p-6 h-full flex flex-col ${
                        isPro ? 'border-4 border-purple-500/50 rounded-2xl' : 'border-2 border-slate-200 rounded-2xl'
                      }`}>
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-5">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-lg ${
                            isPro ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-black'
                          }`}>
                            {getPlanIcon(plan.id)}
                          </div>
                          <div>
                            <h3 className={`text-lg font-bold ${isPro ? 'text-white' : 'text-black'}`}>
                              {plan.name}
                            </h3>
                            <p className={`text-xs ${isPro ? 'text-slate-400' : 'text-slate-500'}`}>
                              {isPro ? 'Más vendido' : 'Para empezar'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Price */}
                        <div className="mb-6">
                          <span className={`text-4xl font-black ${isPro ? 'text-white' : 'text-black'}`}>
                            {plan.price} €
                          </span>
                          <p className={`text-sm mt-1 font-medium ${isPro ? 'text-slate-400' : 'text-slate-600'}`}>
                            Pago anual <span className="text-xs opacity-70">+ IVA</span>
                          </p>
                        </div>

                        {/* Action Button */}
                        <div className="mb-6">
                          {isCurrentPlan ? (
                            <Button disabled className={`w-full font-bold rounded-full py-5 ${
                              isPro ? 'bg-white/20 text-white/60' : 'bg-slate-100 text-slate-400'
                            }`}>
                              PLAN ACTUAL
                            </Button>
                          ) : isUpgrade ? (
                            <Button 
                              className={`w-full font-bold rounded-full py-5 ${
                                isPro 
                                  ? 'bg-white text-black hover:bg-slate-100' 
                                  : 'bg-black text-white hover:bg-black/90'
                              }`}
                              onClick={() => handleCalculatePlanChange(plan.id)}
                            >
                              SUBIR DE NIVEL
                            </Button>
                          ) : (
                            <Button 
                              className={`w-full font-bold rounded-full py-5 ${
                                isPro 
                                  ? 'bg-white text-black hover:bg-slate-100' 
                                  : 'bg-black text-white hover:bg-black/90'
                              }`}
                              onClick={() => handleCalculatePlanChange(plan.id)}
                            >
                              CAMBIAR
                            </Button>
                          )}
                        </div>

                        {/* Features */}
                        <div className="space-y-3 flex-grow">
                          {plan.features?.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-3 text-sm">
                              <Check className={`h-4 w-4 flex-shrink-0 mt-0.5 ${isPro ? 'text-white' : 'text-black'}`} />
                              <span className={`font-medium ${isPro ? 'text-white' : 'text-slate-700'}`}>
                                {feature}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Billing Data */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
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
            <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
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
                        <Badge className="bg-emerald-500/20 text-emerald-700"><CheckCircle className="h-3 w-3 mr-1" />Pagado</Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-700"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>
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
                      <p className="text-slate-600">{changeCalculation.current_price}€/año <span className="text-xs text-slate-400">+ IVA</span></p>
                    </div>
                    <ArrowUpRight className={`h-6 w-6 ${changeCalculation.is_upgrade ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div className="text-center">
                      <p className="text-sm text-slate-500">Nuevo Plan</p>
                      <p className="font-bold text-emerald-600">{changeCalculation.new_plan_name || changeCalculation.new_plan}</p>
                      <p className="text-slate-600">{changeCalculation.new_price}€/año <span className="text-xs text-slate-400">+ IVA</span></p>
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
                      <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(changeCalculation.amount_to_pay)} <span className="text-sm font-normal text-blue-400">+ IVA</span></p>
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
