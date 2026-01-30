# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Estado del Proyecto
**Última actualización:** 2026-01-30
**Estado:** Operativo - Modal "GESTIONAR CAMBIO" en Devoluciones corregido y verificado

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
  - Cálculo en tiempo real con agregación MongoDB
  - Sincronización automática de movimientos faltantes
  - Auditoría de integridad contable
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
- ✅ **Sistema de Cambios Centralizado (SWAP):**
  - Botón "CAMBIOS" a nivel de cliente (no por artículo)
  - Modal con auto-foco para escáner de códigos de barras
  - Detección automática del tipo de artículo y sustitución propuesta
  - Balance económico en tiempo real (verde=upgrade, rojo=downgrade)
  - Actualización automática de inventario
  - Ticket de regularización
- ✅ **Vista Compacta de Alquileres Activos:**
  - Una sola fila por cliente/contrato
  - Badge "N art." con Popover para ver detalle de artículos
  - UI más limpia y profesional
- ✅ **Cabecera Inteligente en Alquileres Activos:**
  - Barra de búsqueda híbrida (código/nombre) con auto-foco para escáner
  - Botón "CAMBIOS" prominente en naranja que abre el Gestor Universal en blanco
  - Filtrado de lista en tiempo real al escribir nombre
  - Scan-to-Action: Escanear artículo alquilado → identifica cliente automáticamente → abre modal
  - Endpoint: GET /api/lookup/{code} para reverse lookup
- ✅ **Modal GESTIONAR en Devoluciones (CORREGIDO 2026-01-30):**
  - Muestra TODOS los artículos del contrato del cliente
  - **Entrada dual de material:** Escáner + teclado manual con Enter
  - **Contador de días corregido:** Días Restantes = Fecha Fin - Hoy
  - **Terminología neutra:** "Ajuste de Fecha" / "Ajuste de Calendario" (no "Prórroga")
  - **Permite extensión Y devolución anticipada:** Selector de fecha flexible
  - **Balance en tiempo real:** Días originales → Días nuevos + delta económico
  - **Validación de disponibilidad:** Verifica status del artículo antes de confirmar
  - Integración obligatoria con caja (no permite guardar sin pasar por cobro/abono)
  - Ticket de regularización con detalle de todos los cambios
- ✅ **Buscador Global (Reverse Lookup - Scan-to-Action):**
  - Barra de búsqueda prominente en Dashboard con auto-foco
  - Escenario A (Escaneo artículo): Detecta cliente y abre modal de gestión automáticamente
  - Escenario B (Nombre cliente): Busca cliente y muestra su alquiler activo
  - Modal de gestión rápida permite: Cambiar material, Devolver artículo, Ajustar días
  - Endpoint: GET /api/lookup/{code}
- ✅ **Unificación de Gestión (REINGENIERÍA 2026-01-30):**
  - **ELIMINADO** el icono de edición (lápiz) en Alquileres Activos
  - El botón **CAMBIOS** es la ÚNICA forma de modificar artículos y fechas
  - Ficha de Cliente accesible desde modal con botón "Ver Ficha Completa"
- ✅ **Sincronización de Ingresos con Caja (REINGENIERÍA 2026-01-30):**
  - Caja muestra dos columnas separadas:
    - **📦 Contratos Nuevos**: Alquileres del día (categoría "rental")
    - **🔄 Ajustes Cambios**: Cobros/Abonos por modificaciones (categoría "rental_adjustment")
  - Desglose por método de pago: Efectivo / Tarjeta
  - Saldo Neto del Turno siempre coincide con el dinero real
  - Backend calcula `by_category` en agregación MongoDB

### 4. Sistema de Tickets/Comprobantes
- ✅ Impresión de ticket de alquiler con desglose completo
- ✅ Formato profesional para impresora térmica 80mm
- ✅ Nº Ticket con formato AXXXXXX
- ✅ Desglose por artículo: [Tipo/Modelo] | [Días] | [P.Unit] | [Subtotal]
- ✅ Agrupación visual de packs con precio único

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

### 1. Bug Crítico de Persistencia de Inventario - RESUELTO
- **Problema:** Al eliminar artículos, el sistema mostraba "Artículo eliminado" pero seguía apareciendo
- **Solución:**
  - **Borrado físico real:** Artículos sin historial se eliminan permanentemente de la BD
  - **Soft delete inteligente:** Artículos con historial de alquileres se marcan como `status: "deleted"`
  - **Filtrado automático:** GET /items excluye por defecto artículos con `status: "deleted"`
  - **Invalidación de caché:** Frontend limpia estado local y fuerza recarga tras eliminar
  - **Verificación post-borrado:** Si el artículo persiste, se fuerza recarga completa
  - **Borrado masivo mejorado:** Procesa TODOS los artículos seleccionados sin detenerse por fallos individuales

### 2. Rediseño Completo del Ticket de Alquiler - RESUELTO
- **Problema:** El ticket omitía información crítica como tipo de producto, días y desglose de precios
- **Solución:**
  - **Nº Ticket:** Formato `AXXXXXX` visible en cabecera
  - **Descripción completa:** Tipo de producto + Modelo + Talla para cada artículo
  - **Columna de días:** Días contratados por cada artículo individual
  - **Desglose de precios:** [Descripción] | [Días] | [P.Unitario] | [Subtotal]
  - **Formato de packs:** UNA SOLA línea por pack (sin componentes desglosados)
  - **Diseño profesional:** Ticket para impresora térmica 80mm con estilos CSS optimizados

### 2b. Corrección de Visualización y Cálculo de Packs - RESUELTO
- **Problema:** Los packs mostraban componentes individuales y el cálculo multiplicaba incorrectamente (27€ x 3 = 81€)
- **Solución:**
  - **Precio del pack es TOTAL:** `day_3 = 27€` significa 27€ total para 3 días, NO 27€/día
  - **Sin multiplicación por días:** El subtotal de un pack ES su precio de tarifa
  - **Una sola línea por pack:** Sin desglose de componentes en el carrito ni ticket
  - **Etiqueta clara:** "Tarifa 3d" en vez de "€27/día"

### 3. Corrección del Bug Crítico de Contabilidad
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
- ✅ ~~Bug de persistencia de inventario~~ RESUELTO

### P1 - Alta Prioridad
- ✅ ~~Rediseñar ticket de cliente~~ COMPLETADO
- ⏳ Personalización de tabla de Inventario (Drag & Drop)

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
