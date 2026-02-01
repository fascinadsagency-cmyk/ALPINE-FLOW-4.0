# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Estado del Proyecto
**Última actualización:** 2026-01-30
**Estado:** Operativo - CSS de impresión térmica OPTIMIZADO para 80mm

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
- ✅ **Dashboard Operativo:** Calendario de ocupación, rankings, control de devoluciones (SIN datos financieros por privacidad)
- ✅ **Gestión de Caja (REESCRITA 30/01/2026):** 
  - **Lógica financiera corregida con 3 variables maestras:**
    - `FONDO_INICIAL`: Dinero con el que se abrió la caja
    - `FLUJO_OPERATIVO_HOY`: Entradas - Salidas - Devoluciones (neto real)
    - `CAJA_ESPERADA`: Fondo + Flujo (solo efectivo para arqueo físico)
  - **Panel Superior (3 KPIs):**
    - Ingresos Brutos (negro)
    - Devoluciones y Salidas (rojo)
    - Balance Neto del Día (verde/rojo) - SIN incluir fondo inicial
  - **Panel Secundario (Arqueo):**
    - Efectivo en Cajón = Fondo + Neto Efectivo
    - Total Tarjeta = Ingresos - Salidas (puede ser negativo)
  - **Modal de Cierre:** Valores COINCIDEN EXACTAMENTE con Panel de Arqueo
  - **Ticket de Cierre (REDISEÑADO 30/01/2026):**
    - Formato 80mm para impresora térmica
    - Cabecera: Logo, fecha, turno, hora, responsable
    - Bloque A: Resumen Económico (+Fondo, +Ventas, -Devoluciones, =INGRESO NETO)
    - Bloque B: Desglose Arqueo (Efectivo y Tarjeta con desglose detallado)
    - Bloque C: Estadísticas Operativas
    - Resultado Final: Descuadre Total con indicador visual
  - **Impresión de Tickets de Movimientos (RESTAURADA 30/01/2026):**
    - Columna "Acciones" en tabla de movimientos con:
      - Botón Editar (lápiz): Cambiar método de pago
      - Botón Imprimir (impresora): Reimprimir ticket con plantilla de Configuración
    - Tickets diferenciados: Venta (verde), Devolución (naranja), Salida (rojo)
    - Usa logo, cabecera y pie de la configuración del negocio
  - Historial de cierres con reabrir
  - Múltiples turnos/sesiones por día
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
  - **Ticket de regularización UNIFICADO (30/01/2026):** Usa plantilla de Configuración con logo, cabecera y estructura A-B-C
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
- ✅ **Unificación de Gestión (OPTIMIZACIÓN 2026-01-30):**
  - **ELIMINADO** el icono de edición (lápiz) en Alquileres Activos
  - El botón **CAMBIOS** es la ÚNICA forma de modificar contratos
  - **Gestor Universal de Cambios** centralizado con:
    - Escaneo/entrada manual de artículos (con placeholder "SKI-001, BOT-002...")
    - **Ajuste de Calendario** prominente con botón "Activar"
    - Selector de fecha para extensión o devolución anticipada
    - Comparación visual: DÍAS ORIGINALES → DÍAS NUEVOS
    - Cálculo automático de "Suplemento por extensión" o "Abono por reducción"
    - **TOTAL COMBINADO**: Suma material + tiempo en un único saldo
    - Permite cambios solo de fecha (sin cambio de material)
    - Selector de método de cobro/abono (Efectivo/Tarjeta)
  - Ficha de Cliente accesible desde modal con botón "Ver Ficha Completa"
- ✅ **Botón de Cobro Desbloqueado (FIX 2026-01-30):**
  - Botón "Cobrar €XX y Confirmar" se habilita automáticamente cuando hay delta > 0
  - Condición corregida: permite cambio de material O ajuste de fecha
  - Al confirmar: Toast de éxito → Modal de éxito → Actualización instantánea de Dashboard y Caja
  - El ticket de impresión incluye sección "📅 AJUSTE DE CALENDARIO" si aplica
  - Vinculación completa con pasarela de pago y contabilidad
