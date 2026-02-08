import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  Package, 
  Users, 
  UserPlus, 
  Sparkles,
  ArrowUpRight,
  Zap
} from "lucide-react";

const PLAN_NAMES = {
  basic: "Plan Básico",
  pro: "Plan PRO",
  enterprise: "Plan Enterprise",
  trial: "Trial Gratuito"
};

const PLAN_LIMITS = {
  basic: { items: 2000, customers: 10000, users: 5 },
  pro: { items: 6000, customers: 40000, users: 10 },
  enterprise: { items: 999999, customers: 999999, users: 15 }
};

const UPGRADE_PATH = {
  basic: "pro",
  pro: "enterprise"
};

export default function PlanLimitModal({ 
  open, 
  onClose, 
  limitType, // 'items' | 'customers' | 'users'
  currentCount,
  maxCount,
  planType 
}) {
  const navigate = useNavigate();

  const getLimitIcon = () => {
    switch (limitType) {
      case 'items': return <Package className="h-8 w-8 text-amber-500" />;
      case 'customers': return <Users className="h-8 w-8 text-amber-500" />;
      case 'users': return <UserPlus className="h-8 w-8 text-amber-500" />;
      default: return <AlertTriangle className="h-8 w-8 text-amber-500" />;
    }
  };

  const getLimitTitle = () => {
    switch (limitType) {
      case 'items': return 'Límite de Artículos Alcanzado';
      case 'customers': return 'Límite de Clientes Alcanzado';
      case 'users': return 'Límite de Usuarios Alcanzado';
      default: return 'Límite del Plan Alcanzado';
    }
  };

  const getLimitDescription = () => {
    switch (limitType) {
      case 'items': return 'artículos';
      case 'customers': return 'clientes';
      case 'users': return 'usuarios';
      default: return 'recursos';
    }
  };

  const getNextPlanInfo = () => {
    const nextPlan = UPGRADE_PATH[planType];
    if (!nextPlan) return null;
    return {
      name: PLAN_NAMES[nextPlan],
      limits: PLAN_LIMITS[nextPlan]
    };
  };

  const nextPlan = getNextPlanInfo();
  const progress = Math.min(100, (currentCount / maxCount) * 100);

  const handleUpgrade = () => {
    onClose();
    navigate('/facturacion');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="plan-limit-modal">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
            {getLimitIcon()}
          </div>
          <DialogTitle className="text-xl text-center">
            {getLimitTitle()}
          </DialogTitle>
          <DialogDescription className="text-center">
            Has alcanzado el límite de tu <strong>{PLAN_NAMES[planType] || planType}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Current usage bar */}
          <div className="bg-slate-50 rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">
                Uso de {getLimitDescription()}
              </span>
              <span className="text-sm font-bold text-amber-600">
                {currentCount.toLocaleString()} / {maxCount.toLocaleString()}
              </span>
            </div>
            <Progress value={progress} className="h-2 bg-slate-200" />
            <p className="text-xs text-slate-500 mt-2">
              No puedes crear más {getLimitDescription()} con tu plan actual
            </p>
          </div>

          {/* Upgrade suggestion */}
          {nextPlan && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-emerald-800">
                    Actualiza a {nextPlan.name}
                  </h4>
                  <p className="text-sm text-emerald-700 mt-1">
                    Obtén hasta{' '}
                    <strong>
                      {limitType === 'items' && (nextPlan.limits.items === 999999 ? 'ilimitados' : nextPlan.limits.items.toLocaleString())}
                      {limitType === 'customers' && (nextPlan.limits.customers === 999999 ? 'ilimitados' : nextPlan.limits.customers.toLocaleString())}
                      {limitType === 'users' && nextPlan.limits.users}
                    </strong>{' '}
                    {getLimitDescription()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Enterprise message if already on PRO */}
          {planType === 'enterprise' && (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-sm text-purple-700">
                Ya tienes el plan más alto. Contacta con soporte si necesitas límites personalizados.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          {nextPlan && (
            <Button 
              onClick={handleUpgrade}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
              data-testid="upgrade-plan-btn"
            >
              <Zap className="h-4 w-4 mr-2" />
              Subir de Plan Ahora
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook para verificar límites antes de crear recursos
export function usePlanLimits() {
  const checkLimit = async (limitType, planStatus) => {
    if (!planStatus) return { allowed: true };
    
    // Trial tiene acceso ilimitado
    if (planStatus.is_trial && !planStatus.trial_expired) {
      return { allowed: true };
    }
    
    let current, max;
    switch (limitType) {
      case 'items':
        current = planStatus.current_items || 0;
        max = planStatus.max_items || 999999;
        break;
      case 'customers':
        current = planStatus.current_customers || 0;
        max = planStatus.max_customers || 999999;
        break;
      case 'users':
        current = planStatus.current_users || 0;
        max = planStatus.max_users || 999;
        break;
      default:
        return { allowed: true };
    }
    
    // Si el máximo es "ilimitado" (999999), permitir
    if (max >= 999999) {
      return { allowed: true };
    }
    
    // Verificar si se alcanzó el límite
    if (current >= max) {
      return {
        allowed: false,
        limitType,
        currentCount: current,
        maxCount: max,
        planType: planStatus.plan_type
      };
    }
    
    return { allowed: true };
  };
  
  return { checkLimit };
}
