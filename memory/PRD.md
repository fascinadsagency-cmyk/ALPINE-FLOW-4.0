# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Estado del Proyecto
**Última actualización:** 2026-02-04
**Estado:** Operativo - Cálculo de Precios de Packs CORREGIDO

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
  - **REDISEÑO PRIVACIDAD - SISTEMA ACORDEÓN (NUEVO 2026-02-04):**
    - **Eliminado efecto blur** - Reemplazado por marcador neutro "••••••"
    - **Botón maestro "Mostrar/Ocultar Todo"** - Controla visibilidad global
    - **Iconos de ojo individuales** - Cada métrica puede mostrarse/ocultarse
    - **Estados visuales diferenciados** - Iconos resaltados cuando datos visibles
    - **Transiciones suaves** - CSS transitions de 200-300ms
    - **Estructura preservada** - Contenedores mantienen tamaño mínimo
    - **Diseño limpio sin distracción** - Sin blur, solo texto enmascarado
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
- ✅ **PERSISTENCIA DE CARRITO EN NUEVO ALQUILER (NUEVO 2026-02-04):**
  - **Hook `useCartPersistence`:** Persiste el estado del carrito en localStorage
  - **Datos Persistidos:** Cliente, artículos, packs detectados, días, fechas, notas, descuentos
  - **Restauración Automática:** Al volver a "Nuevo Alquiler", el carrito se restaura completo
  - **Ciclo de Vida Controlado:** Solo se borra al completar venta, vaciar carrito o cerrar sesión
  - **Prevención de Colisiones:** Cada usuario tiene su propio carrito (userId vinculado)
  - **Expiración Automática:** Datos caducan a las 24 horas por seguridad
  - **Indicador Visual:** Badge "✓ Guardado" cuando hay datos persistidos
  - **Botón "Vaciar":** Limpia carrito manualmente sin completar venta
  - **Integración con Logout:** `clearPersistedCart()` se llama al cerrar sesión
- ✅ **SISTEMA DE CAPTURA GLOBAL DE ESCÁNER HID (NUEVO 2026-02-02):**
  - **Hook `useScannerListener`:** Escucha global de teclas a nivel de window
  - **Detección Automática de Escáner:** Entrada rápida (< 50ms entre teclas) = escáner HID
  - **Auto-Foco Permanente:** Campo de código de barras recupera foco al hacer clic en el fondo
  - **Buffer de Acumulación:** Captura caracteres incluso cuando el cursor no está en un input
  - **Limpieza Automática al Enter:** Procesa código y limpia buffer
  - **Prevención de Acciones No Deseadas:** `e.preventDefault()` evita cierre de modales/submit
  - **Indicadores Visuales:** Campo pulsa en verde cuando escáner detectado, icono Radio animado
  - **Compatibilidad:** Netum NT-1698W y otros lectores HID
  - **Implementado en:** Inventario, Devoluciones, Nuevo Alquiler
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
- ✅ **PRINT SERVICE GLOBAL (NUEVO 2026-02-02):**
  - **Archivo:** `/app/frontend/src/lib/printService.js`
  - **Abstracción universal** invocable desde cualquier componente
  - **Non-blocking:** El proceso de impresión no bloquea el hilo principal
  - **Cola de impresión:** Múltiples tickets se encolan y procesan secuencialmente
  - **Callbacks:** `onComplete` y `onError` para gestionar flujo post-impresión
  - **Estilos @media print en App.css:** Garantizan formato 80mm desde cualquier ruta
  - **Métodos disponibles:**
    - `PrintService.print(options)` - Impresión genérica
    - `PrintService.printRental(data)` - Ticket de alquiler
    - `PrintService.printReturn(data)` - Ticket de devolución
    - `PrintService.printSwap(data)` - Ticket de cambio
    - `PrintService.printMovement(data)` - Movimiento de caja
    - `PrintService.printClosing(data)` - Cierre de caja
    - `PrintService.isPrinting()` - Verificar impresión activa
    - `PrintService.clearQueue()` - Limpiar cola
  - **Hook React:** `usePrintService()` para uso en componentes funcionales
  - **Integrado en:** NewRental.jsx, Returns.jsx
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

