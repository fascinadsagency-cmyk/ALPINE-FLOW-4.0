import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Sparkles, 
  Save, 
  RotateCcw, 
  Package, 
  Users, 
  ShoppingCart, 
  DollarSign,
  Info,
  Loader2
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";

const API = process.env.REACT_APP_BACKEND_URL;

const PLAN_ICONS = {
  trial: { icon: Sparkles, color: "text-yellow-600", bg: "bg-yellow-50" },
  basic: { icon: Package, color: "text-gray-600", bg: "bg-gray-50" },
  pro: { icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  enterprise: { icon: ShoppingCart, color: "text-purple-600", bg: "bg-purple-50" }
};

export default function PlansManagement() {
  const { darkMode } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [source, setSource] = useState("default");
  const [customizedPlans, setCustomizedPlans] = useState([]);

  // Verificar permisos de super_admin
  useEffect(() => {
    if (user && user.role !== "super_admin") {
      toast.error("Esta página es solo para administradores del sistema");
      navigate("/");
      return;
    }
    if (user) {
      loadPlans();
    }
  }, [user, navigate]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/plans`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setPlans(response.data.plans);
      setSource(response.data.source);
      setCustomizedPlans(response.data.customized_plans || []);
    } catch (error) {
      toast.error("Error al cargar planes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async (planType) => {
    setSaving(prev => ({ ...prev, [planType]: true }));
    try {
      const planData = plans[planType];
      
      await axios.put(`${API}/api/plans/${planType}`, {
        name: planData.name,
        max_items: parseInt(planData.max_items),
        max_customers: parseInt(planData.max_customers),
        max_users: parseInt(planData.max_users),
        price: parseFloat(planData.price),
        duration_days: planData.duration_days ? parseInt(planData.duration_days) : undefined,
        stripe_price_id: planData.stripe_price_id,
        description: planData.description,
        features: planData.features
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      toast.success(`Plan ${planType} actualizado correctamente`);
      loadPlans();
    } catch (error) {
      toast.error(`Error al actualizar plan ${planType}`);
      console.error(error);
    } finally {
      setSaving(prev => ({ ...prev, [planType]: false }));
    }
  };

  const handleResetPlan = async (planType) => {
    if (!confirm(`¿Estás seguro de restaurar el plan ${planType} a sus valores por defecto?`)) {
      return;
    }

    try {
      await axios.post(`${API}/api/plans/${planType}/reset`, {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      toast.success(`Plan ${planType} restaurado a valores por defecto`);
      loadPlans();
    } catch (error) {
      toast.error(`Error al restaurar plan ${planType}`);
      console.error(error);
    }
  };

  const updatePlanField = (planType, field, value) => {
    setPlans(prev => ({
      ...prev,
      [planType]: {
        ...prev[planType],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`p-6 lg:p-8 space-y-6 min-h-screen ${darkMode ? 'bg-[#121212]' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <DollarSign className="inline-block h-8 w-8 mr-2" />
            Gestión de Planes
          </h1>
          <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Configura los límites y precios de cada plan
          </p>
        </div>
        
        {source === "custom" && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Info className="h-3 w-3 mr-1" />
            Configuración personalizada activa
          </Badge>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(plans).map(([planType, plan]) => {
          const { icon: Icon, color, bg } = PLAN_ICONS[planType] || PLAN_ICONS.basic;
          const isSaving = saving[planType];

          return (
            <Card key={planType} className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${bg}`}>
                      <Icon className={`h-6 w-6 ${color}`} />
                    </div>
                    <div>
                      <CardTitle className={darkMode ? 'text-white' : ''}>
                        {plan.name || planType.toUpperCase()}
                      </CardTitle>
                      <CardDescription>
                        Plan {planType}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="uppercase">
                    {planType}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label className={darkMode ? 'text-slate-300' : ''}>Nombre del Plan</Label>
                  <Input
                    value={plan.name || ''}
                    onChange={(e) => updatePlanField(planType, 'name', e.target.value)}
                    placeholder="Ej: Plan Básico"
                    className={darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}
                  />
                </div>

                {/* Limits */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className={`text-xs ${darkMode ? 'text-slate-300' : ''}`}>
                      Máx. Items
                    </Label>
                    <Input
                      type="number"
                      value={plan.max_items || 0}
                      onChange={(e) => updatePlanField(planType, 'max_items', e.target.value)}
                      className={darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={`text-xs ${darkMode ? 'text-slate-300' : ''}`}>
                      Máx. Clientes
                    </Label>
                    <Input
                      type="number"
                      value={plan.max_customers || 0}
                      onChange={(e) => updatePlanField(planType, 'max_customers', e.target.value)}
                      className={darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={`text-xs ${darkMode ? 'text-slate-300' : ''}`}>
                      Máx. Usuarios
                    </Label>
                    <Input
                      type="number"
                      value={plan.max_users || 0}
                      onChange={(e) => updatePlanField(planType, 'max_users', e.target.value)}
                      className={darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}
                    />
                  </div>
                </div>

                {/* Price & Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className={darkMode ? 'text-slate-300' : ''}>
                      Precio Anual (€)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={plan.price || 0}
                      onChange={(e) => updatePlanField(planType, 'price', e.target.value)}
                      className={darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}
                    />
                  </div>
                  {planType === 'trial' && (
                    <div className="space-y-2">
                      <Label className={darkMode ? 'text-slate-300' : ''}>
                        Duración (días)
                      </Label>
                      <Input
                        type="number"
                        value={plan.duration_days || 15}
                        onChange={(e) => updatePlanField(planType, 'duration_days', e.target.value)}
                        className={darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}
                      />
                    </div>
                  )}
                </div>

                {/* Stripe Price ID */}
                {planType !== 'trial' && (
                  <div className="space-y-2">
                    <Label className={`text-xs ${darkMode ? 'text-slate-300' : ''}`}>
                      Stripe Price ID
                    </Label>
                    <Input
                      value={plan.stripe_price_id || ''}
                      onChange={(e) => updatePlanField(planType, 'stripe_price_id', e.target.value)}
                      placeholder="price_xxxxx"
                      className={darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleUpdatePlan(planType)}
                    disabled={isSaving}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleResetPlan(planType)}
                    variant="outline"
                    disabled={isSaving}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-200'}`}>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
              <p className="font-medium mb-1">Información importante:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Los cambios afectan a todas las tiendas con ese plan</li>
                <li>Usa "Restaurar" para volver a los valores por defecto del sistema</li>
                <li>El plan Trial es gratuito y tiene duración limitada</li>
                <li>Los límites de 999999 se consideran "ilimitados"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
