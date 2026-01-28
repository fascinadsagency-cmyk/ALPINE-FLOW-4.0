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

### 7. Caja
- ✅ Impresión de tickets desde cada movimiento
- ✅ Historial de cierres con reversión
- Vinculación automática con Alquileres y Taller

### 8. Modificación de Alquileres (ACTUALIZADO 2026-01-28)
- ✅ **Flujo de 3 pasos obligatorio:**
  - Paso 1: Seleccionar días (0 = devolución mismo día)
  - Paso 2: Confirmar pago/devolución con método (Efectivo/Tarjeta)
  - Paso 3: Imprimir Comprobante de Modificación
- ✅ **Transacción financiera instantánea:** No se puede guardar sin registrar el pago
- ✅ **Registro automático en Caja:** Concepto "Ajuste días Alquiler ID: XXX (De X días a Y días)"
- ✅ **Ticket de modificación:** Factura Rectificativa con fechas antiguas/nuevas e importe

### 9. Configuración
- Toggle de Impresión Automática

### 10. Tarifas y Mantenimiento/Taller
- Sistema de Packs/Combos
- Modo "MI FLOTA" y "TALLER EXTERNO"

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

## Credenciales de Prueba
- Usuario: test_combo
- Contraseña: test123456

## Última Actualización
Fecha: 2026-01-28
Versión: 2.0.0

## Changelog
- **v2.0.0** (2026-01-28): Modificar Duración como Transacción Financiera Completa
  - Flujo de 3 pasos obligatorio (días → pago → ticket)
  - Soporte para 0 días (devolución total)
  - Selector de método de pago obligatorio
  - Registro automático en Movimientos de Caja
  - Ticket de Factura Rectificativa
- **v1.9.0** (2026-01-28): Sistema de Tickets y Gestión de Cierres
- **v1.8.0**: Dashboard Analítico Completo
