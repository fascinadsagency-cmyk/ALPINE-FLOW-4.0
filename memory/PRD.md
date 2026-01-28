# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Problema Original
Sistema de gestión completo para tiendas de alquiler de equipos de esquí/snowboard con énfasis en VELOCIDAD y PRECISIÓN.

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + Python
- **Base de datos**: MongoDB
- **Autenticación**: JWT

## Funcionalidades Implementadas

### 1. Autenticación
- Login/Registro con JWT
- Roles: admin, employee

### 2. Dashboard Estratégico
- KPIs en tiempo real
- Vista Semanal de Ocupación
- Panel de Rendimiento de Inventario
- Alertas Urgentes

### 3. Gestión de Clientes
- Búsqueda rápida por DNI/nombre/teléfono
- Historial de alquileres y transacciones
- Alertas de seguridad

### 4. Proceso de Alquiler
- Sistema de fechas inteligente
- Escaneo de artículos por código de barras
- Sistema de descuentos
- AUTO-COMBO: Detección automática de packs (silenciosa)
- Vinculación automática con Caja

### 5. Devoluciones
- Devolución rápida con un clic
- Reembolso parcial por días no disfrutados

### 6. Inventario
- Código Interno manual obligatorio
- Tipos de artículos dinámicos
- Importación/Exportación CSV

### 7. Caja (Actualizado 2026-01-28)
- ✅ Impresión de tickets desde cada movimiento
- ✅ Impresión automática al crear movimientos
- ✅ Historial de cierres con tabla detallada
- ✅ Función de revertir cierres
- Vinculación automática con Alquileres y Taller

### 8. Modificación de Alquileres (Actualizado 2026-01-28)
- ✅ Ampliar/Acortar duración desde Alquileres Activos
- ✅ Ajuste financiero automático en Caja

### 9. Configuración
- Toggle de Impresión Automática

### 10. Tarifas
- Precios individuales por tipo y duración
- Sistema de Packs/Combos

### 11. Mantenimiento/Taller
- Modo "MI FLOTA" y "TALLER EXTERNO"
- Integración con Caja

## Próximas Tareas (Backlog)

### P1 - Alta Prioridad
- [ ] Acceso directo a ficha de cliente desde lista de alquileres
- [ ] Pestaña de Soporte y Mejoras

### P2 - Media Prioridad
- [ ] Integración WhatsApp
- [ ] Integración TPV bancario
- [ ] Integración VeriFactu

### P3 - Baja Prioridad
- [ ] Sistema de Reservas Online
- [ ] Modo Oscuro
- [ ] Reportes Avanzados

## Credenciales de Prueba
- Usuario: test_combo
- Contraseña: test123456

## Última Actualización
Fecha: 2026-01-28
Versión: 1.9.0

## Changelog
- **v1.9.0** (2026-01-28): Sistema de Tickets y Gestión de Cierres
  - Impresión de tickets desde movimientos de caja
  - Vista previa y formato de ticket térmico
  - Historial de cierres con reversión
  - Ajuste financiero automático en modificación de alquileres
- **v1.8.0**: Dashboard Analítico Completo
- **v1.7.0**: Módulo Taller Externo
- **v1.6.0**: Sugerencias Inteligentes de Packs