### 8. AUDITORÍA DE MÉTRICAS DEL DASHBOARD (CORREGIDO 2026-02-04)
- ✅ **Porcentaje de Ocupación de Stock (occupancy_percent):**
  - **FÓRMULA CORREGIDA**: `rented / (available + rented + maintenance) * 100`
  - **EXCLUYE**: items con status `retired`, `deleted`, `lost` (baja/perdido)
  - **NUEVO CAMPO**: `rentable_total` = suma de items aptos para alquilar
  - Ejemplo: 47 items totales - 8 retired/deleted = 39 rentables → 10.3% con 4 alquilados
- ✅ **Contador de Clientes Atendidos Hoy (customers_today):**
  - **NUEVO CAMPO** en respuesta de stats
  - Usa `COUNT(DISTINCT customer_id)` via pipeline de agregación MongoDB
  - **EXCLUYE**: alquileres con status `cancelled` o `deleted`
  - Si un cliente alquila 3 veces en el día, cuenta como 1 cliente único
- ✅ **Contador de Devoluciones Hoy (returns_today):**
  - Cuenta alquileres devueltos hoy (status `returned` + `actual_return_date` = hoy)
  - **Fallback**: si no hay `actual_return_date`, cuenta movimientos de caja tipo `return`
- ✅ **Ocupación por Categorías (occupancy_by_category):**
  - **FILTRO AÑADIDO**: `status: {$in: ['available', 'rented', 'maintenance']}`
  - Ya no cuenta items `retired`/`deleted` en los totales por gama
  - Ejemplo: MEDIA ahora muestra 27 (no 33) porque excluye 6 items en baja
- ✅ **Formateo de Resultados:**
  - Porcentajes redondeados a 1 decimal
  - Campos numéricos devuelven `0` en lugar de `null`/`undefined`
- ✅ **Frontend actualizado:**
  - "Clientes del Día" ahora usa `stats.customers_today ?? 0`
  - Subtítulo actualizado: "Clientes únicos atendidos"

### 9. Integraciones Futuras
- ⏳ VeriFactu, WhatsApp, TPV, Email, Google Calendar

### 9. Inventario y Rentabilidad (ACTUALIZADO 2026-02-02)
- ✅ **Gestión de Inventario**: CRUD completo de artículos
- ✅ **Modo Rentabilidad Global**: Toggle que muestra métricas de todos los productos
- ✅ **DASHBOARD VISUAL DE RENTABILIDAD (RECHARTS):**
  - Modal grande (`max-w-4xl`) con gráficos interactivos
  - **4 KPIs en tarjetas**: ROI Actual, Inversión, Ingresos, Beneficio Neto
  - **GRÁFICO DE LÍNEA (Curva de Amortización)**:
    - Línea ROJA horizontal: Coste de Inversión (punto de equilibrio)
    - Línea VERDE ascendente + área: Ingresos Acumulados
    - Tooltip interactivo con valores
    - Leyenda y ejes etiquetados
  - Barra de progreso hacia el punto de equilibrio
  - Mensaje dinámico: "¡AMORTIZADO!" o "Faltan €X para recuperar"
  - Historial de últimos 10 alquileres en tabla
  - Advertencia si falta coste de compra
- ✅ **MODO ENTRADA RÁPIDA POR ESCÁNER (NUEVO 2026-02-02):**
  - **Toggle "Modo Entrada Rápida por Escáner"** en formulario de Añadir Artículo
  - **Activación visual**: Fondo verde, badge "ESCÁNER: X guardados", iconos ⚡ en campos
  - **Auto-guardado al escanear**: Al pulsar Enter en campo de código de barras, el artículo se guarda automáticamente
  - **Limpieza inteligente del formulario**: Después de guardar, limpia campos pero MANTIENE el tipo de artículo seleccionado
  - **Contador de sesión**: Muestra cuántos artículos se han guardado en la sesión actual
  - **Detección de duplicados**: Si el código escaneado ya existe, abre automáticamente el modal de EDICIÓN con la ficha del artículo existente (evita duplicados)
  - **Feedback visual**: Destello verde al guardar, naranja al detectar duplicado
  - **Validación previa**: Requiere seleccionar tipo de artículo antes de escanear
  - **Endpoint backend**: `GET /api/items/check-barcode/{barcode}` busca en internal_code, barcode y barcode_2

