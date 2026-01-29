# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn UI + XLSX + @dnd-kit
- **Backend**: FastAPI + Python
- **Base de datos**: MongoDB
- **Autenticación**: JWT

## Funcionalidades Implementadas

### 1. Módulo de Gestión de Caja - Sistema Sin Restricciones ✨ COMPLETADO
**Funcionalidad 100% operativa - Control Total del Administrador:**

- **🔓 Sin Restricciones Horarias (NUEVO)**:
  * Botón "Cerrar Caja" disponible 24/7, sin límites de horario
  * Elimina validaciones de "hora de cierre" o "ya cerrada hoy"
  * Permite cerrar caja en cualquier momento: 12:00, 20:00, 03:00, etc.
  * El administrador decide cuándo empieza y termina su jornada contable

- **🔄 Múltiples Turnos por Día**:
  * Sistema de numeración automática: Turno #1, #2, #3, etc.
  * Cada cierre recibe un número secuencial único por fecha
  * Historial con columna "Turno" para distinguir cierres del mismo día
  * Soporte para múltiples empleados/turnos en una sola fecha
  * Ticket impreso incluye: "Fecha: 2026-01-29 - Turno #2"

- **⚡ Cierre Independiente de Estado**:
  * Permite cerrar incluso con descuadres detectados
  * Permite cerrar con alquileres activos pendientes
  * El cierre de caja es puramente administrativo/contable
  * No bloquea operaciones por validaciones de sistema

- **Diálogo de Cierre Mejorado**: 
  * Resumen Global del Día (Ventas, Salidas, Devoluciones)
  * Desglose Detallado por Método de Pago con dos tarjetas profesionales:
    - 💵 **EFECTIVO** (fondo azul): + Ventas, - Salidas, - Devoluciones → Esperado
    - 💳 **TARJETA** (fondo morado): + Ventas, - Salidas, - Devoluciones → Esperado
  * Cálculo de Descuadre Dinámico con feedback visual (verde/amarillo/rojo)
  * Mensajes contextuales ("¡Cuadra perfectamente!", "Hay más dinero", "Falta dinero")

- **Ticket de Arqueo Profesional (formato térmico 80mm)**:
  * Encabezado con fecha, **número de turno**, hora y empleado
  * Nº de operaciones
  * RESUMEN GLOBAL DEL DÍA: Entradas, Salidas, Devoluciones
  * **DESGLOSE POR MÉTODO DE PAGO**:
    - Sección **💵 EFECTIVO**: + Ventas, - Salidas, - Devoluciones, Esperado, Contado, Descuadre
    - Sección **💳 TARJETA**: + Ventas, - Salidas, - Devoluciones, Esperado, Datáfono, Descuadre
  * DESCUADRE TOTAL en recuadro destacado (verde/amarillo/rojo según cantidad)
  * Notas del cierre
  * Footer: "Documento de arqueo - Conservar con la recaudación"

- **Backend Sin Restricciones**:
  * Eliminada validación "Cash register already closed for this date"
  * Función `get_next_closure_number()` para numeración automática atómica
  * Endpoint `/api/cash/close` permite cierres ilimitados por fecha
  * Endpoint `/api/cash/closings/{closing_id}` elimina cierre específico por ID (no por fecha)
  * Modelo `CashClosingResponse` incluye: `closure_number`, `total_refunds`, `movements_count`, `by_payment_method`

- **Funcionalidades Adicionales**:
  * Banner informativo: "Sistema de caja sin restricciones horarias"
  * Impresión automática al cerrar caja con número de turno
  * Reimprimir cierres históricos con desglose completo y número de turno
  * Revertir cierre específico (por ID) sin afectar otros turnos del mismo día
  * Retrocompatibilidad con cierres antiguos (sin `closure_number`)
  * Cálculos precisos: Esperado = Ventas - Salidas - Devoluciones (por cada método)

### 2. Panel de Control de Devoluciones en Dashboard
- Métricas dinámicas por categoría de artículo
- Alerta visual ROJA si supera hora de cierre
- Enlace directo a devoluciones filtradas

### 3. Nuevos Campos en Inventario
- Número de Serie (fabricante)
- Fijación (modelo de fijación)
- Reorganización de columnas de identificación

### 4. Importador Universal (Clientes e Inventario)
- Soporte CSV, XLS, XLSX
- Mapeo inteligente de campos
- Detección de duplicados

### 5. Email Opcional en Clientes
- Campos obligatorios: DNI*, Nombre*, Teléfono*
- Asteriscos rojos visuales

## Próximas Tareas

### P1 - Alta Prioridad
- [ ] Pestaña de Soporte y Mejoras
- [ ] Personalización de columnas en Inventario (drag & drop)

### P2 - Media Prioridad
- [ ] Integraciones (WhatsApp, TPV, VeriFactu, Email)

## Credenciales de Prueba
- Usuario: test_packs_user
- Contraseña: test123456

## Changelog
- **v3.2.0** (2026-01-29): **Edición de Precios en Nuevo Alquiler** - Corregido bug del icono lápiz. Ahora permite editar precios de artículos en tiempo real con recálculo automático del total
- **v3.1.0** (2026-01-29): Corrección de sincronización de caja, impresión automática de arqueos, botón reimprimir en histórico
- **v3.0.0** (2026-01-29): Panel de Control de Devoluciones, nuevos campos en inventario
- **v2.9.0**: Importador de inventario
- **v2.8.0**: Importador de clientes, Email opcional