- ✅ **Sincronización de Ingresos (Single Source of Truth - 2026-01-30):**
  - **Dashboard "Ingresos Netos Hoy"** ahora lee de `cash_movements` (misma fuente que Caja)
  - Fórmula: **Ingresos Netos = Total Income - Total Refunds** (sin fondo inicial)
  - Al hacer clic en la tarjeta de Ingresos, navega directamente a /caja
  - Caja muestra columnas separadas:
    - **📦 Contratos Nuevos**: Alquileres del día (categoría "rental")
    - **🔄 Ajustes Cambios**: Cobros/Abonos por modificaciones (categorías rental_adjustment, swap_supplement, swap_refund)
  - Desglose por método de pago: Efectivo / Tarjeta
  - Saldo Neto del Turno = Fondo Inicial + Income - Expense - Refunds
  - Backend calcula `by_category` en agregación MongoDB
- ✅ **Ficha de Cliente Completa (MEJORADA 2026-01-30):**
  - Al pulsar **nombre del cliente** o icono de persona en Alquileres Activos, abre modal profesional con:
    - **Datos Personales:** Nombre completo, DNI/Pasaporte
    - **Datos Técnicos (PRIORITARIO):** Sección destacada en la parte superior con:
      - Talla de Bota
      - Altura (cm)
      - Peso (kg)
      - Nivel de Esquí (Principiante, Intermedio, Avanzado, Experto)
      - Edición rápida inline con botón "Editar"
      - Historial de tallas usadas anteriormente
    - **Alquiler Activo:** Referencia #ID, días y total del contrato actual
    - **Contacto con acciones:** Teléfono con botones "Llamar" y "WhatsApp", Email
    - **Ubicación:** Hotel/Ciudad/Dirección
    - **Notas y Alertas:** Observaciones internas (si existen)
    - **Resumen Financiero:** Total Pagado, Devoluciones, Ingreso Neto
    - **Últimas Transacciones:** Lista de pagos/abonos con fecha, método y monto
    - **Historial de Alquileres:** Lista completa con fechas, días, estado, equipos (con tallas), precios y estado de pago
    - **Total Histórico:** Suma de todos los importes de alquileres
  - Modal de **tamaño grande** (max-w-4xl) para mostrar toda la información
  - **Navegación fluida:** Botón "Cerrar" devuelve a la lista sin refrescar la página
  - Endpoint `/api/customers/{id}/technical-data` para actualización rápida
  - **Misma funcionalidad disponible en página de Clientes** (`/clientes`)

### 4. Sistema de Tickets/Comprobantes
- ✅ Impresión como comprobante de un pago ya realizado
- ✅ **CSS Optimizado para Impresoras Térmicas 80mm (COMPLETADO 2026-01-30):**
  - `@page { size: 80mm auto; margin: 0; }` elimina headers/footers del navegador
  - Ancho contenedor: 80mm / 100% del papel disponible
  - `page-break-inside: avoid` en filas/secciones previene cortes
  - Contraste: Todo texto `#000000` (negro puro), fondo `#ffffff`
- ✅ **REFACTORIZACIÓN COMPLETA - PrintLayout Maestro (2026-01-30):**
  - `ticketGenerator.js` es ahora el ÚNICO punto de generación de tickets
  - Tipos soportados: rental, return, swap, movement, closing
  - Header unificado: Logo (desde Configuración) o Nombre de Empresa como fallback
  - Body dinámico según tipo de ticket
  - Footer con textos legales desde Configuración
  - Doble copia automática si está activado en Settings
  - CashRegister.jsx y Returns.jsx refactorizados para usar el generador maestro
  - Eliminadas >500 líneas de HTML/CSS duplicado
  - Bundle reducido en 3.54 kB
- ✅ **TABLA DE ARTÍCULOS COMPLETA EN TICKETS (2026-01-30):**
  - Backend guarda rental_items con cada movimiento de caja
  - 3 columnas obligatorias: CONCEPTO (con talla), DÍAS, IMPORTE
  - Fallback: Si movimiento antiguo no tiene items, se recuperan del alquiler original
  - Tickets de historial ahora idénticos a tickets nuevos
  - Campos: name, size, internal_code, days, subtotal

