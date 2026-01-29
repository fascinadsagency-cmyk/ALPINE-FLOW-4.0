# AlpineFlow - Sistema de Gestión de Alquiler de Equipos de Esquí

## Problema Original
Sistema de gestión completo para tiendas de alquiler de equipos de esquí/snowboard con énfasis en VELOCIDAD y PRECISIÓN.

## Stack Tecnológico
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + Python
- **Base de datos**: MongoDB
- **Autenticación**: JWT

## Funcionalidades Implementadas

### 1. Modificar Duración de Alquileres (CORREGIDO 2026-01-29)
**Flujo de 3 pasos obligatorio:**
- Paso 1: Seleccionar días (0 = devolución total mismo día)
- Paso 2: Confirmar pago/devolución con método (Efectivo/Tarjeta)
- Paso 3: Imprimir Comprobante

**Correcciones implementadas:**
- ✅ **Lógica de Reembolso**: Sistema reconoce automáticamente cuando el ajuste es negativo y lo trata como "Devolución"
- ✅ **Salida de Caja habilitada**: El selector acepta valores negativos y resta del efectivo/tarjeta
- ✅ **Ticket de Abono**: Genera comprobante de devolución con importe devuelto
- ✅ **Ajuste de Stock**: Items se liberan al inventario con 0 días
- ✅ **Concepto en Caja**: "Devolución ajuste Alquiler ID: XXX (De X a Y días)"

### 2. Sistema de Caja
- Impresión de tickets desde cada movimiento
- Historial de cierres con reversión
- Vinculación automática con Alquileres y Taller
- Tarjeta separada para Devoluciones (naranja)

### 3. Dashboard, Clientes, Inventario, Tarifas
- Todas las funcionalidades base operativas

## Próximas Tareas (Backlog)

### P1 - Alta Prioridad
- [ ] Acceso directo a ficha de cliente desde lista de alquileres
- [ ] Pestaña de Soporte y Mejoras

### P2 - Media Prioridad
- [ ] Integración WhatsApp
- [ ] Integración TPV bancario
- [ ] Integración VeriFactu

## Credenciales de Prueba
- Usuario: test_combo
- Contraseña: test123456

## Última Actualización
Fecha: 2026-01-29
Versión: 2.0.1

## Changelog
- **v2.0.1** (2026-01-29): Corrección crítica flujo de reembolsos
  - Corregido KeyError en items sin campo 'id'
  - Habilitada salida de caja para devoluciones
  - Ticket de abono funcional
  - Concepto diferenciado: "Devolución ajuste" vs "Ampliación"
- **v2.0.0** (2026-01-28): Modificar Duración como Transacción Financiera
- **v1.9.0** (2026-01-28): Sistema de Tickets y Gestión de Cierres