### 10. Módulo de Devoluciones (REDISEÑO TOTAL 2026-02-01)
- ✅ **NUEVO DISEÑO: "Mostrador de Recepción"**
- ✅ **Zona Superior - Área Activa:**
  - Campo de escaneo grande y centrado con fondo verde esmeralda
  - Al escanear/seleccionar contrato se carga:
    - Ficha del Cliente (izquierda): Avatar, nombre, DNI, período, total, **FECHAS INICIO/FIN**
    - Listado de Artículos (derecha): **Lista vertical de filas** con columnas Producto|Código|Talla|Estado
  - Estados visuales: GRIS (pendiente) → VERDE (escaneado/listo)
  - **TOGGLE REVERSIBLE**: Click marca, click desmarca (funciona con ratón y escáner)
  - **Nombre del Cliente Clicable**: Abre modal con ficha completa (teléfono, DNI, WhatsApp)
  - Botonera: "Marcar TODO", "Cambio/Sustitución", "PROCESAR DEVOLUCIÓN", "Cancelar"
- ✅ **Zona Inferior - Colas de Trabajo:**
  - TABLA 1: PENDIENTES DE HOY (rojo, prioridad alta)
  - TABLA 2: OTRAS DEVOLUCIONES (gris, con badges ATRASADO en rojo)
  - Click en cliente carga contrato en zona activa (no procesa directamente)
- ✅ **CORRECCIÓN DE ESCÁNER (2026-02-01):**
  - Búsqueda Multi-Campo por `barcode`, `internal_code`, `item_id`
  - Auto-foco y Auto-submit con Enter en modal de sustitución
- ✅ **MODAL DE LIQUIDACIÓN (2026-02-01):**
  - **CASO A (Saldo 0)**: Procesa directamente sin modal
  - **CASO B (Cliente debe)**: Modal "Saldo Pendiente a Cobrar" con selector Efectivo/Tarjeta
  - **CASO C (Hay que devolver)**: Modal "Reembolso al Cliente" con restricción de método de pago
  - Cálculo automático: días usados vs días pagados, precio/día proporcional
  - Desglose visual: días contratados, días usados, pagado inicialmente, servicio usado
  - Restricción de seguridad: si pago original fue efectivo, reembolso debe ser en efectivo
  - Botones: Cancelar / Cobrar|Devolver €XX.XX
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

### 2c. Recálculo Dinámico de Precios de Packs - CORREGIDO 2026-02-04
- **Problema:** Al cambiar los días del pack, el precio NO se recalculaba. Quedaba anclado al precio de 1 día.
- **Solución Técnica:**
  - **`getPackPrice(pack, days)`:** Busca `pack[day_${days}]` en la tarifa escalonada
  - **`updatePackDays(packItems, newDays)`:** Al cambiar días, limpia `customPackPrice` para forzar recálculo
  - **`manualPriceEdit` flag:** Distingue precio editado manualmente vs calculado automáticamente
  - **Si precio fue editado manualmente:** Se preserva al cambiar días (toast informa al usuario)
  - **Si precio NO fue editado:** Se recalcula automáticamente desde tarifa escalonada
  - **`resetPackPrice(packItems)`:** Nueva función para restaurar precio de tarifa (elimina edición manual)
  - **Botón de reset:** Icono ↺ junto a badge "EDITADO" permite volver a tarifa original
- **Ejemplo verificado:**
  - 1 día = €27.00 ✓
  - 3 días = €65.00 (NO €81 = 27×3) ✓
  - 6 días = €95.00 (NO €162 = 27×6) ✓
- **Testing:** 7/7 tests passed (iteration_24.json)

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