### 5. Gestión de Datos
- ✅ **Importador Universal (CSV/Excel):** Para clientes e inventario

### 6. Configuración del Sistema (NUEVO 2026-01-30)
- ✅ **Panel de Configuración** accesible desde el menú lateral
- ✅ **Ajustes de Interfaz:**
  - **Modo Oscuro:** Toggle funcional que aplica tema oscuro a sidebar y páginas
  - **Selector de Idioma:** Español/Inglés con traducción instantánea de toda la UI
  - Toast de confirmación al cambiar configuración
- ✅ **Configuración de Impresión:**
  - Toggle de Impresión Automática de Tickets
  - Nota de recomendación para impresoras térmicas
- ✅ **Sección Hardware (NUEVO 2026-01-30):**
  - **Escáner / Pistola de Códigos:**
    - Toggle "Modo Escaneo Rápido": Añade producto automáticamente vs. esperar confirmación
  - **Impresora:**
    - Selector "Ancho de Papel": 80mm (Estándar) / 58mm (Estrecho)
    - Toggle "Auto-Imprimir": Abre diálogo de impresión al confirmar pago
    - Toggle "Imprimir Doble Copia": Dos tickets seguidos (Tienda y Cliente)
- ✅ **Persistencia de Preferencias:**
  - localStorage guarda: darkMode, language, auto_print_enabled, quick_scan_mode, paper_width, auto_print_on_payment, print_double_copy
  - Configuración se mantiene al cerrar/reabrir el navegador
- ✅ **Placeholders para futuras secciones:**
  - Personalización de Ticket (próximamente)
  - Gestión de IVA (próximamente)
  - Identidad Visual (próximamente)
- ✅ **Botón Guardar Cambios:** Fijo en cabecera, cambia a "Guardado" sin cambios pendientes

### 7. Soporte y Personalizaciones
- 🔲 Pestaña para tickets de soporte (pendiente)

### 7. Módulo de Mantenimiento y Taller
- ✅ **Mi Flota**: Lista de equipos que requieren puesta a punto
- ✅ **Taller Externo**: Gestión de reparaciones de clientes
- ✅ **CORRECCIÓN DE LÓGICA COMPLETADA (2026-02-01):**
  - Nuevo endpoint `POST /items/{item_id}/complete-maintenance`
  - Al completar puesta a punto:
    1. `days_used` se resetea a **0**
    2. `status` cambia a **"available"**
    3. Se guarda `last_maintenance_date` y `last_maintenance_by`
  - UI se actualiza inmediatamente (item desaparece de la lista)
  - Toast muestra: "Contadores reseteados (X → 0 días)"

### 8. Integraciones Futuras
- ⏳ VeriFactu, WhatsApp, TPV, Email, Google Calendar

### 9. Inventario y Rentabilidad (NUEVO 2026-02-01)
- ✅ **Gestión de Inventario**: CRUD completo de artículos
- ✅ **Modo Rentabilidad Global**: Toggle que muestra métricas de todos los productos
- ✅ **MODAL DE RENTABILIDAD INDIVIDUAL:**
  - Nuevo endpoint `GET /items/{item_id}/profitability`
  - Botón de gráfica (BarChart3) en cada fila del inventario
  - 3 KPIs: Coste Inversión (rojo), Ingresos Totales (verde), Beneficio Neto (+/-)
  - Barra de progreso de amortización con mensaje:
    - Si < 100%: "Faltan €X para amortizar"
    - Si >= 100%: "¡AMORTIZADO! Generando beneficios puros"
  - Historial de últimos 10 alquileres del producto
  - Advertencia si no tiene coste de compra registrado
  - Cálculo: ROI = (Ingresos / Coste) × 100

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
- `/app/frontend/src/pages/ActiveRentals.jsx` - Alquileres activos (incluye modal de ficha completa)
- `/app/frontend/src/pages/Customers.jsx` - Base de datos de clientes
- `/app/frontend/src/pages/Settings.jsx` - Configuración del sistema

---

## Credenciales de Prueba
- Usuario: `testuser2`
- Contraseña: `test123`
