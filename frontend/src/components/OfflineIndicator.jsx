/**
 * OfflineIndicator Component
 * 
 * Muestra el estado de conexión y sincronización en la barra superior.
 * Incluye:
 * - Indicador de online/offline
 * - Contador de operaciones pendientes
 * - Botón de sincronización manual
 * - Barra de progreso durante sincronización
 */
import { useState } from 'react';
import { useOffline } from '@/contexts/OfflineContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Cloud, 
  CloudOff,
  Database,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function OfflineIndicator() {
  const { 
    isOnline, 
    isSyncing, 
    syncProgress, 
    pendingCount, 
    lastSyncTime,
    dbStats,
    syncNow,
    downloadInitialData
  } = useOffline();
  
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Nunca';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} horas`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`relative gap-2 ${!isOnline ? 'text-amber-600' : 'text-slate-600'}`}
          data-testid="offline-indicator"
        >
          {isOnline ? (
            <Wifi className="h-4 w-4 text-emerald-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-amber-500" />
          )}
          
          {pendingCount > 0 && (
            <Badge 
              variant="destructive" 
              className="h-5 min-w-5 px-1 text-xs absolute -top-1 -right-1"
            >
              {pendingCount}
            </Badge>
          )}
          
          {isSyncing && (
            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Estado de conexión */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Cloud className="h-5 w-5 text-emerald-500" />
                  <span className="font-medium text-emerald-600">Conectado</span>
                </>
              ) : (
                <>
                  <CloudOff className="h-5 w-5 text-amber-500" />
                  <span className="font-medium text-amber-600">Sin conexión</span>
                </>
              )}
            </div>
            
            <Badge variant={isOnline ? 'outline' : 'secondary'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>

          {/* Progreso de sincronización */}
          {isSyncing && syncProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {syncProgress.type === 'downloading' ? 'Descargando datos...' : 'Sincronizando...'}
                </span>
                <span className="font-medium">{syncProgress.progress}%</span>
              </div>
              <Progress value={syncProgress.progress} className="h-2" />
              {syncProgress.synced !== undefined && (
                <p className="text-xs text-slate-500">
                  {syncProgress.synced} de {syncProgress.total} operaciones
                </p>
              )}
            </div>
          )}

          {/* Operaciones pendientes */}
          {pendingCount > 0 && !isSyncing && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700">
                  {pendingCount} operación{pendingCount !== 1 ? 'es' : ''} pendiente{pendingCount !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-amber-600">
                  Se sincronizarán cuando vuelva la conexión
                </p>
              </div>
            </div>
          )}

          {/* Sin operaciones pendientes */}
          {pendingCount === 0 && !isSyncing && (
            <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-700">Todo sincronizado</p>
            </div>
          )}

          {/* Última sincronización */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            <span>Última sync: {formatLastSync(lastSyncTime)}</span>
          </div>

          {/* Estadísticas de BD local */}
          {dbStats && (
            <div className="space-y-1 pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Database className="h-4 w-4" />
                <span className="font-medium">Datos locales</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-slate-500 pl-6">
                <span>Clientes: {dbStats.customers}</span>
                <span>Artículos: {dbStats.items}</span>
                <span>Alquileres: {dbStats.rentals}</span>
                <span>Tarifas: {dbStats.tariffs}</span>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => downloadInitialData()}
              disabled={!isOnline || isSyncing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
              Descargar datos
            </Button>
            
            <Button
              variant={pendingCount > 0 ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => syncNow()}
              disabled={!isOnline || isSyncing || pendingCount === 0}
            >
              <Cloud className="h-4 w-4 mr-1" />
              Sincronizar
            </Button>
          </div>
          
          {/* Botón para limpiar caché y forzar actualización */}
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-slate-500 hover:text-slate-700"
              onClick={async () => {
                try {
                  // Enviar mensaje al SW para limpiar caché
                  if (navigator.serviceWorker?.controller) {
                    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
                  }
                  // También limpiar cachés directamente
                  const cacheNames = await caches.keys();
                  await Promise.all(cacheNames.map(name => caches.delete(name)));
                  // Recargar la página
                  setTimeout(() => window.location.reload(), 500);
                } catch (error) {
                  console.error('Error limpiando caché:', error);
                }
              }}
            >
              🔄 Limpiar caché y actualizar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
