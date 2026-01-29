# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn UI + XLSX + @dnd-kit
- **Backend**: FastAPI + Python
- **Base de datos**: MongoDB
- **Autenticación**: JWT

## Funcionalidades Implementadas

### 1. Módulo de Gestión de Caja - Desglose Profesional ✨ COMPLETADO
**Funcionalidad 100% operativa con desglose detallado:**

- **Diálogo de Cierre Mejorado**: 
  * Resumen Global del Día (Ventas, Salidas, Devoluciones)
  * Desglose Detallado por Método de Pago con dos tarjetas profesionales:
    - 💵 **EFECTIVO** (fondo azul): + Ventas, - Salidas, - Devoluciones → Esperado
    - 💳 **TARJETA** (fondo morado): + Ventas, - Salidas, - Devoluciones → Esperado
  * Cálculo de Descuadre Dinámico con feedback visual (verde/amarillo/rojo)
  * Mensajes contextuales ("¡Cuadra perfectamente!", "Hay más dinero", "Falta dinero")

- **Ticket de Arqueo Profesional (formato térmico 80mm)**:
  * Encabezado con fecha, hora y empleado
  * Nº de operaciones
  * RESUMEN GLOBAL DEL DÍA: Entradas, Salidas, Devoluciones
  * **DESGLOSE POR MÉTODO DE PAGO** (nuevo):
    - Sección **💵 EFECTIVO**: + Ventas, - Salidas, - Devoluciones, Esperado, Contado, Descuadre
    - Sección **💳 TARJETA**: + Ventas, - Salidas, - Devoluciones, Esperado, Datáfono, Descuadre
  * DESCUADRE TOTAL en recuadro destacado (verde/amarillo/rojo según cantidad)
  * Notas del cierre
  * Footer: "Documento de arqueo - Conservar con la recaudación"

- **Backend Mejorado**:
  * Endpoint `/api/cash/summary` devuelve `by_payment_method` con estructura completa
  * Endpoint `/api/cash/close` guarda el desglose detallado para reimprimir
  * Modelo `CashClosingResponse` actualizado con campos: `total_refunds`, `movements_count`, `by_payment_method`

- **Funcionalidades Adicionales**:
  * Impresión automática al cerrar caja
  * Reimprimir cierres históricos con desglose completo
  * Retrocompatibilidad con cierres antiguos (sin errores)
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
- **v3.1.0** (2026-01-29): Corrección de sincronización de caja, impresión automática de arqueos, botón reimprimir en histórico
- **v3.0.0** (2026-01-29): Panel de Control de Devoluciones, nuevos campos en inventario
- **v2.9.0**: Importador de inventario
- **v2.8.0**: Importador de clientes, Email opcional
