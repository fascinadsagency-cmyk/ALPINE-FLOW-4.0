import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { dashboardApi } from "@/lib/api";
import { 
  ShoppingCart, 
  RotateCcw, 
  DollarSign, 
  Package,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await dashboardApi.get();
      setData(response.data);
    } catch (error) {
      toast.error("Error al cargar el dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = data?.stats || {};
  const inventory = stats?.inventory || {};
  const alerts = data?.alerts || [];
  const recentActivity = data?.recent_activity || [];

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            size="lg" 
            onClick={() => navigate('/nuevo-alquiler')}
            className="h-12 px-6 font-semibold shadow-sm"
            data-testid="quick-new-rental-btn"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Nuevo Alquiler
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => navigate('/devoluciones')}
            className="h-12 px-6 font-semibold"
            data-testid="quick-return-btn"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Devolución
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Ingresos Hoy</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  €{(stats.today_revenue || 0).toFixed(2)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Alquileres Hoy</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats.today_rentals || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Alquileres Activos</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats.active_rentals || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Devoluciones Vencidas</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats.overdue_returns || 0}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                stats.overdue_returns > 0 ? 'bg-red-100' : 'bg-slate-100'
              }`}>
                <AlertTriangle className={`h-6 w-6 ${
                  stats.overdue_returns > 0 ? 'text-red-600' : 'text-slate-400'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Stats */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-500" />
            Estado del Inventario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-xl bg-emerald-50">
              <p className="text-3xl font-bold text-emerald-600">{inventory.available || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Disponibles</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-red-50">
              <p className="text-3xl font-bold text-red-600">{inventory.rented || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Alquilados</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-amber-50">
              <p className="text-3xl font-bold text-amber-600">{inventory.maintenance || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Mantenimiento</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-100">
              <p className="text-3xl font-bold text-slate-600">{inventory.total || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No hay alertas pendientes</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {alerts.map((alert, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg flex items-start gap-3 ${
                      alert.severity === 'critical' ? 'bg-red-50' : 'bg-amber-50'
                    }`}
                  >
                    <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                      alert.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
                    }`} />
                    <div>
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="mb-1">
                        {alert.type === 'overdue' ? 'Vencido' : 'Mantenimiento'}
                      </Badge>
                      <p className="text-sm text-slate-700">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-500" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No hay actividad reciente</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        activity.status === 'active' ? 'bg-emerald-500' : 
                        activity.status === 'returned' ? 'bg-blue-500' : 'bg-amber-500'
                      }`} />
                      <div>
                        <p className="font-medium text-slate-900">{activity.customer_name}</p>
                        <p className="text-sm text-slate-500">{activity.items?.length || 0} artículos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">€{activity.total_amount?.toFixed(2)}</p>
                      <Badge variant={
                        activity.status === 'active' ? 'default' : 
                        activity.status === 'returned' ? 'secondary' : 'outline'
                      } className="text-xs">
                        {activity.status === 'active' ? 'Activo' : 
                         activity.status === 'returned' ? 'Devuelto' : 'Parcial'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
