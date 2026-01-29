# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Estado del Proyecto
**Última actualización:** 2026-01-29
**Estado:** Operativo - Bugs de contabilidad y persistencia de inventario RESUELTOS

---

## Problema Original
Crear un sistema de gestión completo para tiendas de alquiler de equipos de esquí/snowboard. El sistema debe priorizar la velocidad y la precisión.

---

## Requisitos del Producto (Consolidados)

### 1. Gestión Central
- ✅ Alquileres (crear, modificar duración, devoluciones)
- ✅ Devoluciones (normal y rápida con un clic)
- ✅ Inventario (código interno manual, artículos genéricos por stock)
- ✅ Clientes (con historial financiero)
- ✅ Proveedores
- ✅ Tarifas por días

### 2. Módulos Financieros
- ✅ **Dashboard Estratégico:** Calendario de ocupación, rankings, control de devoluciones
- ✅ **Gestión de Caja:** 
  - Arqueo manual detallado
  - Historial de cierres
  - Múltiples turnos/sesiones por día
  - **NUEVO:** Cálculo en tiempo real con agregación MongoDB
  - **NUEVO:** Sincronización automática de movimientos faltantes
  - **NUEVO:** Auditoría de integridad contable
- ✅ **Reportes Flexibles:** Filtro por rango, botones de selección rápida
- ✅ **Rentabilidad de Inventario:** Trackear coste, ingresos, amortización

### 3. Flujos de Trabajo Optimizados
- ✅ **Apertura de Caja Manual:** La caja se abre desde su módulo
- ✅ **Pasarela de Pago:** Modal de pago (Efectivo/Tarjeta)
- ✅ **Devolución Rápida:** Botón de un solo clic
- ✅ **Modificar Duración:** Ampliar/acortar alquileres con ajuste financiero
- ✅ **Tipos de Artículo Personalizados:** Usuario crea y gestiona categorías
- ✅ **Artículos Genéricos:** Gestión por stock (Cascos, Bastones, etc.)
- ✅ **Botonera de Añadido Rápido:** Cascos, Bastones, Máscara

### 4. Sistema de Tickets/Comprobantes
- ⏳ Impresión como comprobante (parcialmente implementado)

### 5. Gestión de Datos
- ✅ Importador CSV/Excel para clientes e inventario
- ✅ Ficha de Artículo con campos Fijación y Número de Serie
- ⏳ Personalización de Tablas (Drag & Drop - pausado)

### 6. Soporte
- ⏳ Pestaña de tickets de soporte (pendiente)

### 7. Integraciones Futuras
- ⏳ VeriFactu, WhatsApp, TPV, Email, Google Calendar

---

## Arquitectura Técnica

### Stack
- **Frontend:** React + TailwindCSS + Shadcn/UI
- **Backend:** FastAPI (Python) - Monolito en `server.py`
- **Base de Datos:** MongoDB

### Endpoints Críticos de Caja
```
POST /api/cash/sessions/open    - Abrir sesión de caja
GET  /api/cash/sessions/active  - Obtener sesión activa
GET  /api/cash/summary/realtime - Resumen en tiempo real (SUM agregación)
POST /api/cash/audit-sync       - Sincronizar movimientos faltantes
POST /api/cash/movements        - Crear movimiento manual
POST /api/cash/close            - Cerrar caja con arqueo
```

### Esquema de Base de Datos Clave
```javascript
// cash_sessions
{
  id: string,
  date: string,
  session_number: int,
  opening_balance: float,
  status: "open" | "closed",
  opened_at: datetime,
  closed_at: datetime | null
}

// cash_movements
{
  id: string,
  session_id: string,  // CRÍTICO: vincula al turno activo
  movement_type: "income" | "expense" | "refund",
  amount: float,
  payment_method: "cash" | "card" | "transfer",
  category: string,
  concept: string,
  reference_id: string,  // ID del alquiler/reparación
  created_at: datetime
}
```

---

## Funcionalidades Implementadas en Esta Sesión

### 1. Corrección del Bug Crítico de Contabilidad
- **Problema:** Los cobros de alquileres no se registraban en la caja
- **Solución:**
  - Todos los endpoints financieros ahora requieren `session_id`
  - Validación obligatoria de sesión activa antes de cualquier cobro
  - Soporte completo para artículos genéricos (stock_available)

### 2. Sistema de Auditoría y Sincronización
- Endpoint `POST /api/cash/audit-sync` detecta y crea movimientos faltantes
- Sincronización automática al cargar la página de Caja
- Botón "Sincronizar" para forzar reconciliación manual

### 3. Cálculo en Tiempo Real
- Endpoint `GET /api/cash/summary/realtime` usa agregación MongoDB
- Fórmula: `Saldo = Fondo_Apertura + SUM(Ingresos) - SUM(Gastos) - SUM(Devoluciones)`
- Desglose por método de pago (Efectivo/Tarjeta)

### 4. Correcciones en Endpoints Financieros
- `POST /api/rentals` - Ahora vincula movimientos a sesión
- `POST /api/rentals/{id}/payment` - Crea movimiento con session_id
- `PATCH /api/rentals/{id}/modify-duration` - Requiere sesión activa
- `POST /api/rentals/{id}/refund` - Vincula devoluciones a sesión
- `POST /api/external-repairs/{id}/deliver` - Vincula taller a sesión

---

## Tareas Pendientes

### P0 - Crítico
- ✅ ~~Bug de contabilidad~~ RESUELTO

### P1 - Alta Prioridad
- ⏳ Personalización de tabla de Inventario (Drag & Drop)
- ⏳ Sistema de Impresión Automática

### P2 - Media Prioridad
- Pestaña de Soporte y Mejoras
- Refresco en tiempo real (Polling) en Dashboard

### P3 - Baja Prioridad / Futuro
- Integraciones (VeriFactu, WhatsApp, TPV)
- Sistema de Reservas Online
- Modo Oscuro
- Refactorización de `server.py` en módulos

---

## Archivos de Referencia Principales
- `/app/backend/server.py` - Backend monolítico
- `/app/frontend/src/pages/CashRegister.jsx` - Módulo de caja
- `/app/frontend/src/pages/NewRental.jsx` - Nuevo alquiler
- `/app/frontend/src/pages/Inventory.jsx` - Gestión de inventario

---

## Credenciales de Prueba
- Usuario: `testcaja`
- Contraseña: `test1234`
