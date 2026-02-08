import { useState } from "react";
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
import { 
  AlertTriangle, 
  ArrowUpRight, 
  Package, 
  Users, 
  UserPlus,
  Sparkles
} from "lucide-react";

/**
 * Modal de Mejora de Plan - Se muestra cuando el usuario alcanza los límites del plan
 * 
 * @param {boolean} isOpen - Controla la visibilidad del modal
 * @param {function} onClose - Función para cerrar el modal
 * @param {string} limitType - Tipo de límite alcanzado: "items" | "customers" | "users"
 * @param {number} currentCount - Cantidad actual
 * @param {number} maxAllowed - Límite máximo del plan
 * @param {string} planName - Nombre del plan actual
 */
export default function UpgradePlanModal({ 
  isOpen, 
  onClose, 
  limitType = "items",
  currentCount = 0,
  maxAllowed = 0,
  planName = "Plan Actual"
}) {
  const navigate = useNavigate();

  const limitConfig = {
    items: {
      icon: Package,
      title: "Límite de Artículos Alcanzado",
      description: "Has alcanzado el número máximo de artículos permitidos en tu plan actual.",
      unit: "artículos"
    },
    customers: {
      icon: Users,
      title: "Límite de Clientes Alcanzado",
      description: "Has alcanzado el número máximo de clientes permitidos en tu plan actual.",
      unit: "clientes"
    },
    users: {
      icon: UserPlus,
      title: "Límite de Usuarios Alcanzado",
      description: "Has alcanzado el número máximo de usuarios del equipo permitidos en tu plan actual.",
      unit: "usuarios"
    }
  };

  const config = limitConfig[limitType] || limitConfig.items;
  const IconComponent = config.icon;

  const handleUpgrade = () => {
    onClose();
    navigate("/facturacion");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="upgrade-plan-modal">
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 mb-4">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
          </div>
          <DialogTitle className="text-center text-xl">
            {config.title}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Indicador visual del límite */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <IconComponent className="h-5 w-5 text-slate-600" />
                <span className="font-medium text-slate-700">Uso Actual</span>
              </div>
              <span className="text-sm text-slate-500">{planName}</span>
            </div>
            
            {/* Barra de progreso */}
            <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden mb-2">
              <div 
                className="absolute inset-y-0 left-0 bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: '100%' }}
              />
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-amber-600 font-semibold">
                {currentCount.toLocaleString()} {config.unit}
              </span>
              <span className="text-slate-500">
                Límite: {maxAllowed.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Beneficios de subir de plan */}
          <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-primary">Desbloquea más capacidad</p>
                <p className="text-slate-600 mt-1">
                  Actualiza tu plan para añadir más {config.unit} y seguir haciendo crecer tu negocio.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
            data-testid="upgrade-modal-cancel"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpgrade}
            className="w-full sm:w-auto gap-2"
            data-testid="upgrade-modal-confirm"
          >
            <ArrowUpRight className="h-4 w-4" />
            Subir de Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
